use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug)]
pub struct ApiError(pub StatusCode, pub String);

impl ApiError {
    pub fn invalid(message: impl Into<String>) -> Self {
        Self(StatusCode::UNPROCESSABLE_ENTITY, message.into())
    }

    pub fn unavailable(message: impl Into<String>) -> Self {
        Self(StatusCode::SERVICE_UNAVAILABLE, message.into())
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(json!({"detail": self.1}))).into_response()
    }
}

impl From<wfm_erlang::Error> for ApiError {
    fn from(error: wfm_erlang::Error) -> Self {
        Self::invalid(error.to_string())
    }
}

impl From<std::io::Error> for ApiError {
    fn from(error: std::io::Error) -> Self {
        tracing::error!(%error, "file operation failed");
        Self(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Unable to process file.".into(),
        )
    }
}

impl From<csv::Error> for ApiError {
    fn from(error: csv::Error) -> Self {
        if error.is_io_error() {
            tracing::error!(%error, "CSV file operation failed");
            Self(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Unable to process file.".into(),
            )
        } else {
            Self::invalid("Unable to parse CSV file.")
        }
    }
}
