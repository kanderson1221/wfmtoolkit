# Native HTTP verification

`native-http-2026-10-03.json` records one release-mode run on macOS/Apple Silicon
with Rust 1.99.0 and `WFM_COMPUTE_JOBS=1`. It exercised the production process
supervisor, the private forecasting validation proxy, 16 frozen Python API
contract cases, and an arbitrary dataset of 35,041 distinct interval identifiers.
The upload row limit was explicitly raised to accommodate that dataset.

The JSON batch request took approximately 99 ms. The CSV upload request took
approximately 82 ms. Both include localhost transport, server input parsing,
all staffing calculations, summary generation, and response serialization;
CSV also includes export-file writing. Dataset construction, compilation,
startup, download transfer, and client result parsing are excluded. These are
single-run validation measurements, not a reproducible speedup claim.

The recorded Rust RSS is measured **after both requests**, approximately
158 MiB. It is neither peak memory nor CSV-only memory; allocator retention
after the preceding large JSON response affects it. It excludes the private
Python forecasting worker and client. Uploaded CSV processing itself retains
only a row, working solver buffers, accumulated totals, and bounded error
previews, while JSON processing must retain the requested response.

Reproduce with the installed forecasting dependencies:

```sh
python3 rust/server/tools/check_http.py \
  --binary rust/target/release/wfm-server \
  --with-forecast-worker --rows 35041 \
  --output /tmp/native-http-results.json
```
