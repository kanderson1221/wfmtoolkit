# Native Rust backend

`wfm-server` is the public API and frontend server. It calls `wfm-erlang`
directly; no Python extension or inter-process call is involved in Erlang,
batch, CSV, or staffing planning calculations.

## Run

Use Rust 1.99, matching Docker and CI:

```sh
cargo build --manifest-path rust/Cargo.toml --locked --release -p wfm-server
PORT=8000 rust/target/release/wfm-server
```

`npm run dev:app` also starts the private forecasting worker and Vite.
Set `CARGO` if Cargo is installed outside the normal PATH.
The Docker entrypoint supervises Rust and forecasting in the existing single
Render service. Rust owns the public port and serves the built frontend.

## Preserved routes

- `GET /api/health`
- `POST /api/erlang-c/calculate` and `/api/erlang-c/mock-results`
- `POST /api/erlang-c/batch-calculate`
- `POST /api/erlang-c/batch/file-processor`
- `POST /api/erlang-c/batch/file-processor/upload`
- `GET /api/erlang-c/batch/file-processor/download/{file_id}` (HEAD/ranges supported)
- `POST /api/planner/intraday-erlang/calculate`
- `POST /api/forecasting/daily-volume/run` (private forecasting proxy)
- `/robots.txt`, `/sitemap.xml`, static assets, and frontend route fallback

Calculator units, camelCase responses, scenario display strings, shrinkage,
CSV header order, weighted summaries, staffing floors, and rollups retain their
existing contracts. Numeric strings remain accepted. Invalid/nonfinite inputs
return 422 or row errors. Validation messages are descriptive Rust messages;
they are not Pydantic's internal error-list format. Numerical/resource failures
are explicit errors, never an automatic switch back to Python.

Erlang C intentionally estimates abandonment using Erlang A at the same staffing
level; C's other metrics and staffing recommendation continue to use Erlang C.
The planner selects Erlang C, recalculating metrics when the configured minimum
headcount exceeds the recommendation, including zero-volume intervals.

## Datasets and memory

Every supplied dataset uses an ordinary loop and one reusable solver. Repeated
inputs are recalculated; only working buffers are reused. Dropping the solver
at the end of the job frees them. No result cache or per-row worker is added.
JSON processing retains the requested response. Uploaded CSVs retain one row,
summary totals, solver buffers, and at most 100 preview errors, writing exports
to temporary files. Downloads expire after one hour; cleanup occurs on uploads
and downloads. Failed uploads and abandoned temporary uploads are removed by
RAII. Files are local to one service instance, as in the previous backend.

Admission limits apply before JSON parsing. Upload admission is separate from
calculation capacity, and uploads have a deadline for receiving and writing bytes.
The calculation slot is acquired after the file has arrived. Calculation limits apply until
the blocking worker actually finishes, even if the client disconnects. Busy
requests return 503. Health and downloads remain independent of calculation
capacity. Rows execute sequentially within each job; independent requests may
execute concurrently up to the configured limit.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` / `PORT` | `0.0.0.0` / `10000` | Public Rust listener |
| `WFM_DIST_DIR` | `dist` | Built frontend directory |
| `WFM_DOWNLOAD_DIR` | system temp + `wfmtoolkit_file_processor` | Local download files |
| `WFMTOOLKIT_SITE_URL` | `https://www.wfmtoolkit.com` | Canonical SEO URLs |
| `WFM_COMPUTE_JOBS` | `1` | Concurrent calculation jobs, 1–64 |
| `WFM_UPLOAD_JOBS` | `1` | Concurrent upload requests, 1–8; independent of compute slots |
| `WFM_UPLOAD_TIMEOUT_SECONDS` | `60` | Upload receive/write deadline, 1–600 seconds; exceeded uploads return 408 |
| `WFM_MAX_UPLOAD_ROWS` | `25000` | Existing CSV row limit; configurable for larger datasets |
| `WFM_FORECAST_URL` | `http://127.0.0.1:8001` | Private forecasting worker |
| `RUST_LOG` | server and HTTP logs | Rust logging filter |

Requests/uploads are limited to 50 MiB. JSON row datasets have no calendar or
fixed row-count assumption. Core limits remain 100,000 agents and 1,000,000
stationary states per calculation; see the engine README for numerical bounds.
The single-job default keeps memory predictable on the current small hosting
plan. Raise it only after measuring concurrent workloads on the target host.

## Private forecasting boundary

`backend.app.forecast_service` exposes only forecasting and readiness. It binds
to loopback in the container. Prophet/pandas remain there; Rust forwards the
forecasting request and preserves its status and JSON. Forecast fits are limited
to one at a time in both the proxy and worker, with a 600-second proxy timeout.
The API process loads only lightweight request validation; each Prophet fit runs
in a separate process. On POSIX hosts, timeout/cancellation stops its whole process
group, including CmdStan children. The guard remains held until job cleanup finishes.
Private job input/output files are deleted after each request. A fit includes
model fitting, prediction, holdout evaluation, and result serialization in its deadline.

| Forecast variable | Default | Limit |
| --- | --- | --- |
| `WFM_FORECAST_TIMEOUT_SECONDS` | `540` | Job deadline, 1–540 seconds; timeout returns 503 |
| `WFM_FORECAST_MAX_HISTORY_ROWS` | `10000` | Daily history rows |
| `WFM_FORECAST_MAX_FOURIER_ORDER` | `30` | Order for each seasonality |
| `WFM_FORECAST_MAX_TOTAL_FOURIER_ORDER` | `100` | Sum of enabled seasonality orders |
| `WFM_FORECAST_MAX_MODEL_CELLS` | `2000000` | Estimated history/future rows times feature columns |
| `WFM_FORECAST_MAX_MCMC_SAMPLES` | `1000` | Sampling count |
| `WFM_FORECAST_MAX_CHANGEPOINTS` | `100` | Automatic/manual changepoints |

Complexity limits are positive integer settings, enforced before a fit starts.
The feature budget includes seasonality, holiday windows, changepoints, and a
conservative built-in holiday allowance. Custom seasonalities are limited to 10,
custom holidays to 1,000, and holiday windows to 30 days in each direction.
Nonfinite numerical inputs are rejected. Raise resource limits only after
measuring the target host's memory and compute capacity.

Unavailability returns 503. The retired Python public API, batch, and planner
modules have been removed. Regression coverage for the public API runs against
Rust using recorded expected responses.

## Verification

```sh
cargo test --manifest-path rust/Cargo.toml --workspace --locked
cargo fmt --manifest-path rust/Cargo.toml --all --check
cargo clippy --manifest-path rust/Cargo.toml --workspace --all-targets --locked -- -D warnings
python3 rust/server/tools/check_http.py --binary rust/target/release/wfm-server
```

The Rust tests check recorded API responses, numerical results, HTTP errors,
upload limits, download expiration, path containment, and forecasting proxy
behavior. Expected API responses have one canonical copy in
`tests/fixtures/python_contract.json`. The small HTTP smoke check verifies executable
startup and static serving; add `--with-forecast-worker` to check the production
supervisor and forecasting proxy. It does not benchmark datasets.
