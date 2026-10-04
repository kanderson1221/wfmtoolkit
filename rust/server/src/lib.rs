mod batch;
mod calculator;
mod error;
mod input;
mod planner;
mod uploads;

use axum::{
    extract::{rejection::JsonRejection, DefaultBodyLimit, Path, Request, State},
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use error::ApiError;
use futures_util::StreamExt;
use percent_encoding::{percent_decode_str, utf8_percent_encode, NON_ALPHANUMERIC};
use serde_json::{json, Value};
use std::{path::PathBuf, sync::Arc, time::Duration};
use tokio::{
    io::AsyncWriteExt,
    sync::{OwnedSemaphorePermit, Semaphore},
};
use tower::ServiceExt;
use tower_http::{services::ServeFile, trace::TraceLayer};

#[derive(Clone, Debug)]
pub struct Config {
    pub listen: String,
    pub dist: PathBuf,
    pub downloads: PathBuf,
    pub site_url: String,
    pub forecast_url: String,
    pub compute_jobs: usize,
    pub max_upload_rows: usize,
}

impl Config {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        let mut config = Self {
            listen: format!(
                "{}:{}",
                std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into()),
                std::env::var("PORT").unwrap_or_else(|_| "10000".into())
            ),
            ..Self::default()
        };
        if let Ok(value) = std::env::var("WFM_DIST_DIR") {
            config.dist = value.into();
        }
        if let Ok(value) = std::env::var("WFM_DOWNLOAD_DIR") {
            config.downloads = value.into();
        }
        if let Ok(value) = std::env::var("WFMTOOLKIT_SITE_URL") {
            config.site_url = value.trim_end_matches('/').into();
        }
        if let Ok(value) = std::env::var("WFM_FORECAST_URL") {
            config.forecast_url = value.trim_end_matches('/').into();
        }
        if let Ok(value) = std::env::var("WFM_COMPUTE_JOBS") {
            config.compute_jobs = value.parse()?;
        }
        if let Ok(value) = std::env::var("WFM_MAX_UPLOAD_ROWS") {
            config.max_upload_rows = value.parse()?;
        }
        config.validate()?;
        Ok(config)
    }

    fn validate(&self) -> Result<(), ApiError> {
        if self.compute_jobs == 0 || self.compute_jobs > 64 || self.max_upload_rows == 0 {
            return Err(ApiError::invalid(
                "WFM_COMPUTE_JOBS must be 1..64 and WFM_MAX_UPLOAD_ROWS must be positive",
            ));
        }
        for url in [&self.forecast_url, &self.site_url] {
            let url = reqwest::Url::parse(url)
                .map_err(|_| ApiError::invalid("Invalid configured URL"))?;
            if !matches!(url.scheme(), "http" | "https") || url.host().is_none() {
                return Err(ApiError::invalid("Configured URL must use HTTP or HTTPS"));
            }
        }
        Ok(())
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            listen: "0.0.0.0:10000".into(),
            dist: "dist".into(),
            downloads: std::env::temp_dir().join("wfmtoolkit_file_processor"),
            site_url: "https://www.wfmtoolkit.com".into(),
            forecast_url: "http://127.0.0.1:8001".into(),
            compute_jobs: 1,
            max_upload_rows: uploads::MAX_UPLOAD_ROWS,
        }
    }
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.1)
    }
}
impl std::error::Error for ApiError {}

#[derive(Clone)]
struct AppState {
    config: Arc<Config>,
    jobs: Arc<Semaphore>,
    forecasts: Arc<Semaphore>,
    admissions: Arc<Semaphore>,
    forecast_admissions: Arc<Semaphore>,
    client: reqwest::Client,
}

pub fn app(config: Config) -> Result<Router, ApiError> {
    config.validate()?;
    std::fs::create_dir_all(&config.downloads)?;
    let client = reqwest::Client::builder()
        .no_proxy()
        .timeout(Duration::from_secs(600))
        .connect_timeout(Duration::from_secs(5))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| ApiError::unavailable("Unable to initialize forecasting client"))?;
    let state = AppState {
        jobs: Arc::new(Semaphore::new(config.compute_jobs)),
        forecasts: Arc::new(Semaphore::new(1)),
        admissions: Arc::new(Semaphore::new(config.compute_jobs)),
        forecast_admissions: Arc::new(Semaphore::new(1)),
        config: Arc::new(config),
        client,
    };
    Ok(Router::new()
        .route(
            "/api/health",
            get(|| async { Json(json!({"status": "ok"})) }),
        )
        .route("/api/erlang-c/calculate", post(calculate))
        .route("/api/erlang-c/mock-results", post(calculate))
        .route("/api/erlang-c/batch-calculate", post(batch_calculate))
        .route("/api/erlang-c/batch/file-processor", post(file_calculate))
        .route("/api/erlang-c/batch/file-processor/upload", post(upload))
        .route(
            "/api/erlang-c/batch/file-processor/download/{id}",
            get(download),
        )
        .route("/api/planner/intraday-erlang/calculate", post(plan))
        .route("/api/forecasting/daily-volume/run", post(forecast))
        .route("/robots.txt", get(robots))
        .route("/sitemap.xml", get(sitemap))
        .fallback(frontend)
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            admission,
        ))
        .layer(DefaultBodyLimit::max(uploads::MAX_UPLOAD_BYTES))
        .layer(TraceLayer::new_for_http())
        .with_state(state))
}

// Bound input parsing as well as computation. Otherwise many simultaneous JSON
// requests could each allocate a full dataset before reaching the job semaphore.
async fn admission(
    State(state): State<AppState>,
    request: Request,
    next: axum::middleware::Next,
) -> Response {
    let path = request.uri().path();
    let gates = if path == "/api/forecasting/daily-volume/run" {
        Some((&state.forecast_admissions, &state.forecasts))
    } else if request.method() == axum::http::Method::POST
        && (path.starts_with("/api/erlang-c/") || path == "/api/planner/intraday-erlang/calculate")
    {
        Some((&state.admissions, &state.jobs))
    } else {
        None
    };
    let _admission = match gates {
        Some((admissions, jobs)) => {
            if jobs.available_permits() == 0 {
                return ApiError::unavailable(
                    "Calculation capacity is busy. Please retry shortly.",
                )
                .into_response();
            }
            match permit(admissions) {
                Ok(permit) => Some(permit),
                Err(error) => return error.into_response(),
            }
        }
        None => None,
    };
    next.run(request).await
}

fn payload(value: Result<Json<Value>, JsonRejection>) -> Result<Value, ApiError> {
    value.map(|Json(value)| value).map_err(|error| {
        ApiError(
            if error.status() == StatusCode::PAYLOAD_TOO_LARGE {
                StatusCode::PAYLOAD_TOO_LARGE
            } else {
                StatusCode::UNPROCESSABLE_ENTITY
            },
            error.body_text(),
        )
    })
}

fn permit(jobs: &Arc<Semaphore>) -> Result<OwnedSemaphorePermit, ApiError> {
    jobs.clone()
        .try_acquire_owned()
        .map_err(|_| ApiError::unavailable("Calculation capacity is busy. Please retry shortly."))
}

async fn compute<T: Send + 'static>(
    state: &AppState,
    operation: impl FnOnce() -> Result<T, ApiError> + Send + 'static,
) -> Result<T, ApiError> {
    let permit = permit(&state.jobs)?;
    tokio::task::spawn_blocking(move || {
        let _permit = permit;
        operation()
    })
    .await
    .map_err(|error| {
        tracing::error!(%error, "calculation worker failed");
        ApiError::unavailable("Calculation failed")
    })?
}

async fn calculate(
    State(state): State<AppState>,
    body: Result<Json<Value>, JsonRejection>,
) -> Result<Response, ApiError> {
    let payload = payload(body)?;
    compute_json(&state, move || calculator::calculate(payload)).await
}
async fn batch_calculate(
    State(state): State<AppState>,
    body: Result<Json<Value>, JsonRejection>,
) -> Result<Response, ApiError> {
    let payload = payload(body)?;
    compute_json(&state, move || batch::calculate(payload, false)).await
}
async fn file_calculate(
    State(state): State<AppState>,
    body: Result<Json<Value>, JsonRejection>,
) -> Result<Response, ApiError> {
    let payload = payload(body)?;
    compute_json(&state, move || batch::calculate(payload, true)).await
}
async fn plan(
    State(state): State<AppState>,
    body: Result<Json<Value>, JsonRejection>,
) -> Result<Response, ApiError> {
    let payload = payload(body)?;
    compute_json(&state, move || planner::calculate(payload)).await
}

async fn compute_json(
    state: &AppState,
    operation: impl FnOnce() -> Result<Value, ApiError> + Send + 'static,
) -> Result<Response, ApiError> {
    // Large response serialization belongs to the calculation worker too.
    compute(state, move || Ok(Json(operation()?).into_response())).await
}

async fn upload(State(state): State<AppState>, request: Request) -> Result<Json<Value>, ApiError> {
    let _permit = permit(&state.jobs)?;
    let filename = request
        .headers()
        .get("x-upload-filename")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("file_processor.csv");
    let filename = percent_decode_str(filename)
        .decode_utf8_lossy()
        .trim()
        .to_owned();
    let filename = if filename.is_empty() {
        "file_processor.csv".into()
    } else {
        filename
    };
    if !filename.to_ascii_lowercase().ends_with(".csv") {
        return Err(ApiError::invalid(
            "Upload a CSV file before running this workflow.",
        ));
    }
    if request
        .headers()
        .get(header::CONTENT_LENGTH)
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.parse::<u64>().ok())
        .is_some_and(|size| size > uploads::MAX_UPLOAD_BYTES as u64)
    {
        return Err(ApiError(
            StatusCode::PAYLOAD_TOO_LARGE,
            "CSV exceeds the 50 MB upload limit.".into(),
        ));
    }
    let temporary = tempfile::NamedTempFile::new_in(&state.config.downloads)?;
    let mut file = tokio::fs::File::from_std(temporary.reopen()?);
    let mut body = request.into_body().into_data_stream();
    let mut length = 0;
    while let Some(chunk) = body.next().await {
        let chunk = chunk.map_err(|_| ApiError::invalid("Unable to read CSV upload."))?;
        length += chunk.len();
        if length > uploads::MAX_UPLOAD_BYTES {
            return Err(ApiError(
                StatusCode::PAYLOAD_TOO_LARGE,
                "CSV exceeds the 50 MB upload limit.".into(),
            ));
        }
        file.write_all(&chunk).await?;
    }
    file.flush().await?;
    drop(file);
    let directory = state.config.downloads.clone();
    let max_rows = state.config.max_upload_rows;
    // The permit moves into the worker so a disconnected client cannot free capacity early.
    let result = tokio::task::spawn_blocking(move || {
        let _permit = _permit;
        uploads::process(temporary, filename, directory, max_rows)
    })
    .await
    .map_err(|_| ApiError::unavailable("File calculation failed"))??;
    Ok(Json(result))
}

async fn download(
    State(state): State<AppState>,
    Path(id): Path<String>,
    request: Request,
) -> Result<Response, ApiError> {
    let directory = state.config.downloads.clone();
    let (path, artifact) = tokio::task::spawn_blocking(move || uploads::artifact(&directory, &id))
        .await
        .map_err(|_| ApiError::unavailable("Unable to retrieve download"))??;
    let mut response = ServeFile::new(path)
        .oneshot(request)
        .await
        .unwrap_or_else(|error| match error {});
    let disposition = format!(
        "attachment; filename*=UTF-8''{}",
        utf8_percent_encode(&artifact.file_name, NON_ALPHANUMERIC)
    );
    response.headers_mut().insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_str(&disposition)
            .map_err(|_| ApiError::invalid("Invalid download filename"))?,
    );
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/csv; charset=utf-8"),
    );
    Ok(response.into_response())
}

async fn forecast(
    State(state): State<AppState>,
    body: Result<Json<Value>, JsonRejection>,
) -> Result<Response, ApiError> {
    let body = payload(body)?;
    let _permit = permit(&state.forecasts)?;
    let upstream = state
        .client
        .post(format!(
            "{}/api/forecasting/daily-volume/run",
            state.config.forecast_url
        ))
        .json(&body)
        .send()
        .await
        .map_err(|error| {
            tracing::warn!(%error, "forecasting worker unavailable");
            ApiError::unavailable("Forecasting service is unavailable. Please retry shortly.")
        })?;
    let status = upstream.status();
    let mut stream = upstream.bytes_stream();
    let mut bytes = Vec::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|_| ApiError::unavailable("Unable to read forecast results"))?;
        if bytes.len() + chunk.len() > uploads::MAX_UPLOAD_BYTES {
            return Err(ApiError::unavailable(
                "Forecast response exceeds the supported size",
            ));
        }
        bytes.extend_from_slice(&chunk);
    }
    Ok((status, [(header::CONTENT_TYPE, "application/json")], bytes).into_response())
}

async fn robots(State(state): State<AppState>) -> Response {
    (
        [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
        format!(
            "User-agent: *\nAllow: /\n\nSitemap: {}/sitemap.xml\n",
            state.config.site_url
        ),
    )
        .into_response()
}

fn xml(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

async fn sitemap(State(state): State<AppState>) -> Response {
    let mut entries = String::new();
    for path in ["/", "/terms/"] {
        let relative = if path == "/" {
            "index.html".into()
        } else {
            format!("{}/index.html", path.trim_matches('/'))
        };
        let modified = tokio::fs::metadata(state.config.dist.join(relative))
            .await
            .ok()
            .and_then(|m| m.modified().ok());
        let last_modified = modified
            .map(|time| {
                format!(
                    "<lastmod>{}</lastmod>",
                    chrono::DateTime::<chrono::Utc>::from(time).date_naive()
                )
            })
            .unwrap_or_default();
        entries.push_str(&format!(
            "<url><loc>{}</loc>{last_modified}</url>",
            xml(&format!("{}{path}", state.config.site_url))
        ));
    }
    ([(header::CONTENT_TYPE, "application/xml")], format!("<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">{entries}</urlset>")).into_response()
}

async fn frontend(State(state): State<AppState>, request: Request) -> Result<Response, ApiError> {
    let path = percent_decode_str(request.uri().path())
        .decode_utf8()
        .map_err(|_| ApiError(StatusCode::NOT_FOUND, "Not Found".into()))?;
    if path == "/api" || path.starts_with("/api/") {
        return Err(ApiError(StatusCode::NOT_FOUND, "Not Found".into()));
    }
    if !matches!(
        *request.method(),
        axum::http::Method::GET | axum::http::Method::HEAD
    ) {
        return Err(ApiError(
            StatusCode::METHOD_NOT_ALLOWED,
            "Method Not Allowed".into(),
        ));
    }
    let root = tokio::fs::canonicalize(&state.config.dist)
        .await
        .map_err(|_| ApiError(StatusCode::NOT_FOUND, "Frontend build not found".into()))?;
    let index = root.join("index.html");
    if !index.is_file() {
        return Err(ApiError(
            StatusCode::NOT_FOUND,
            "Frontend build not found".into(),
        ));
    }
    let candidate = tokio::fs::canonicalize(root.join(path.trim_start_matches('/')))
        .await
        .ok()
        .filter(|p| p.starts_with(&root));
    let file = match candidate {
        Some(path) if path.is_file() => path,
        Some(path) if path.is_dir() => {
            let directory_index = tokio::fs::canonicalize(path.join("index.html"))
                .await
                .ok()
                .filter(|p| p.starts_with(&root) && p.is_file());
            directory_index.unwrap_or(index)
        }
        _ => index,
    };
    Ok(ServeFile::new(file)
        .oneshot(request)
        .await
        .unwrap_or_else(|error| match error {})
        .into_response())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn cancelled_client_does_not_release_a_running_job() {
        let state = AppState {
            config: Arc::new(Config::default()),
            jobs: Arc::new(Semaphore::new(1)),
            forecasts: Arc::new(Semaphore::new(1)),
            admissions: Arc::new(Semaphore::new(1)),
            forecast_admissions: Arc::new(Semaphore::new(1)),
            client: reqwest::Client::new(),
        };
        let (started, waiting) = tokio::sync::oneshot::channel();
        let (release, released) = std::sync::mpsc::channel();
        let worker_state = state.clone();
        let request = tokio::spawn(async move {
            compute(&worker_state, move || {
                started.send(()).unwrap();
                released.recv().unwrap();
                Ok(())
            })
            .await
        });
        waiting.await.unwrap();
        request.abort();
        let _ = request.await;
        assert_eq!(state.jobs.available_permits(), 0);
        assert_eq!(
            compute(&state, || Ok(())).await.unwrap_err().0,
            StatusCode::SERVICE_UNAVAILABLE
        );
        release.send(()).unwrap();
        let permit = state.jobs.clone().acquire_owned().await.unwrap();
        drop(permit);
        assert!(compute(&state, || Ok(())).await.is_ok());
    }
}
