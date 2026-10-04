#!/usr/bin/env python3
"""Smoke-check native server startup and the optional production supervisor."""

import argparse
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, required=True)
    parser.add_argument("--with-forecast-worker", action="store_true")
    args = parser.parse_args()
    repository = Path(__file__).resolve().parents[3]
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    base = f"http://127.0.0.1:{port}"
    with tempfile.TemporaryDirectory(prefix="wfm-startup-") as temporary:
        directory = Path(temporary)
        (directory / "index.html").write_text("<html>startup test</html>")
        env = dict(os.environ, HOST="127.0.0.1", PORT=str(port),
                   WFM_DIST_DIR=str(directory), WFM_SERVER_BINARY=str(args.binary.resolve()),
                   MPLCONFIGDIR=str(directory / "matplotlib"), RUST_LOG="warn")
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
                        with urlopen(base + "/api/health", timeout=1) as response:
                            assert response.status == 200
                        break
                    except (OSError, URLError):
                        if time.monotonic() >= deadline:
                            raise RuntimeError("Native server did not start")
                        time.sleep(0.05)
                with urlopen(base + "/", timeout=5) as response:
                    assert response.read() == b"<html>startup test</html>"
                if args.with_forecast_worker:
                    request = Request(base + "/api/forecasting/daily-volume/run",
                                      data=b'{"history":[]}', headers={"Content-Type": "application/json"})
                    try:
                        with urlopen(request, timeout=5):
                            raise AssertionError("Empty forecasting history must be rejected")
                    except HTTPError as error:
                        assert error.code == 422
                        assert isinstance(json.loads(error.read())["detail"], list)
                print("Server startup and static serving passed." +
                      (" Forecasting supervisor/proxy passed." if args.with_forecast_worker else ""))
            finally:
                process.terminate()
                try:
                    process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()


if __name__ == "__main__":
    main()
