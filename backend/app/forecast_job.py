"""One isolated Prophet job; invoked only by the private forecasting service."""

import json
from pathlib import Path
import sys

from .forecasting import ForecastRunRequest, run_daily_volume_forecast


def main():
    source, target = map(Path, sys.argv[1:])
    try:
        result = run_daily_volume_forecast(ForecastRunRequest.model_validate_json(source.read_text(encoding="utf-8")))
        envelope = {"result": result}
    except ValueError as error:
        envelope = {"error": {"status": 422, "detail": str(error)}}
    except RuntimeError as error:
        envelope = {"error": {"status": 503, "detail": str(error)}}
    target.write_text(json.dumps(envelope, allow_nan=False), encoding="utf-8")


if __name__ == "__main__":
    main()
