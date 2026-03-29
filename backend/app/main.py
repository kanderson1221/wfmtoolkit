from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Literal
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, PlainTextResponse, Response
from pydantic import BaseModel, Field

from .batch import (
    MAX_UPLOAD_BYTES,
    cleanup_download_artifacts,
    get_download_artifact,
    _create_temp_csv_path,
    process_batch_rows,
    process_file_processor_rows,
    process_uploaded_file,
)
from .erlang import build_results_payload
from .models import StaffingInput


class ErlangCRequest(BaseModel):
    model: Literal["erlang_c", "erlang_a"] = "erlang_c"
    callsOffered: float = Field(ge=0)
    intervalLength: float = Field(gt=0)
    averageHandleTime: float = Field(gt=0)
    averageCustomerPatience: float = Field(gt=0)
    serviceLevelGoal: float = Field(gt=0, le=100)
    serviceLevelThreshold: float = Field(ge=0)
    maxOccupancy: float = Field(gt=0, le=100, default=85)
    shrinkageAssumption: float = Field(ge=0, lt=100, default=0)


class ErlangCBatchRequest(BaseModel):
    rows: list[dict[str, Any]]


class ErlangCFileProcessorRequest(BaseModel):
    rows: list[dict[str, Any]]


app = FastAPI(title="WFMToolkit API")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DIST_DIR = PROJECT_ROOT / "dist"
SEO_PATHS = (
    "/",
    "/planning-workspace/",
    "/erlang-tools/",
    "/terms/",
)


def _build_absolute_url(request: Request, path: str) -> str:
    base_url = str(request.base_url).rstrip("/")
    return f"{base_url}{path}"


def _resolve_last_modified(relative_path: str) -> str | None:
    candidate = DIST_DIR / relative_path
    if not candidate.exists():
        return None

    modified = datetime.fromtimestamp(candidate.stat().st_mtime, tz=timezone.utc)
    return modified.date().isoformat()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/robots.txt", include_in_schema=False)
def robots(request: Request) -> PlainTextResponse:
    sitemap_url = _build_absolute_url(request, "/sitemap.xml")
    return PlainTextResponse(
        f"User-agent: *\nAllow: /\n\nSitemap: {sitemap_url}\n",
        media_type="text/plain",
    )


@app.get("/sitemap.xml", include_in_schema=False)
def sitemap(request: Request) -> Response:
    urlset_entries: list[str] = []

    for path in SEO_PATHS:
        relative_path = "index.html" if path == "/" else f"{path.strip('/')}/index.html"
        last_modified = _resolve_last_modified(relative_path)
        last_modified_xml = f"<lastmod>{last_modified}</lastmod>" if last_modified else ""
        urlset_entries.append(
            f"<url><loc>{_build_absolute_url(request, path)}</loc>{last_modified_xml}</url>"
        )

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{''.join(urlset_entries)}"
        "</urlset>"
    )
    return Response(content=xml, media_type="application/xml")


@app.post("/api/erlang-c/calculate")
@app.post("/api/erlang-c/mock-results")
def calculate_erlang_c(payload: ErlangCRequest) -> dict[str, Any]:
    try:
        inputs = StaffingInput(
            calls_offered=payload.callsOffered,
            interval_duration_seconds=payload.intervalLength * 60,
            avg_handle_time_seconds=payload.averageHandleTime,
            target_service_level=payload.serviceLevelGoal / 100.0,
            service_level_answer_time_seconds=payload.serviceLevelThreshold,
            max_occupancy=payload.maxOccupancy / 100.0,
            avg_caller_patience_seconds=payload.averageCustomerPatience,
        )
        return build_results_payload(
            inputs,
            payload.shrinkageAssumption / 100.0,
            model=payload.model,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/api/erlang-c/batch-calculate")
def calculate_erlang_c_batch(payload: ErlangCBatchRequest) -> dict[str, Any]:
    if not payload.rows:
        raise HTTPException(status_code=422, detail="rows must contain at least one item")

    return process_batch_rows(payload.rows)


@app.post("/api/erlang-c/batch/file-processor")
def file_processor(payload: ErlangCFileProcessorRequest) -> dict[str, Any]:
    if not payload.rows:
        raise HTTPException(status_code=422, detail="rows must contain at least one item")

    return process_file_processor_rows(payload.rows)


@app.post("/api/erlang-c/batch/file-processor/upload")
async def file_processor_upload(request: Request) -> dict[str, Any]:
    cleanup_download_artifacts()

    filename = unquote(request.headers.get("x-upload-filename", "file_processor.csv")).strip()
    if not filename:
        filename = "file_processor.csv"
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="Upload a CSV file before running this workflow.")

    content_length_header = request.headers.get("content-length")
    if content_length_header:
        try:
            content_length = int(content_length_header)
        except ValueError:
            content_length = None
        else:
            if content_length > MAX_UPLOAD_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"CSV exceeds the 50 MB upload limit.",
                )

    temp_upload = _create_temp_csv_path()
    bytes_written = 0

    try:
        with temp_upload.open("wb") as upload_file:
            async for chunk in request.stream():
                if not chunk:
                    continue
                bytes_written += len(chunk)
                if bytes_written > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="CSV exceeds the 50 MB upload limit.",
                    )
                upload_file.write(chunk)

        return process_uploaded_file(temp_upload, filename)
    except ValueError as error:
        temp_upload.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=str(error)) from error
    except HTTPException:
        temp_upload.unlink(missing_ok=True)
        raise


@app.get("/api/erlang-c/batch/file-processor/download/{file_id}")
def file_processor_download(file_id: str) -> FileResponse:
    try:
        artifact = get_download_artifact(file_id)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

    return FileResponse(
        artifact["path"],
        filename=artifact["fileName"],
        media_type=artifact["mediaType"],
    )


@app.get("/", include_in_schema=False)
def serve_frontend_root() -> FileResponse:
    index_path = DIST_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Frontend build not found")
    return FileResponse(index_path)


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str) -> FileResponse:
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")

    index_path = DIST_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Frontend build not found")

    candidate = (DIST_DIR / full_path).resolve()
    dist_resolved = DIST_DIR.resolve()
    if dist_resolved in candidate.parents and candidate.is_file():
        return FileResponse(candidate)

    if dist_resolved in candidate.parents and candidate.is_dir():
        directory_index = candidate / "index.html"
        if directory_index.is_file():
            return FileResponse(directory_index)

    return FileResponse(index_path)
