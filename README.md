# WFMToolkit

Vue 3 + Vite frontend with a FastAPI backend that runs Erlang C/Erlang A staffing calculations.

## Requirements

- Node.js 20+
- npm 10+
- Python 3.11+

## Run locally

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

3. Start the FastAPI server:

```bash
uvicorn backend.app.main:app --reload
```

4. In a second terminal, start the Vue dev server:

```bash
npm run dev
```

5. Open the local URL shown in your terminal (typically `http://localhost:5173`).

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

- FastAPI serves API routes under `/api/*`.
- The built Vue app is served from the same service/domain.
- Health check endpoint: `/api/health`.

## Current scope

- Frontend (Vue 3) + backend API (FastAPI)
- Hash-routed pages:
  - `#erlang-c` single-interval calculator
  - `#csv-batch` Bulk Staffing Planner
- Form posts input values to the calculation API endpoint
- API returns calculated staffing summary and scenario rows
- Batch API validates the full CSV and only processes when all rows are valid
- No database or authentication

## Batch CSV feature

### Batch endpoint

- `POST /api/erlang-c/batch-calculate`
- Request body:

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

`service_level_threshold` and `max_occupancy` accept either ratio (`0.8`) or percent (`80`).
`shrinkage` is optional and accepts ratio (`0.3`) or percent (`30`).

### Response shape

- `results`: row calculations (only populated when all rows are valid)
- `summary`: processed/success/failed counts + aggregate service/ASA/staffing metrics
- `errors`: row-level validation failures (`rowIndex` + message)

### CSV files

- Template: `public/erlang_batch_template.csv`

## Manual test checklist (frontend)

1. Upload `public/erlang_batch_template.csv` and run batch; verify non-zero results and empty errors.
2. Remove a required column from CSV; verify parse-time error before API call.
3. Set one row `aht_seconds` to `0`; verify no interval results are returned and row errors are displayed.
4. Use large volume row (for example `calls_offered=5000`); verify no `NaN` appears in displayed metrics.
5. Export processed results CSV and verify calculated values are present.

## Run backend tests

```bash
source .venv/bin/activate
python -m unittest discover -s backend/tests -p "test_*.py" -v
```
