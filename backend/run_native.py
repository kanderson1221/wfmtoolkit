"""Supervise the public Rust server and private Prophet worker in one container."""

import os
import signal
import subprocess
import sys
import threading
import time
from urllib.error import URLError
from urllib.request import urlopen


def main() -> int:
    stopping = threading.Event()
    for signum in (signal.SIGINT, signal.SIGTERM):
        signal.signal(signum, lambda *_: stopping.set())
    processes: list[subprocess.Popen] = []
    try:
        worker = subprocess.Popen([
            sys.executable, "-m", "uvicorn", "backend.app.forecast_service:app",
            "--host", "127.0.0.1", "--port", "8001", "--workers", "1", "--timeout-graceful-shutdown", "5",
        ])
        processes.append(worker)
        deadline = time.monotonic() + 90
        while not stopping.is_set():
            if worker.poll() is not None:
                print("Forecasting worker exited during startup", file=sys.stderr)
                return 1
            try:
                with urlopen("http://127.0.0.1:8001/api/health", timeout=1) as response:
                    if response.status == 200:
                        break
            except (OSError, URLError):
                pass
            if time.monotonic() >= deadline:
                print("Forecasting worker readiness timed out", file=sys.stderr)
                return 1
            stopping.wait(0.2)
        if stopping.is_set():
            return 0
        environment = dict(os.environ)
        environment.setdefault("WFM_FORECAST_URL", "http://127.0.0.1:8001")
        server = subprocess.Popen([os.environ.get("WFM_SERVER_BINARY", "/usr/local/bin/wfm-server")], env=environment)
        processes.append(server)
        while not stopping.wait(0.2):
            if any(process.poll() is not None for process in processes):
                print("A backend process exited; stopping the container", file=sys.stderr)
                return 1
        return 0
    finally:
        for process in reversed(processes):
            if process.poll() is None:
                process.terminate()
        deadline = time.monotonic() + 15
        for process in processes:
            try:
                process.wait(timeout=max(0.1, deadline - time.monotonic()))
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == "__main__":
    raise SystemExit(main())
