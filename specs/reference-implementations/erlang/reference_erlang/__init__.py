"""Executable reference implementation for interval staffing requirements."""

from .erlang import (
    ERLANG_A_MODEL,
    ERLANG_C_MODEL,
    build_results_payload,
    staff_for_interval,
)
from .models import StaffingInput
from .planner import plan_intraday_monthly_rows

__all__ = [
    "ERLANG_A_MODEL",
    "ERLANG_C_MODEL",
    "StaffingInput",
    "build_results_payload",
    "plan_intraday_monthly_rows",
    "staff_for_interval",
]
