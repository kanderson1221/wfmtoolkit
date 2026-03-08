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

## Bulk Staffing Planner workflows

The Bulk Staffing Planner (`#csv-batch`) supports three explicit workflows:

1. **File Processor**
2. **Daily Plan Builder**
3. **Weekly Plan Builder**

All workflows share the same CSV contract and are all-or-nothing: if any row fails validation, no rows are processed.

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

New workflow endpoints:

- `POST /api/erlang-c/batch/file-processor`
- `POST /api/erlang-c/batch/daily-plan`
- `POST /api/erlang-c/batch/weekly-plan`

Backward-compatible endpoint:

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

#### Daily Plan request example

```json
{
  "shift_length_hours": 8,
  "productive_hours_per_day": 6.5,
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

#### Daily Plan response example (truncated)

```json
{
  "mode": "daily-plan",
  "summary": {
    "serviceDate": "2026-03-08",
    "requiredDailyFte": 12,
    "totalRequiredHeadcountHours": 74.5,
    "coverageGapHeadcount": 0,
    "coverageOverageHeadcount": 10
  },
  "results": [
    {
      "intervalStart": "2026-03-08T09:00:00Z",
      "requiredHeadcount": 50,
      "coverageHeadcount": 50
    }
  ],
  "shiftStarts": [],
  "errors": [],
  "export": {
    "dailyPlan": {},
    "shiftStarts": {}
  }
}
```

#### Weekly Plan request example

```json
{
  "shift_length_hours": 8,
  "productive_hours_per_day": 6.5,
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
    },
    {
      "queue_id": "sales",
      "interval_start": "2026-03-09T09:00:00Z",
      "calls_offered": 170,
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

#### Weekly Plan response example (truncated)

```json
{
  "mode": "weekly-plan",
  "summary": {
    "dayCount": 2,
    "totalRequiredHeadcountHours": 132.0,
    "averageDailyFte": 11.5,
    "peakDay": "2026-03-09",
    "staffingVariability": 0.17
  },
  "results": [
    {
      "serviceDate": "2026-03-08",
      "requiredHeadcountHours": 64.0,
      "recommendedDailyFte": 10
    }
  ],
  "dailyBreakdown": [],
  "errors": [],
  "export": {
    "weeklyPlan": {},
    "dailyBreakdown": {}
  }
}
```

### Planning algorithm

- Erlang interval metrics come from the existing Erlang engine (`staff_for_interval`).
- Shift planning uses a deterministic greedy latest-start heuristic:
  - shift starts are evaluated at each interval boundary
  - if an interval is under-covered, add starts in that interval
  - objective is lexicographic: minimize understaffing first, then overstaffing
- Tradeoff: this heuristic is fast, predictable, and dependency-free, but not globally optimal like MILP in every scenario.

### CSV templates

- `public/erlang_file_processor_template.csv`
- `public/erlang_daily_plan_template.csv`
- `public/erlang_weekly_plan_template.csv`
- (legacy) `public/erlang_batch_template.csv`

## Manual test checklist (frontend)

1. Switch between File/Daily/Weekly modes and verify mode-specific inputs and export buttons.
2. Upload each mode template and run processing; verify successful counts and rendered charts.
3. Remove a required column; verify parse-time schema error before API call.
4. Create a row with invalid range values (`aht_seconds=0` or `max_occupancy=120`); verify row-level errors and no processing.
5. Daily mode with multiple dates should fail with a clear mode-level error.
6. Weekly mode with only one date should fail with a clear mode-level error.
7. Verify File mode export includes exact appended column names.
8. Verify Daily mode exports interval demand vs coverage and shift starts.
9. Verify Weekly mode exports weekly summary and daily breakdown CSV files.

## Run backend tests

```bash
source .venv/bin/activate
python -m unittest discover -s backend/tests -p "test_*.py" -v
```
