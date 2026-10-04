use crate::{
    batch::{
        calculate_row, csv_row, export_row, utc_now, RowError, Summary, ENRICHED_HEADERS,
        REQUIRED_HEADERS,
    },
    error::ApiError,
};
use chrono::{DateTime, Duration, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};
use tempfile::NamedTempFile;
use uuid::Uuid;
use wfm_erlang::Solver;

pub const MAX_UPLOAD_BYTES: usize = 50 * 1024 * 1024;
pub const MAX_UPLOAD_ROWS: usize = 25_000;
const ERROR_PREVIEW_LIMIT: usize = 100;
const EXPIRED: &str = "Processed file download has expired or is unavailable.";

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Artifact {
    pub file_id: String,
    pub file_name: String,
    pub media_type: String,
    pub expires_at: DateTime<Utc>,
}

fn valid_id(id: &str) -> bool {
    id.len() == 32 && id.bytes().all(|b| b.is_ascii_hexdigit())
}

pub fn cleanup(directory: &Path) -> Result<(), ApiError> {
    fs::create_dir_all(directory)?;
    let now = utc_now();
    for entry in fs::read_dir(directory)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().is_none_or(|ext| ext != "json") {
            continue;
        }
        let Some(id) = path
            .file_stem()
            .and_then(|s| s.to_str())
            .filter(|id| valid_id(id))
        else {
            continue;
        };
        let artifact = fs::read(&path)
            .ok()
            .and_then(|bytes| serde_json::from_slice::<Artifact>(&bytes).ok());
        if artifact.is_none_or(|a| a.expires_at <= now) {
            let _ = fs::remove_file(directory.join(format!("{id}.csv")));
            let _ = fs::remove_file(path);
        }
    }
    Ok(())
}

fn register(file: NamedTempFile, directory: &Path, name: String) -> Result<Value, ApiError> {
    let id = Uuid::new_v4().simple().to_string();
    let artifact = Artifact {
        file_id: id.clone(),
        file_name: name,
        media_type: "text/csv".into(),
        expires_at: utc_now() + Duration::hours(1),
    };
    let destination = directory.join(format!("{id}.csv"));
    file.persist(&destination)
        .map_err(|error| ApiError::from(error.error))?;
    let metadata_result = (|| -> Result<(), ApiError> {
        let mut metadata = NamedTempFile::new_in(directory)?;
        serde_json::to_writer(metadata.as_file_mut(), &artifact)
            .map_err(|_| ApiError::invalid("Unable to write download metadata"))?;
        metadata.flush()?;
        metadata
            .persist(directory.join(format!("{id}.json")))
            .map_err(|error| ApiError::from(error.error))?;
        Ok(())
    })();
    if let Err(error) = metadata_result {
        let _ = fs::remove_file(destination);
        return Err(error);
    }
    Ok(json!({"fileId": id, "fileName": artifact.file_name,
        "downloadUrl": format!("/api/erlang-c/batch/file-processor/download/{id}"),
        "expiresAt": artifact.expires_at.to_rfc3339_opts(SecondsFormat::Micros, false)}))
}

pub fn artifact(directory: &Path, id: &str) -> Result<(PathBuf, Artifact), ApiError> {
    if !valid_id(id) {
        return Err(ApiError(axum::http::StatusCode::NOT_FOUND, EXPIRED.into()));
    }
    cleanup(directory)?;
    let metadata = fs::read(directory.join(format!("{id}.json")))
        .ok()
        .and_then(|bytes| serde_json::from_slice::<Artifact>(&bytes).ok())
        .filter(|a| a.file_id == id && a.expires_at > utc_now());
    let path = directory.join(format!("{id}.csv"));
    match metadata {
        Some(metadata) if path.is_file() => Ok((path, metadata)),
        _ => Err(ApiError(axum::http::StatusCode::NOT_FOUND, EXPIRED.into())),
    }
}

fn download_name(original: &str, suffix: &str) -> String {
    // Handle either platform's path separator in user-supplied filenames.
    let base = original
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or("file_processor.csv");
    let stem = Path::new(base)
        .file_stem()
        .and_then(|s| s.to_str())
        .filter(|s| !s.is_empty())
        .unwrap_or("file_processor");
    format!("{stem}_{suffix}.csv")
}

fn cell(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::String(s) => s.clone(),
        _ => value.to_string(),
    }
}

pub fn process(
    upload: NamedTempFile,
    original: String,
    directory: PathBuf,
    max_rows: usize,
) -> Result<Value, ApiError> {
    cleanup(&directory)?;
    let mut reader = csv::ReaderBuilder::new()
        .flexible(true)
        .from_path(upload.path())?;
    let headers: Vec<String> = reader
        .headers()?
        .iter()
        .map(|s| s.trim_start_matches('\u{feff}').trim().to_string())
        .collect();
    let export_headers: Vec<String> = headers.iter().filter(|s| !s.is_empty()).cloned().collect();
    if export_headers.is_empty() {
        return Err(ApiError::invalid("CSV is empty."));
    }
    let missing: Vec<_> = REQUIRED_HEADERS
        .iter()
        .filter(|h| !export_headers.iter().any(|s| s == **h))
        .copied()
        .collect();
    if !missing.is_empty() {
        return Err(ApiError::invalid(format!(
            "Missing required columns for File Processor: {}",
            missing.join(", ")
        )));
    }
    let mut enriched = NamedTempFile::new_in(&directory)?;
    let mut writer = csv::WriterBuilder::new()
        .terminator(csv::Terminator::CRLF)
        .from_writer(enriched.as_file_mut());
    writer.write_record(
        export_headers
            .iter()
            .map(String::as_str)
            .chain(ENRICHED_HEADERS.iter().copied()),
    )?;
    let mut error_file = None;
    let mut error_writer = None;
    let mut processed = 0;
    let mut successful = 0;
    let mut failed = 0;
    let mut preview = Vec::<RowError>::new();
    let mut summary = Summary::default();
    let mut solver = Solver::default();
    for record in reader.records() {
        let record = record?;
        processed += 1;
        if processed > max_rows {
            return Err(ApiError::invalid(format!(
                "File exceeds the maximum supported row count of {max_rows}."
            )));
        }
        let raw = csv_row(&headers, &record);
        match calculate_row(&raw, processed, &mut solver) {
            Ok(row) => {
                successful += 1;
                summary.add(&row);
                writer.write_record(export_row(&export_headers, &raw, &row).iter().map(cell))?;
            }
            Err(error) => {
                failed += 1;
                if error_writer.is_none() {
                    let temp = NamedTempFile::new_in(&directory)?;
                    let mut errors = csv::WriterBuilder::new()
                        .terminator(csv::Terminator::CRLF)
                        .from_writer(temp.reopen()?);
                    errors.write_record(
                        ["row_index", "message"]
                            .into_iter()
                            .chain(export_headers.iter().map(String::as_str)),
                    )?;
                    error_file = Some(temp);
                    error_writer = Some(errors);
                }
                let mut cells = vec![processed.to_string(), error.1.clone()];
                cells.extend(
                    export_headers
                        .iter()
                        .map(|header| cell(raw.get(header).unwrap_or(&Value::Null))),
                );
                error_writer
                    .as_mut()
                    .expect("created error writer")
                    .write_record(cells)?;
                if preview.len() < ERROR_PREVIEW_LIMIT {
                    preview.push(RowError {
                        row_index: processed,
                        message: error.1,
                    });
                }
            }
        }
    }
    if processed == 0 {
        return Err(ApiError::invalid("No data rows found in CSV."));
    }
    writer.flush()?;
    drop(writer);
    if let Some(mut errors) = error_writer {
        errors.flush()?;
    }
    let downloads = if failed > 0 {
        json!({"errorReport": register(error_file.expect("failed rows have error file"), &directory, download_name(&original, "error_report"))?})
    } else {
        json!({"enrichedFile": register(enriched, &directory, download_name(&original, "enriched"))?})
    };
    Ok(
        json!({"mode": "file-processor", "summary": summary.build(processed, successful, failed),
        "processedRows": processed, "successfulRows": successful, "failedRows": failed,
        "errorCount": failed, "errorsPreview": preview, "downloads": downloads}),
    )
}
