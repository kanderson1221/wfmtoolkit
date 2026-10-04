use axum::{
    body::{to_bytes, Body},
    http::{header, Request, StatusCode},
    Router,
};
use serde_json::{json, Value};
use std::path::Path;
use tempfile::TempDir;
use tower::ServiceExt;
use wfm_server::{app, Config};

fn setup() -> (Router, TempDir) {
    let directory = TempDir::new().unwrap();
    let dist = directory.path().join("dist");
    std::fs::create_dir_all(dist.join("planning-workspace")).unwrap();
    std::fs::write(dist.join("index.html"), "<html>spa</html>").unwrap();
    std::fs::write(
        dist.join("planning-workspace/index.html"),
        "<html>planning</html>",
    )
    .unwrap();
    std::fs::write(dist.join("asset.js"), "export default 1").unwrap();
    let router = app(Config {
        dist,
        downloads: directory.path().join("downloads"),
        compute_jobs: 1,
        site_url: "https://example.com".into(),
        ..Config::default()
    })
    .unwrap();
    (router, directory)
}

async fn json_request(router: &Router, path: &str, payload: Value) -> (StatusCode, Value) {
    let response = router
        .clone()
        .oneshot(
            Request::post(path)
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(payload.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let bytes = to_bytes(response.into_body(), 10_000_000).await.unwrap();
    (status, serde_json::from_slice(&bytes).unwrap())
}

fn assert_close(actual: &Value, expected: &Value, path: &str) {
    match (actual, expected) {
        (Value::Object(a), Value::Object(e)) => {
            assert_eq!(a.len(), e.len(), "{path}: object fields");
            for (key, value) in e {
                assert_close(
                    a.get(key).unwrap_or_else(|| panic!("{path}.{key} missing")),
                    value,
                    &format!("{path}.{key}"),
                );
            }
        }
        (Value::Array(a), Value::Array(e)) => {
            assert_eq!(a.len(), e.len(), "{path}: array length");
            for (index, (a, e)) in a.iter().zip(e).enumerate() {
                assert_close(a, e, &format!("{path}[{index}]"));
            }
        }
        (Value::Number(a), Value::Number(e)) => {
            let a = a.as_f64().unwrap();
            let e = e.as_f64().unwrap();
            assert!(
                (a - e).abs() <= 1e-12 * e.abs().max(1.0),
                "{path}: {a} != {e}"
            );
        }
        _ => assert_eq!(actual, expected, "{path}"),
    }
}

#[tokio::test]
async fn api_contract_fixtures() {
    let (router, _directory) = setup();
    let fixtures: Value =
        serde_json::from_str(include_str!("fixtures/python_contract.json")).unwrap();
    for case in fixtures.as_array().unwrap() {
        let path = case["path"].as_str().unwrap();
        let (status, result) = json_request(&router, path, case["request"].clone()).await;
        assert_eq!(status, StatusCode::OK, "{}: {result}", case["name"]);
        assert_close(&result, &case["response"], case["name"].as_str().unwrap());
    }
}

#[tokio::test]
async fn invalid_inputs_and_all_or_nothing_batches() {
    let (router, _directory) = setup();
    for path in [
        "/api/erlang-c/calculate",
        "/api/planner/intraday-erlang/calculate",
        "/api/erlang-c/batch-calculate",
    ] {
        assert_eq!(
            json_request(&router, path, json!({"rows": []})).await.0,
            StatusCode::UNPROCESSABLE_ENTITY
        );
    }
    let row = batch_row();
    let mut bad = row.clone();
    bad["aht_seconds"] = json!(0);
    let (status, result) = json_request(
        &router,
        "/api/erlang-c/batch-calculate",
        json!({"rows": [row, bad]}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(result["summary"]["failedRows"], 2);
    assert_eq!(result["summary"]["successfulRows"], 0);
    assert_eq!(result["results"], json!([]));
    assert_eq!(result["errors"][0]["rowIndex"], 0);
    assert_eq!(result["errors"][1]["rowIndex"], 2);
    let response = router
        .clone()
        .oneshot(
            Request::post("/api/erlang-c/calculate")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from("{invalid"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    for value in ["NaN", "Infinity", "-Infinity"] {
        let mut row = batch_row();
        row["calls_offered"] = json!(value);
        let (_, result) = json_request(
            &router,
            "/api/erlang-c/batch-calculate",
            json!({"rows": [row]}),
        )
        .await;
        assert_eq!(result["summary"]["successfulRows"], 0);
    }
}

fn batch_row() -> Value {
    json!({"queue_id": "sales", "interval_start": "2026-03-08T09:00:00Z", "calls_offered": 180,
        "aht_seconds": 240, "mean_patience_seconds": 180, "service_level_threshold": 80,
        "service_level_target_seconds": 20, "max_occupancy": 85, "shrinkage": 30})
}

fn csv(rows: &[Value]) -> String {
    let headers = [
        "queue_id",
        "interval_start",
        "calls_offered",
        "aht_seconds",
        "mean_patience_seconds",
        "service_level_threshold",
        "service_level_target_seconds",
        "max_occupancy",
        "shrinkage",
    ];
    let mut writer = csv::Writer::from_writer(Vec::new());
    writer.write_record(headers).unwrap();
    for row in rows {
        writer
            .write_record(headers.iter().map(|h| match &row[h] {
                Value::String(s) => s.clone(),
                Value::Null => String::new(),
                v => v.to_string(),
            }))
            .unwrap();
    }
    String::from_utf8(writer.into_inner().unwrap()).unwrap()
}

async fn upload(router: &Router, text: String) -> (StatusCode, Value) {
    let response = router
        .clone()
        .oneshot(
            Request::post("/api/erlang-c/batch/file-processor/upload")
                .header("x-upload-filename", "sales%20report.csv")
                .body(Body::from(text))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    (
        status,
        serde_json::from_slice(&to_bytes(response.into_body(), 1_000_000).await.unwrap()).unwrap(),
    )
}

#[tokio::test]
async fn csv_downloads_summary_expiration_and_headers() {
    let (router, directory) = setup();
    let rows = vec![batch_row(), batch_row()];
    let (status, uploaded) = upload(&router, format!("\u{feff}{}", csv(&rows))).await;
    assert_eq!(status, StatusCode::OK, "{uploaded}");
    let (_, batch) = json_request(
        &router,
        "/api/erlang-c/batch-calculate",
        json!({"rows": rows}),
    )
    .await;
    assert_close(&uploaded["summary"], &batch["summary"], "summary");
    let info = &uploaded["downloads"]["enrichedFile"];
    assert_eq!(info["fileName"], "sales report_enriched.csv");
    let url = info["downloadUrl"].as_str().unwrap();
    let response = router
        .clone()
        .oneshot(Request::get(url).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.headers()[header::CONTENT_DISPOSITION]
        .to_str()
        .unwrap()
        .contains("sales%20report"));
    let bytes = to_bytes(response.into_body(), 1_000_000).await.unwrap();
    let text = String::from_utf8(bytes.to_vec()).unwrap();
    assert!(text.contains("Required Agents"));
    assert!(text.contains("sales"));
    let response = router
        .clone()
        .oneshot(Request::head(url).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert!(to_bytes(response.into_body(), 1_000_000)
        .await
        .unwrap()
        .is_empty());
    let response = router
        .clone()
        .oneshot(
            Request::get(url)
                .header(header::RANGE, "bytes=0-8")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::PARTIAL_CONTENT);
    let meta_path = directory
        .path()
        .join("downloads")
        .join(format!("{}.json", info["fileId"].as_str().unwrap()));
    let mut meta: Value = serde_json::from_slice(&std::fs::read(&meta_path).unwrap()).unwrap();
    meta["expiresAt"] = json!("2000-01-01T00:00:00Z");
    std::fs::write(&meta_path, meta.to_string()).unwrap();
    let response = router
        .clone()
        .oneshot(Request::get(url).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    assert!(!meta_path.exists());
}

#[tokio::test]
async fn csv_errors_preview_and_cleanup() {
    let (router, directory) = setup();
    let mut bad = batch_row();
    bad["aht_seconds"] = json!(0);
    let mut rows = vec![batch_row()];
    rows.extend(vec![bad; 110]);
    let (status, result) = upload(&router, csv(&rows)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(result["successfulRows"], 1);
    assert_eq!(result["failedRows"], 110);
    assert_eq!(result["errorsPreview"].as_array().unwrap().len(), 100);
    assert!(result["downloads"].get("enrichedFile").is_none());
    let url = result["downloads"]["errorReport"]["downloadUrl"]
        .as_str()
        .unwrap();
    let response = router
        .clone()
        .oneshot(Request::get(url).body(Body::empty()).unwrap())
        .await
        .unwrap();
    let text = String::from_utf8(
        to_bytes(response.into_body(), 1_000_000)
            .await
            .unwrap()
            .to_vec(),
    )
    .unwrap();
    assert_eq!(text.lines().count(), 111);
    assert!(text.starts_with("row_index,message,"));
    assert_eq!(
        std::fs::read_dir(directory.path().join("downloads"))
            .unwrap()
            .count(),
        2
    );
    assert_eq!(
        upload(&router, "queue_id\nsales\n".into()).await.0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    assert_eq!(
        std::fs::read_dir(directory.path().join("downloads"))
            .unwrap()
            .count(),
        2
    );
}

#[tokio::test]
async fn upload_limits_and_empty_files() {
    let (router, directory) = setup();
    let limited = app(Config {
        downloads: directory.path().join("limited"),
        max_upload_rows: 1,
        ..Config::default()
    })
    .unwrap();
    assert_eq!(
        upload(&limited, csv(&[batch_row(), batch_row()])).await.0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    assert_eq!(
        std::fs::read_dir(directory.path().join("limited"))
            .unwrap()
            .count(),
        0
    );
    assert_eq!(
        upload(&router, csv(&[])).await.0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    let response = router
        .oneshot(
            Request::post("/api/erlang-c/batch/file-processor/upload")
                .header("x-upload-filename", "large.csv")
                .header(header::CONTENT_LENGTH, "52428801")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
}

#[tokio::test]
async fn frontend_seo_unknown_api_and_path_traversal() {
    let (router, directory) = setup();
    for (path, expected) in [
        ("/", "<html>spa</html>"),
        ("/planning-workspace", "<html>planning</html>"),
        ("/other-route", "<html>spa</html>"),
        ("/asset.js", "export default 1"),
    ] {
        let response = router
            .clone()
            .oneshot(Request::get(path).body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            to_bytes(response.into_body(), 10_000)
                .await
                .unwrap()
                .as_ref(),
            expected.as_bytes()
        );
    }
    std::fs::write(directory.path().join("secret"), "not public").unwrap();
    let response = router
        .clone()
        .oneshot(Request::get("/%2e%2e/secret").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert!(!String::from_utf8(
        to_bytes(response.into_body(), 10_000)
            .await
            .unwrap()
            .to_vec()
    )
    .unwrap()
    .contains("not public"));
    for path in [
        "/api/missing",
        "/api",
        "/api/erlang-c/batch/file-processor/download/not-an-id",
    ] {
        assert_eq!(
            router
                .clone()
                .oneshot(Request::get(path).body(Body::empty()).unwrap())
                .await
                .unwrap()
                .status(),
            StatusCode::NOT_FOUND
        );
    }
    let response = router
        .clone()
        .oneshot(Request::get("/robots.txt").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert!(String::from_utf8(
        to_bytes(response.into_body(), 10_000)
            .await
            .unwrap()
            .to_vec()
    )
    .unwrap()
    .contains("https://example.com/sitemap.xml"));
    let response = router
        .oneshot(Request::get("/sitemap.xml").body(Body::empty()).unwrap())
        .await
        .unwrap();
    let xml = String::from_utf8(
        to_bytes(response.into_body(), 10_000)
            .await
            .unwrap()
            .to_vec(),
    )
    .unwrap();
    assert!(xml.contains("<loc>https://example.com/planning-workspace/</loc>"));
    for path in ["/", "/erlang-tools/", "/terms/"] {
        assert!(xml.contains(&format!("<loc>https://example.com{path}</loc>")));
    }
    assert!(xml.contains("<lastmod>"));
}

#[tokio::test]
async fn forecasting_proxy_preserves_status_and_json() {
    let worker = Router::new().route(
        "/api/forecasting/daily-volume/run",
        axum::routing::post(|axum::Json(value): axum::Json<Value>| async move {
            (
                StatusCode::UNPROCESSABLE_ENTITY,
                axum::Json(json!({"detail": value["test"]})),
            )
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let task = tokio::spawn(async move {
        axum::serve(listener, worker).await.unwrap();
    });
    let directory = TempDir::new().unwrap();
    let router = app(Config {
        downloads: directory.path().into(),
        forecast_url: format!("http://{address}"),
        ..Config::default()
    })
    .unwrap();
    let (status, response) = json_request(
        &router,
        "/api/forecasting/daily-volume/run",
        json!({"test": "validation message"}),
    )
    .await;
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(response, json!({"detail": "validation message"}));
    task.abort();
    let (status, _) = json_request(&router, "/api/forecasting/daily-volume/run", json!({})).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
}

#[test]
fn invalid_server_configuration_is_rejected() {
    let directory = TempDir::new().unwrap();
    assert!(app(Config {
        compute_jobs: 0,
        downloads: Path::new(directory.path()).into(),
        ..Config::default()
    })
    .is_err());
}

#[tokio::test]
async fn admission_bounds_parsing_and_keeps_health_available() {
    let (router, _directory) = setup();
    let fixtures: Value =
        serde_json::from_str(include_str!("fixtures/python_contract.json")).unwrap();
    let request = fixtures[0]["request"].to_string();
    let (started, waiting) = tokio::sync::oneshot::channel();
    let (release, released) = tokio::sync::oneshot::channel();
    let body = Body::from_stream(futures_util::stream::once(async move {
        started.send(()).unwrap();
        released.await.unwrap();
        Ok::<_, std::io::Error>(axum::body::Bytes::from(request))
    }));
    let pending = tokio::spawn(
        router.clone().oneshot(
            Request::post("/api/erlang-c/calculate")
                .header(header::CONTENT_TYPE, "application/json")
                .body(body)
                .unwrap(),
        ),
    );
    waiting.await.unwrap();
    assert_eq!(
        json_request(
            &router,
            "/api/erlang-c/calculate",
            fixtures[0]["request"].clone()
        )
        .await
        .0,
        StatusCode::SERVICE_UNAVAILABLE
    );
    let health = router
        .clone()
        .oneshot(Request::get("/api/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(health.status(), StatusCode::OK);
    release.send(()).unwrap();
    assert_eq!(pending.await.unwrap().unwrap().status(), StatusCode::OK);
    assert_eq!(
        json_request(
            &router,
            "/api/erlang-c/calculate",
            fixtures[0]["request"].clone()
        )
        .await
        .0,
        StatusCode::OK
    );
}

#[tokio::test]
async fn planner_rejects_inconsistent_fractional_and_negative_floors() {
    let (router, _directory) = setup();
    let fixtures: Value =
        serde_json::from_str(include_str!("fixtures/python_contract.json")).unwrap();
    let floor_case = fixtures
        .as_array()
        .unwrap()
        .iter()
        .find(|v| v["name"] == "planner_floor")
        .unwrap();
    for floor in [json!(-1), json!(1.5), json!(100001)] {
        let mut request = floor_case["request"].clone();
        request["rows"][0]["minimumHeadcount"] = floor;
        assert_eq!(
            json_request(&router, "/api/planner/intraday-erlang/calculate", request)
                .await
                .0,
            StatusCode::UNPROCESSABLE_ENTITY
        );
    }
    let mut row = floor_case["request"]["rows"][0].clone();
    row["minimumHeadcount"] = json!(2);
    let (status, result) = json_request(
        &router,
        "/api/planner/intraday-erlang/calculate",
        json!({"rows": [row, floor_case["request"]["rows"][0]]}),
    )
    .await;
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    assert!(result["detail"].as_str().unwrap().contains("consistent"));
}

// Cases formerly covered only by the retired Python API tests.
#[tokio::test]
async fn batch_weighting_extreme_load_and_shrinkage_units() {
    let (router, _directory) = setup();
    let mut high = batch_row();
    high["calls_offered"] = json!(5000);
    high["aht_seconds"] = json!(360);
    let mut low = batch_row();
    low["calls_offered"] = json!(10);
    low["aht_seconds"] = json!(600);
    low["mean_patience_seconds"] = json!(30);
    low["shrinkage"] = json!(0.3);
    let (_, result) = json_request(
        &router,
        "/api/erlang-c/batch-calculate",
        json!({"rows": [high.clone(), low]}),
    )
    .await;
    assert_eq!(result["summary"]["successfulRows"], 2);
    let rows = result["results"].as_array().unwrap();
    for (metric, summary) in [
        ("serviceLevel", "avgServiceLevel"),
        ("asaSeconds", "avgAsaSeconds"),
    ] {
        let expected = (rows[0][metric].as_f64().unwrap() * 5000.0
            + rows[1][metric].as_f64().unwrap() * 10.0)
            / 5010.0;
        assert_close(&result["summary"][summary], &json!(expected), summary);
    }
    for row in rows {
        for key in [
            "serviceLevel",
            "asaSeconds",
            "percentAnsweredImmediately",
            "expectedOccupancy",
            "abandonPercent",
        ] {
            assert!(row[key].as_f64().unwrap().is_finite(), "{key}: {row}");
        }
        assert!(
            row["requiredStaffGross"].as_u64().unwrap() > row["requiredStaffNet"].as_u64().unwrap()
        );
    }
    let (_, percent) = json_request(
        &router,
        "/api/erlang-c/batch-calculate",
        json!({"rows": [high.clone()]}),
    )
    .await;
    high["shrinkage"] = json!(0.3);
    let (_, ratio) = json_request(
        &router,
        "/api/erlang-c/batch-calculate",
        json!({"rows": [high]}),
    )
    .await;
    assert_eq!(percent, ratio);
}

#[tokio::test]
async fn file_processor_rejects_missing_fields_and_invalid_ranges() {
    let (router, _directory) = setup();
    let mut missing = batch_row();
    missing.as_object_mut().unwrap().remove("aht_seconds");
    let mut bad = batch_row();
    bad["max_occupancy"] = json!(120);
    let (_, result) = json_request(
        &router,
        "/api/erlang-c/batch/file-processor",
        json!({"rows": [missing, bad]}),
    )
    .await;
    assert_eq!(result["summary"]["successfulRows"], 0);
    assert_eq!(result["summary"]["failedRows"], 2);
    assert_eq!(result["results"], json!([]));
    assert_eq!(result["export"]["enrichedFile"]["rows"], json!([]));
    assert_eq!(result["errors"].as_array().unwrap().len(), 3);
}

#[tokio::test]
async fn calculator_models_goals_and_invalid_shrinkage() {
    let (router, _directory) = setup();
    let fixtures: Value =
        serde_json::from_str(include_str!("fixtures/python_contract.json")).unwrap();
    let mut request = fixtures
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["name"] == "erlang_a_25")
        .unwrap()["request"]
        .clone();
    let (status, baseline) =
        json_request(&router, "/api/erlang-c/calculate", request.clone()).await;
    assert_eq!(status, StatusCode::OK, "{baseline}");
    assert_eq!(baseline["scenarios"].as_array().unwrap().len(), 7);
    let recommended = baseline["scenarios"]
        .as_array()
        .unwrap()
        .iter()
        .find(|row| row["isRecommended"] == true)
        .unwrap();
    assert_eq!(recommended["agents"], baseline["summary"]["requiredAgents"]);
    assert_eq!(
        recommended["requiredHeadcount"],
        baseline["summary"]["requiredHeadcount"]
    );
    request["serviceLevelGoal"] = json!(90);
    let (status, strict) = json_request(&router, "/api/erlang-c/calculate", request.clone()).await;
    assert_eq!(status, StatusCode::OK);
    assert!(
        strict["summary"]["requiredAgents"]
            .as_str()
            .unwrap()
            .parse::<usize>()
            .unwrap()
            >= baseline["summary"]["requiredAgents"]
                .as_str()
                .unwrap()
                .parse::<usize>()
                .unwrap()
    );
    for (key, value) in [
        ("model", json!("invalid-model")),
        ("shrinkageAssumption", json!(100)),
    ] {
        let mut bad = request.clone();
        bad[key] = value;
        assert_eq!(
            json_request(&router, "/api/erlang-c/calculate", bad)
                .await
                .0,
            StatusCode::UNPROCESSABLE_ENTITY
        );
    }
}

#[tokio::test]
async fn planner_floor_does_not_reduce_an_erlang_requirement() {
    let (router, _directory) = setup();
    let fixtures: Value =
        serde_json::from_str(include_str!("fixtures/python_contract.json")).unwrap();
    let mut request = fixtures
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["name"] == "planner_floor")
        .unwrap()["request"]
        .clone();
    request["rows"][0]["callsOffered"] = json!(100);
    request["rows"][0]["minimumHeadcount"] = json!(0);
    let (status, baseline) = json_request(
        &router,
        "/api/planner/intraday-erlang/calculate",
        request.clone(),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{baseline}");
    request["rows"][0]["minimumHeadcount"] = json!(1);
    let (status, floored) =
        json_request(&router, "/api/planner/intraday-erlang/calculate", request).await;
    assert_eq!(status, StatusCode::OK, "{floored}");
    assert!(
        baseline["intervalPlans"][0]["requiredStaffNet"]
            .as_u64()
            .unwrap()
            > 1
    );
    for key in [
        "requiredStaffNet",
        "erlangRequiredStaffNet",
        "serviceLevel",
        "occupancy",
    ] {
        assert_eq!(
            baseline["intervalPlans"][0][key], floored["intervalPlans"][0][key],
            "{key}"
        );
    }
    assert_eq!(floored["intervalPlans"][0]["minimumApplied"], false);
}
