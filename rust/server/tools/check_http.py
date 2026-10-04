#!/usr/bin/env python3
"""Check native HTTP contracts and time a supplied-size dataset (stdlib only)."""

import argparse
import csv
import io
import json
import math
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def compare(actual, expected, path="response"):
    if isinstance(expected, dict):
        assert set(actual) == set(expected), (path, set(actual), set(expected))
        for key in expected:
            compare(actual[key], expected[key], f"{path}.{key}")
    elif isinstance(expected, list):
        assert len(actual) == len(expected), path
        for index, (a, e) in enumerate(zip(actual, expected)):
            compare(a, e, f"{path}[{index}]")
    elif isinstance(expected, float):
        assert math.isclose(actual, expected, abs_tol=1e-12, rel_tol=1e-12), (path, actual, expected)
    else:
        assert actual == expected, (path, actual, expected)


def request(base, path, body=None, headers=None):
    req = Request(base + path, data=body, headers=headers or {})
    with urlopen(req, timeout=120) as response:
        return response.status, response.read()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, required=True)
    parser.add_argument("--rows", type=int, default=17520)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--with-forecast-worker", action="store_true", help="Test the production supervisor and private Python worker too")
    args = parser.parse_args()
    if args.rows <= 0:
        parser.error("--rows must be positive")
    repository = Path(__file__).resolve().parents[3]
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    base = f"http://127.0.0.1:{port}"
    with tempfile.TemporaryDirectory(prefix="wfm-native-http-") as temporary:
        directory = Path(temporary)
        dist = directory / "dist"
        dist.mkdir()
        (dist / "index.html").write_text("<html>native server test</html>")
        env = dict(os.environ, HOST="127.0.0.1", PORT=str(port), WFM_DIST_DIR=str(dist),
                   WFM_DOWNLOAD_DIR=str(directory / "downloads"), WFM_COMPUTE_JOBS="1",
                   WFM_MAX_UPLOAD_ROWS=str(max(args.rows, 25000)), RUST_LOG="warn")
        env["WFM_SERVER_BINARY"] = str(args.binary.resolve())
        env["MPLCONFIGDIR"] = str(directory / "matplotlib")
        command = [str(args.binary.resolve())]
        if args.with_forecast_worker:
            with socket.socket() as worker_port:
                worker_port.bind(("127.0.0.1", 8001))
            command = [sys.executable, "-m", "backend.run_native"]
        with (directory / "server.log").open("w") as log:
            process = subprocess.Popen(command, env=env, cwd=repository, stdout=log, stderr=log)
            try:
                deadline = time.monotonic() + (90 if args.with_forecast_worker else 20)
                while True:
                    if process.poll() is not None:
                        raise RuntimeError((directory / "server.log").read_text())
                    try:
                        assert request(base, "/api/health")[0] == 200
                        break
                    except (OSError, URLError):
                        if time.monotonic() > deadline:
                            raise RuntimeError("Native server did not start")
                        time.sleep(0.05)
                cases = json.loads((repository / "rust/server/tests/fixtures/python_contract.json").read_text())
                for case in cases:
                    status, result = request(base, case["path"], json.dumps(case["request"]).encode(), {"Content-Type": "application/json"})
                    assert status == 200
                    compare(json.loads(result), case["response"], case["name"])
                if args.with_forecast_worker:
                    try:
                        request(base, "/api/forecasting/daily-volume/run", b'{"history":[]}', {"Content-Type": "application/json"})
                        raise AssertionError("Empty forecasting history must be rejected")
                    except HTTPError as error:
                        assert error.code == 422
                        assert isinstance(json.loads(error.read())["detail"], list)
                rows = [dict(queue_id=f"queue-{i % 4}", interval_start=f"interval-{i}",
                             calls_offered=25 + i % 80, aht_seconds=240 + i % 120,
                             mean_patience_seconds=180, service_level_threshold=80,
                             service_level_target_seconds=20, max_occupancy=85, shrinkage=.3)
                        for i in range(args.rows)]
                timings = {}
                body = json.dumps({"rows": rows}).encode()
                started = time.perf_counter()
                status, response = request(base, "/api/erlang-c/batch-calculate", body, {"Content-Type": "application/json"})
                timings["json_request_seconds"] = time.perf_counter() - started
                payload = json.loads(response)
                assert status == 200 and payload["summary"]["successfulRows"] == args.rows
                assert len(payload["results"]) == args.rows
                assert not payload["errors"]
                for i in (0, args.rows // 2, args.rows - 1):
                    assert payload["results"][i]["rowIndex"] == i + 1
                    assert payload["results"][i]["intervalStart"] == rows[i]["interval_start"]
                csv_file = io.StringIO()
                writer = csv.DictWriter(csv_file, fieldnames=list(rows[0]))
                writer.writeheader()
                writer.writerows(rows)
                started = time.perf_counter()
                status, response = request(base, "/api/erlang-c/batch/file-processor/upload", csv_file.getvalue().encode(),
                                           {"Content-Type": "text/csv", "X-Upload-Filename": "dataset.csv"})
                timings["csv_upload_request_seconds"] = time.perf_counter() - started
                upload = json.loads(response)
                assert status == 200 and upload["successfulRows"] == args.rows
                compare(upload["summary"], payload["summary"], "dataset_summary")
                status, downloaded = request(base, upload["downloads"]["enrichedFile"]["downloadUrl"])
                assert status == 200
                assert sum(1 for _ in csv.reader(io.StringIO(downloaded.decode()))) == args.rows + 1
                report = dict(rows=args.rows, api_contract_cases=len(cases), **timings,
                              json_request_bytes=len(body), enriched_csv_bytes=len(downloaded))
                report["production_supervisor_tested"] = args.with_forecast_worker
                try:
                    server_pid = process.pid
                    if args.with_forecast_worker:
                        children = subprocess.check_output(["ps", "-axo", "pid=,ppid=,comm="], text=True)
                        server_pid = next(int(pid) for line in children.splitlines()
                                          for pid, parent, name in [line.strip().split(maxsplit=2)]
                                          if int(parent) == process.pid and name.endswith("wfm-server"))
                    report["server_rss_kib_after_requests"] = int(subprocess.check_output(["ps", "-o", "rss=", "-p", str(server_pid)], text=True).strip())
                except (OSError, ValueError, StopIteration, subprocess.CalledProcessError):
                    pass
                try:
                    request(base, "/api/missing")
                    raise AssertionError("Unknown API must return 404")
                except HTTPError as error:
                    assert error.code == 404
                if args.output:
                    args.output.write_text(json.dumps(report, indent=2) + "\n")
                print(json.dumps(report, indent=2))
            finally:
                process.terminate()
                try:
                    process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()


if __name__ == "__main__":
    main()
