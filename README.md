# WFMToolkit

Vue 3 + Vite frontend with a native Rust backend for Erlang C/Erlang A,
batch processing, and staffing planning. A private Python worker retains Prophet
forecasting during its separate migration.

## Requirements

- Node.js 20+
- npm 10+
- Rust 1.99+ (Cargo on PATH)
- Python 3.11+ for the forecasting worker

## Run locally

For the usual local development path, run:

```bash
npm run dev:app
```

This command installs missing frontend dependencies, prepares the forecasting
virtual environment, builds the Rust server, and starts Rust on port 8000,
the private forecasting worker on port 8001, and Vite on port 5173.
Restart it after Rust source changes.

Manual setup is still available when you want to run each service separately:

1. Install frontend dependencies:

```bash
npm install
```

2. Create and activate a Python virtual environment, then install backend dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

3. Start the private forecasting worker:

```bash
uvicorn backend.app.forecast_service:app --host 127.0.0.1 --port 8001
```

4. In a second terminal, start the Rust API:

```bash
HOST=127.0.0.1 PORT=8000 cargo run --manifest-path rust/Cargo.toml --locked -p wfm-server
```

5. In a third terminal, start the Vue dev server:

```bash
npm run dev
```

6. Open the local URL shown in your terminal (typically `http://localhost:5173`).

## Build for production

```bash
npm run build
npm run preview
```

## Deploy to Render (single-click)

This repo includes a Render Blueprint config in `render.yaml` and a multi-stage `Dockerfile`.

### Steps

1. Push this repository to GitHub.
2. In Render, click **New +** -> **Blueprint**.
3. Connect your GitHub repo and select this project.
4. Render will detect `render.yaml` and create one web service named `wfmtoolkit`.
5. Click **Apply** to deploy.

### Runtime behavior

- The Rust executable serves API routes under `/api/*`.
- The built Vue app is served from the same service/domain.
- Health check endpoint: `/api/health`.
- The container supervisor starts the private Python forecasting worker on
  loopback, waits for readiness, then starts Rust. It stops both processes if
  either exits. Python does not receive Erlang or planner requests.
- Server configuration and migration details: [Rust backend](rust/server/README.md).

## Current scope

- Frontend (Vue 3) + backend API (Rust/Axum)
- Hash-routed pages:
  - `#erlang-c` single-interval calculator
  - `#csv-batch` CSV Staffing File Processor
- Form posts input values to the calculation API endpoint
- API returns calculated staffing summary and scenario rows
- Batch API validates the full CSV and only processes when all rows are valid
- Planning and forecasting data currently stay in local browser storage. A future iteration will move that local storage into Dexie/IndexedDB.

## CSV Staffing File Processor

The CSV Staffing File Processor (`#csv-batch`) validates a demand file and returns an enriched export with required agents, required headcount, and core service metrics for every interval row.

An enriched export is available only when every row is valid. JSON batch
responses are all-or-nothing. Uploaded CSVs report successful-row summary totals
and return an error-report download if any row is invalid.

### CSV contract

Required columns:

- `queue_id`
- `interval_start`
- `calls_offered`
- `aht_seconds`
- `mean_patience_seconds`
- `service_level_threshold`
- `service_level_target_seconds`
- `max_occupancy`

Optional:

- `shrinkage`

Value handling:

- `service_level_threshold` and `max_occupancy` accept ratio (`0.8`) or percent (`80`).
- `shrinkage` accepts ratio (`0.3`) or percent (`30`).
- Row-level validation errors return `rowIndex` + `message`.

### API endpoints

- `POST /api/erlang-c/batch/file-processor`
- `POST /api/erlang-c/batch-calculate` (legacy file-processor shape)

#### File Processor request example

```json
{
  "rows": [
    {
      "queue_id": "sales",
      "interval_start": "2026-03-08T09:00:00Z",
      "calls_offered": 180,
      "aht_seconds": 240,
      "mean_patience_seconds": 180,
      "service_level_threshold": 80,
      "service_level_target_seconds": 20,
      "max_occupancy": 85,
      "shrinkage": 0.3
    }
  ]
}
```

#### File Processor response example (truncated)

```json
{
  "mode": "file-processor",
  "summary": {
    "processedRows": 1,
    "successfulRows": 1,
    "failedRows": 0
  },
  "results": [
    {
      "rowIndex": 1,
      "queueId": "sales",
      "requiredStaffNet": 35,
      "requiredStaffGross": 50
    }
  ],
  "errors": [],
  "export": {
    "enrichedFile": {
      "headers": [
        "...original columns...",
        "Required Agents",
        "Required Headcount",
        "Service Level",
        "Average Speed of Answer",
        "Answered Immediately",
        "Expected Occupancy",
        "Caller Abandonment"
      ]
    }
  }
}
```

### CSV templates

- `public/erlang_file_processor_template.csv`
- (legacy) `public/erlang_batch_template.csv`

## Manual test checklist (frontend)

1. Open `#csv-batch` and verify the file processor workspace loads.
2. Upload the file-processor template and run processing; verify processed/succeeded/failed counts.
3. Remove a required column; verify parse-time schema error before API call.
4. Create a row with invalid range values (`aht_seconds=0` or `max_occupancy=120`); verify row-level errors and no processing.
5. Verify the file export includes the exact appended column names.

## Run backend tests

```bash
cargo test --manifest-path rust/Cargo.toml --workspace --locked
cargo clippy --manifest-path rust/Cargo.toml --workspace --all-targets --locked -- -D warnings
cargo fmt --manifest-path rust/Cargo.toml --all --check
source .venv/bin/activate
python -m unittest discover -s backend/tests -p "test_*.py" -v
```

The Rust suite exercises native API contracts, numerical invariants, uploads,
downloads, and the forecasting proxy. Python tests retain forecasting coverage
and regression coverage for the old implementation.
