from __future__ import annotations

from dataclasses import dataclass
from importlib import resources
import math
from pathlib import Path
from typing import Any, Literal

import pandas as pd
from pydantic import BaseModel, Field

try:
    from prophet import Prophet
except Exception:  # pragma: no cover - exercised via runtime environment checks
    Prophet = None


class ForecastHistoryRow(BaseModel):
    ds: str = Field(min_length=1)
    y: float = Field(ge=0)
    cap: float | None = Field(default=None, ge=0)
    floor: float | None = Field(default=None, ge=0)
    holidayLabel: str = ""


class SeasonalityConfig(BaseModel):
    enabled: bool = True
    fourierOrder: int = Field(default=3, ge=1)
    priorScale: float = Field(default=10, gt=0)


class MonthlySeasonalityConfig(SeasonalityConfig):
    periodDays: float = Field(default=30.5, gt=0)


class CustomSeasonalityConfig(BaseModel):
    name: str = Field(min_length=1)
    periodDays: float = Field(gt=0)
    fourierOrder: int = Field(ge=1)
    priorScale: float = Field(gt=0)
    mode: Literal["additive", "multiplicative"] = "additive"


class CustomHolidayConfig(BaseModel):
    name: str = Field(min_length=1)
    date: str = Field(min_length=1)
    lowerWindow: int = 0
    upperWindow: int = 0
    priorScale: float = Field(default=10, gt=0)


class ForecastModelConfig(BaseModel):
    growth: Literal["linear", "logistic", "flat"] = "linear"
    defaultCap: float | None = Field(default=None, ge=0)
    defaultFloor: float | None = Field(default=0, ge=0)
    changepointPriorScale: float = Field(default=0.05, gt=0)
    changepointRange: float = Field(default=0.8, gt=0, le=1)
    changepointCount: int = Field(default=25, ge=0)
    manualChangepoints: list[str] = Field(default_factory=list)
    seasonalityMode: Literal["additive", "multiplicative"] = "additive"
    weeklySeasonality: SeasonalityConfig = Field(default_factory=SeasonalityConfig)
    yearlySeasonality: SeasonalityConfig = Field(
        default_factory=lambda: SeasonalityConfig(enabled=True, fourierOrder=10, priorScale=10)
    )
    monthlySeasonality: MonthlySeasonalityConfig = Field(
        default_factory=lambda: MonthlySeasonalityConfig(enabled=False, periodDays=30.5, fourierOrder=5, priorScale=10)
    )
    builtInHolidayCountry: str = ""
    holidaysPriorScale: float = Field(default=10, gt=0)
    customSeasonalities: list[CustomSeasonalityConfig] = Field(default_factory=list)
    customHolidays: list[CustomHolidayConfig] = Field(default_factory=list)
    intervalWidth: float = Field(default=0.8, gt=0, lt=1)
    mcmcSamples: int = Field(default=0, ge=0)
    holdoutDays: int = Field(default=60, ge=0)


class ForecastRunRequest(BaseModel):
    timezone: str = "America/New_York"
    forecastHorizonDays: int = Field(default=365, ge=0, le=730)
    planningYear: int | None = Field(default=None, ge=2000, le=2100)
    forecastType: Literal["budget", "reforecast"] | None = None
    coverageStartDate: str = ""
    coverageEndDate: str = ""
    history: list[ForecastHistoryRow] = Field(min_length=1)
    modelConfig: ForecastModelConfig = Field(default_factory=ForecastModelConfig)


@dataclass
class PreparedHistory:
    frame: pd.DataFrame
    warnings: list[str]
    validation_notes: list[str]
    original_observations: int


@dataclass
class CoverageWindow:
    planning_year: int | None
    forecast_type: str
    start_date: pd.Timestamp | None
    end_date: pd.Timestamp | None
    start_month_index: int
    expected_month_count: int
    plan_aligned: bool


def _require_prophet() -> None:
    if Prophet is None:
        raise RuntimeError(
            "Forecasting backend is unavailable because the Prophet package is not installed."
        )


def _configure_prophet_cmdstan() -> None:
    if Prophet is None or not getattr(Prophet, "__module__", "").startswith("prophet"):
        return

    try:
        import cmdstanpy
        from prophet.models import CmdStanPyBackend
    except Exception:
        return

    try:
        installed_cmdstan = Path(cmdstanpy.cmdstan_path())
    except Exception:
        installed_cmdstan = None

    try:
        bundled_cmdstan = Path(
            str(resources.files("prophet") / "stan_model" / f"cmdstan-{CmdStanPyBackend.CMDSTAN_VERSION}")
        )
    except Exception:
        bundled_cmdstan = None

    if (
        installed_cmdstan is not None
        and installed_cmdstan.exists()
        and bundled_cmdstan is not None
        and bundled_cmdstan.exists()
        and not (bundled_cmdstan / "makefile").exists()
    ):
        # Some Prophet wheel builds include a partial bundled CmdStan tree.
        # Prefer the working global CmdStan install instead of the invalid bundled path.
        CmdStanPyBackend.CMDSTAN_VERSION = installed_cmdstan.name.removeprefix("cmdstan-")
        cmdstanpy.set_cmdstan_path(str(installed_cmdstan))


def _safe_float(value: Any, digits: int = 4) -> float:
    numeric = float(value or 0)
    return round(numeric, digits)


def _date_range_label(frame: pd.DataFrame) -> str:
    if frame.empty:
        return ""

    return f"{frame['ds'].min().date().isoformat()} to {frame['ds'].max().date().isoformat()}"


def _parse_date(value: str, field_name: str) -> pd.Timestamp:
    try:
        parsed = pd.to_datetime(value, utc=False)
    except Exception as error:  # pragma: no cover - defensive validation path
        raise ValueError(f"{field_name} must be a valid ISO date.") from error

    if pd.isna(parsed):
        raise ValueError(f"{field_name} must be a valid ISO date.")

    return parsed.normalize()


def _resolve_coverage_window(payload: ForecastRunRequest) -> CoverageWindow:
    planning_year = int(payload.planningYear or 0) or None
    forecast_type = payload.forecastType or ("budget" if planning_year else "")

    if not planning_year or not payload.coverageStartDate or not payload.coverageEndDate:
        return CoverageWindow(
            planning_year=None,
            forecast_type="",
            start_date=None,
            end_date=None,
            start_month_index=0,
            expected_month_count=0,
            plan_aligned=False,
        )

    start_date = _parse_date(payload.coverageStartDate, "coverageStartDate")
    end_date = _parse_date(payload.coverageEndDate, "coverageEndDate")

    if start_date > end_date:
        raise ValueError("coverageStartDate must be on or before coverageEndDate.")

    if start_date.year != planning_year or end_date.year != planning_year:
        raise ValueError("Forecast coverage must stay inside the selected planning year.")

    if forecast_type == "budget":
        expected_start = pd.Timestamp(year=planning_year, month=1, day=1)
        expected_end = pd.Timestamp(year=planning_year, month=12, day=31)
        if start_date != expected_start or end_date != expected_end:
            raise ValueError("Budget forecasts must cover January 1 through December 31 of the plan year.")
    elif forecast_type == "reforecast":
        expected_end = pd.Timestamp(year=planning_year, month=12, day=31)
        if start_date.day != 1 or end_date != expected_end:
            raise ValueError("Reforecasts must start on the first day of a month and end on December 31 of the plan year.")
    else:
        raise ValueError("forecastType must be budget or reforecast when using plan-aligned coverage.")

    expected_month_count = (end_date.month - start_date.month) + 1

    return CoverageWindow(
        planning_year=planning_year,
        forecast_type=forecast_type,
        start_date=start_date,
        end_date=end_date,
        start_month_index=start_date.month - 1,
        expected_month_count=expected_month_count,
        plan_aligned=True,
    )


def _build_history_frame(payload: ForecastRunRequest) -> pd.DataFrame:
    frame = pd.DataFrame(
        [
            {
                "ds": _parse_date(row.ds, "history.ds"),
                "y": float(row.y),
                "cap": float(row.cap) if row.cap is not None else None,
                "floor": float(row.floor) if row.floor is not None else None,
                "holiday_label": row.holidayLabel.strip(),
            }
            for row in payload.history
        ]
    )

    if frame.empty:
        raise ValueError("history must contain at least one row.")

    return frame.sort_values("ds").reset_index(drop=True)


def _apply_logistic_bounds(
    frame: pd.DataFrame,
    config: ForecastModelConfig,
    warnings: list[str],
) -> pd.DataFrame:
    if config.growth != "logistic":
        return frame

    if config.defaultCap is None or config.defaultCap <= 0:
        raise ValueError("defaultCap must be a positive number when logistic growth is enabled.")

    bounded = frame.copy()
    default_floor = float(config.defaultFloor or 0.0)

    bounded["cap"] = bounded["cap"].fillna(float(config.defaultCap))
    bounded["floor"] = bounded["floor"].fillna(default_floor)

    if (bounded["cap"] <= bounded["floor"]).any():
        raise ValueError("Logistic growth requires every cap to be greater than its floor.")

    if (bounded["y"] > bounded["cap"]).any():
        warnings.append(
            "Some historical values exceeded the configured logistic cap and were clipped to keep the model feasible."
        )
        bounded["y"] = bounded[["y", "cap"]].min(axis=1)

    if (bounded["y"] < bounded["floor"]).any():
        warnings.append(
            "Some historical values fell below the configured logistic floor and were clipped to keep the model feasible."
        )
        bounded["y"] = bounded[["y", "floor"]].max(axis=1)

    return bounded


def _prepare_history(payload: ForecastRunRequest) -> PreparedHistory:
    warnings: list[str] = []
    validation_notes: list[str] = []

    frame = _build_history_frame(payload)
    original_observations = len(frame)

    duplicate_count = int(frame.duplicated(subset=["ds"]).sum())
    if duplicate_count > 0:
        raise ValueError(
            "History must contain one row per date. Remove duplicate dates before running a forecast."
        )

    frame = _apply_logistic_bounds(frame, payload.modelConfig, warnings)
    frame = frame.sort_values("ds").reset_index(drop=True)

    if len(frame) < 14:
        raise ValueError("Load at least 14 daily observations before running a forecast.")

    holdout_days = int(payload.modelConfig.holdoutDays or 0)
    if holdout_days > 0 and len(frame) < holdout_days + 14:
        raise ValueError(
            "Use fewer test-set days so at least 14 training days remain."
        )

    if payload.modelConfig.yearlySeasonality.enabled and len(frame) < 365:
        warnings.append(
            "Yearly seasonality is enabled, but the training set contains fewer than 365 daily observations."
        )

    if payload.modelConfig.builtInHolidayCountry:
        validation_notes.append(
            f"Built-in {payload.modelConfig.builtInHolidayCountry} holidays were enabled for this run."
        )

    return PreparedHistory(
        frame=frame,
        warnings=warnings,
        validation_notes=validation_notes,
        original_observations=original_observations,
    )


def _split_training_and_holdout(
    history: pd.DataFrame,
    holdout_days: int,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    if holdout_days <= 0:
        return history.copy(), history.iloc[0:0].copy()

    return history.iloc[:-holdout_days].copy(), history.iloc[-holdout_days:].copy()


def _build_holiday_frame(
    frame: pd.DataFrame,
    config: ForecastModelConfig,
) -> pd.DataFrame | None:
    holiday_rows: list[dict[str, Any]] = []

    if "holiday_label" in frame.columns:
        for _, row in frame[frame["holiday_label"].astype(str).str.len() > 0].iterrows():
            holiday_rows.append(
                {
                    "holiday": row["holiday_label"],
                    "ds": row["ds"],
                    "lower_window": 0,
                    "upper_window": 0,
                    "prior_scale": float(config.holidaysPriorScale),
                }
            )

    for holiday in config.customHolidays:
        holiday_rows.append(
            {
                "holiday": holiday.name,
                "ds": _parse_date(holiday.date, "customHolidays.date"),
                "lower_window": holiday.lowerWindow,
                "upper_window": holiday.upperWindow,
                "prior_scale": float(holiday.priorScale),
            }
        )

    if not holiday_rows:
        return None

    holidays = pd.DataFrame(holiday_rows)
    return holidays.drop_duplicates(subset=["holiday", "ds"]).sort_values(["holiday", "ds"])


def _build_prophet_model(
    config: ForecastModelConfig,
    holidays: pd.DataFrame | None,
    changepoints: list[pd.Timestamp] | None = None,
):
    _require_prophet()
    _configure_prophet_cmdstan()

    try:
        model = Prophet(
            growth=config.growth,
            weekly_seasonality=False,
            yearly_seasonality=False,
            daily_seasonality=False,
            seasonality_mode=config.seasonalityMode,
            interval_width=float(config.intervalWidth),
            changepoint_prior_scale=float(config.changepointPriorScale),
            changepoint_range=float(config.changepointRange),
            n_changepoints=int(config.changepointCount),
            changepoints=changepoints or None,
            holidays=holidays,
            holidays_prior_scale=float(config.holidaysPriorScale),
            mcmc_samples=int(config.mcmcSamples),
        )
    except Exception as error:
        raise RuntimeError(
            "Forecasting backend could not initialize Prophet. Verify that CmdStan is installed and compatible with the active Python environment."
        ) from error

    if config.builtInHolidayCountry:
        model.add_country_holidays(country_name=config.builtInHolidayCountry)

    if config.weeklySeasonality.enabled:
        model.add_seasonality(
            name="weekly",
            period=7,
            fourier_order=int(config.weeklySeasonality.fourierOrder),
            prior_scale=float(config.weeklySeasonality.priorScale),
            mode=config.seasonalityMode,
        )

    if config.yearlySeasonality.enabled:
        model.add_seasonality(
            name="yearly",
            period=365.25,
            fourier_order=int(config.yearlySeasonality.fourierOrder),
            prior_scale=float(config.yearlySeasonality.priorScale),
            mode=config.seasonalityMode,
        )

    if config.monthlySeasonality.enabled:
        model.add_seasonality(
            name="monthly",
            period=float(config.monthlySeasonality.periodDays),
            fourier_order=int(config.monthlySeasonality.fourierOrder),
            prior_scale=float(config.monthlySeasonality.priorScale),
            mode=config.seasonalityMode,
        )

    for seasonality in config.customSeasonalities:
        model.add_seasonality(
            name=seasonality.name,
            period=float(seasonality.periodDays),
            fourier_order=int(seasonality.fourierOrder),
            prior_scale=float(seasonality.priorScale),
            mode=seasonality.mode,
        )

    return model


def _build_model_frame(frame: pd.DataFrame, growth: str) -> pd.DataFrame:
    columns = ["ds", "y"]

    if growth == "logistic":
        columns.extend(["cap", "floor"])

    return frame[columns].copy()


def _build_future_frame(
    model,
    history_frame: pd.DataFrame,
    config: ForecastModelConfig,
    periods: int,
) -> pd.DataFrame:
    future = model.make_future_dataframe(periods=periods, freq="D", include_history=True)

    if config.growth == "logistic":
        history_bounds = history_frame[["ds", "cap", "floor"]].copy()
        future = future.merge(history_bounds, on="ds", how="left")
        future["cap"] = future["cap"].fillna(float(config.defaultCap or 0))
        future["floor"] = future["floor"].fillna(float(config.defaultFloor or 0))

    return future


def _parse_manual_changepoints(changepoints: list[str]) -> list[pd.Timestamp] | None:
    if not changepoints:
        return None

    return [_parse_date(value, "manualChangepoints") for value in changepoints]


def _compute_holdout_metrics(
    history: pd.DataFrame,
    payload: ForecastRunRequest,
) -> dict[str, float | int] | None:
    holdout_days = int(payload.modelConfig.holdoutDays or 0)
    if holdout_days <= 0:
        return None

    training, holdout = _split_training_and_holdout(history, holdout_days)
    holidays = _build_holiday_frame(training, payload.modelConfig)
    model = _build_prophet_model(
        payload.modelConfig,
        holidays=holidays,
        changepoints=_parse_manual_changepoints(payload.modelConfig.manualChangepoints),
    )
    model.fit(_build_model_frame(training, payload.modelConfig.growth))

    holdout_future = holdout[["ds"]].copy()
    if payload.modelConfig.growth == "logistic":
        holdout_future["cap"] = holdout["cap"].fillna(float(payload.modelConfig.defaultCap or 0))
        holdout_future["floor"] = holdout["floor"].fillna(float(payload.modelConfig.defaultFloor or 0))

    holdout_forecast = model.predict(holdout_future)
    merged = holdout[["ds", "y"]].merge(
        holdout_forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]],
        on="ds",
        how="left",
    )
    absolute_error = (merged["y"] - merged["yhat"]).abs()
    squared_error = (merged["y"] - merged["yhat"]) ** 2
    signed_error = merged["yhat"] - merged["y"]
    safe_actual = merged["y"].replace(0, pd.NA)
    percentage_error = ((absolute_error / safe_actual) * 100).dropna()
    total_actual = float(merged["y"].sum())
    interval_hit = (
        (merged["y"] >= merged["yhat_lower"]) & (merged["y"] <= merged["yhat_upper"])
    ).fillna(False)

    holdout_rows = []
    merged = merged.assign(
        absolute_error=absolute_error,
        signed_error=signed_error,
        percent_error=((absolute_error / safe_actual) * 100),
        within_interval=interval_hit,
    )
    for _, row in merged.iterrows():
        percent_error_value = row.get("percent_error")
        holdout_rows.append(
            {
                "ds": row["ds"].date().isoformat(),
                "actualValue": _safe_float(row["y"], 3),
                "forecastValue": _safe_float(row["yhat"], 3),
                "lowerBound": _safe_float(row["yhat_lower"], 3),
                "upperBound": _safe_float(row["yhat_upper"], 3),
                "absoluteError": _safe_float(row["absolute_error"], 3),
                "signedError": _safe_float(row["signed_error"], 3),
                "percentError": _safe_float(percent_error_value, 3)
                if pd.notna(percent_error_value)
                else None,
                "withinInterval": bool(row["within_interval"]),
            }
        )

    return {
        "holdoutDays": holdout_days,
        "trainingRows": len(training),
        "testRows": len(holdout),
        "trainingDateRange": _date_range_label(training),
        "testDateRange": _date_range_label(holdout),
        "mae": _safe_float(float(absolute_error.mean()), 3),
        "rmse": _safe_float(math.sqrt(float(squared_error.mean())), 3),
        "mape": _safe_float(float(percentage_error.mean()), 3) if not percentage_error.empty else 0.0,
        "wape": _safe_float(float((absolute_error.sum() / total_actual) * 100), 3)
        if total_actual > 0
        else 0.0,
        "bias": _safe_float(float(signed_error.mean()), 3),
        "meanActual": _safe_float(float(merged["y"].mean()), 3),
        "meanForecast": _safe_float(float(merged["yhat"].mean()), 3),
        "intervalCoverage": _safe_float(float(interval_hit.mean() * 100), 3),
        "rows": holdout_rows,
    }


def _build_daily_rows(
    history: pd.DataFrame,
    forecast: pd.DataFrame,
) -> list[dict[str, Any]]:
    history_actuals = {
        row["ds"].date().isoformat(): float(row["y"])
        for _, row in history.iterrows()
    }
    history_cutoff = history["ds"].max()

    rows: list[dict[str, Any]] = []
    for _, row in forecast.iterrows():
        ds_value = row["ds"].date().isoformat()
        rows.append(
            {
                "ds": ds_value,
                "actualValue": _safe_float(history_actuals.get(ds_value), 3)
                if ds_value in history_actuals
                else None,
                "yhat": _safe_float(row.get("yhat"), 3),
                "yhatLower": _safe_float(row.get("yhat_lower"), 3),
                "yhatUpper": _safe_float(row.get("yhat_upper"), 3),
                "isHistory": bool(row["ds"] <= history_cutoff),
            }
        )

    return rows


def _resolve_forecast_periods(
    payload: ForecastRunRequest,
    history: pd.DataFrame,
    coverage_window: CoverageWindow,
) -> int:
    if not coverage_window.plan_aligned or coverage_window.end_date is None:
        return int(payload.forecastHorizonDays)

    history_cutoff = history["ds"].max()
    return max(int((coverage_window.end_date - history_cutoff).days), 0)


def _build_plan_aligned_daily_coverage_frame(
    history: pd.DataFrame,
    forecast: pd.DataFrame,
    coverage_window: CoverageWindow,
) -> pd.DataFrame:
    if not coverage_window.plan_aligned or coverage_window.start_date is None or coverage_window.end_date is None:
        return pd.DataFrame()

    coverage = forecast[
        (forecast["ds"] >= coverage_window.start_date) & (forecast["ds"] <= coverage_window.end_date)
    ].copy()
    if coverage.empty:
        return coverage

    history_actuals = history[["ds", "y"]].rename(columns={"y": "actual"})
    coverage = coverage.merge(history_actuals, on="ds", how="left")
    coverage["is_history_day"] = coverage["actual"].notna()
    coverage["contacts"] = coverage["actual"].where(coverage["is_history_day"], coverage["yhat"])
    coverage["lower_bound_contacts"] = coverage["actual"].where(coverage["is_history_day"], coverage["yhat_lower"])
    coverage["upper_bound_contacts"] = coverage["actual"].where(coverage["is_history_day"], coverage["yhat_upper"])

    return coverage


def _build_plan_aligned_monthly_rollup(coverage: pd.DataFrame) -> list[dict[str, Any]]:
    if coverage.empty:
        return []

    coverage = coverage.copy()
    coverage["month_start"] = coverage["ds"].dt.to_period("M").dt.to_timestamp()
    coverage = coverage.sort_values(["month_start", "ds"])

    peak_day_rows = coverage.loc[
        coverage.groupby("month_start", sort=True)["contacts"].idxmax(),
        ["month_start", "ds"],
    ]
    peak_day_lookup = {
        row["month_start"].date().isoformat(): row["ds"].date().isoformat()
        for _, row in peak_day_rows.iterrows()
    }

    monthly = (
        coverage.groupby("month_start", as_index=False)
        .agg(
            contacts=("contacts", "sum"),
            average_daily_volume=("contacts", "mean"),
            peak_daily_volume=("contacts", "max"),
            lower_bound_contacts=("lower_bound_contacts", "sum"),
            upper_bound_contacts=("upper_bound_contacts", "sum"),
        )
        .sort_values("month_start")
    )

    return [
        {
            "monthStart": row["month_start"].date().isoformat(),
            "monthLabel": row["month_start"].strftime("%b %Y"),
            "contacts": _safe_float(row["contacts"], 2),
            "averageDailyVolume": _safe_float(row["average_daily_volume"], 2),
            "peakDailyDate": peak_day_lookup.get(row["month_start"].date().isoformat(), ""),
            "peakDailyVolume": _safe_float(row["peak_daily_volume"], 2),
            "lowerBoundContacts": _safe_float(row["lower_bound_contacts"], 2),
            "upperBoundContacts": _safe_float(row["upper_bound_contacts"], 2),
        }
        for _, row in monthly.iterrows()
    ]


def _build_monthly_rollup(
    history: pd.DataFrame,
    forecast: pd.DataFrame,
    history_cutoff: pd.Timestamp,
    coverage_window: CoverageWindow,
) -> tuple[list[dict[str, Any]], pd.DataFrame]:
    if coverage_window.plan_aligned:
        coverage = _build_plan_aligned_daily_coverage_frame(history, forecast, coverage_window)
        return _build_plan_aligned_monthly_rollup(coverage), coverage

    future = forecast[forecast["ds"] > history_cutoff].copy()
    if future.empty:
        return [], future

    future["month_start"] = future["ds"].dt.to_period("M").dt.to_timestamp()
    future = future.sort_values(["month_start", "ds"]).copy()
    peak_day_rows = future.loc[
        future.groupby("month_start", sort=True)["yhat"].idxmax(),
        ["month_start", "ds"],
    ]
    peak_day_lookup = {
        row["month_start"].date().isoformat(): row["ds"].date().isoformat()
        for _, row in peak_day_rows.iterrows()
    }

    monthly = (
        future.groupby("month_start", as_index=False)
        .agg(
            contacts=("yhat", "sum"),
            average_daily_volume=("yhat", "mean"),
            peak_daily_volume=("yhat", "max"),
            lower_bound_contacts=("yhat_lower", "sum"),
            upper_bound_contacts=("yhat_upper", "sum"),
        )
        .sort_values("month_start")
    )

    return ([
        {
            "monthStart": row["month_start"].date().isoformat(),
            "monthLabel": row["month_start"].strftime("%b %Y"),
            "contacts": _safe_float(row["contacts"], 2),
            "averageDailyVolume": _safe_float(row["average_daily_volume"], 2),
            "peakDailyDate": peak_day_lookup.get(row["month_start"].date().isoformat(), ""),
            "peakDailyVolume": _safe_float(row["peak_daily_volume"], 2),
            "lowerBoundContacts": _safe_float(row["lower_bound_contacts"], 2),
            "upperBoundContacts": _safe_float(row["upper_bound_contacts"], 2),
        }
        for _, row in monthly.iterrows()
    ], future)


def _monthly_rollup_matches_coverage_window(
    monthly_rollup: list[dict[str, Any]],
    coverage_window: CoverageWindow,
) -> bool:
    if not coverage_window.plan_aligned:
        return False

    expected_month_starts = [
        pd.Timestamp(
            year=coverage_window.planning_year,
            month=coverage_window.start_month_index + offset + 1,
            day=1,
        ).date().isoformat()
        for offset in range(coverage_window.expected_month_count)
    ]
    actual_month_starts = [row.get("monthStart", "") for row in monthly_rollup]
    return actual_month_starts == expected_month_starts


def _build_components(forecast: pd.DataFrame) -> dict[str, list[dict[str, Any]]]:
    components: dict[str, list[dict[str, Any]]] = {
        "trend": [],
        "weekly": [],
        "yearly": [],
        "monthly": [],
        "holidays": [],
    }

    if "trend" in forecast.columns:
        components["trend"] = [
            {"label": row["ds"].date().isoformat(), "value": _safe_float(row["trend"], 3)}
            for _, row in forecast.iterrows()
        ]

    if "weekly" in forecast.columns:
        weekly = forecast.copy()
        weekly["weekday"] = weekly["ds"].dt.day_name().str.slice(0, 3)
        weekday_order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        weekly_summary = (
            weekly.groupby("weekday", as_index=False)["weekly"]
            .mean()
            .set_index("weekday")
            .reindex(weekday_order)
            .fillna(0)
            .reset_index()
        )
        components["weekly"] = [
            {"label": row["weekday"], "value": _safe_float(row["weekly"], 3)}
            for _, row in weekly_summary.iterrows()
        ]

    if "yearly" in forecast.columns and forecast["yearly"].abs().sum() > 0:
        components["yearly"] = [
            {"label": row["ds"].strftime("%b %d"), "value": _safe_float(row["yearly"], 3)}
            for _, row in forecast.iloc[:: max(1, len(forecast) // 120 or 1)].iterrows()
        ]

    if "monthly" in forecast.columns:
        components["monthly"] = [
            {"label": row["ds"].strftime("%b %d"), "value": _safe_float(row["monthly"], 3)}
            for _, row in forecast.iloc[:: max(1, len(forecast) // 120 or 1)].iterrows()
        ]

    if "holidays" in forecast.columns and forecast["holidays"].abs().sum() > 0:
        holiday_points = forecast[forecast["holidays"].abs() > 0].copy()
        components["holidays"] = [
            {"label": row["ds"].date().isoformat(), "value": _safe_float(row["holidays"], 3)}
            for _, row in holiday_points.iterrows()
        ]

    return components


def _build_summary(
    prepared_history: PreparedHistory,
    forecast: pd.DataFrame,
    monthly_rollup: list[dict[str, Any]],
    coverage_window: CoverageWindow,
    coverage_frame: pd.DataFrame,
    payload: ForecastRunRequest,
) -> dict[str, Any]:
    history_cutoff = prepared_history.frame["ds"].max()
    future = forecast[forecast["ds"] > history_cutoff].copy()
    training_frame, holdout_frame = _split_training_and_holdout(
        prepared_history.frame,
        int(payload.modelConfig.holdoutDays or 0),
    )

    peak_month = max(monthly_rollup, key=lambda item: item["contacts"]) if monthly_rollup else None
    summary_frame = coverage_frame if coverage_window.plan_aligned and not coverage_frame.empty else future
    summary_value_column = "contacts" if coverage_window.plan_aligned and not coverage_frame.empty else "yhat"
    peak_day = (
        summary_frame.loc[summary_frame[summary_value_column].idxmax()]
        if not summary_frame.empty
        else None
    )
    planning_ready = _monthly_rollup_matches_coverage_window(monthly_rollup, coverage_window)

    return {
        "originalObservations": prepared_history.original_observations,
        "observationsUsed": len(prepared_history.frame),
        "historyDateRange": _date_range_label(prepared_history.frame),
        "trainingObservations": len(training_frame),
        "trainingDateRange": _date_range_label(training_frame),
        "testObservations": len(holdout_frame),
        "testDateRange": _date_range_label(holdout_frame),
        "forecastDateRange": (
            f"{summary_frame['ds'].min().date().isoformat()} to {summary_frame['ds'].max().date().isoformat()}"
            if not summary_frame.empty
            else (
                f"{coverage_window.start_date.date().isoformat()} to {coverage_window.end_date.date().isoformat()}"
                if coverage_window.plan_aligned and coverage_window.start_date is not None and coverage_window.end_date is not None
                else ""
            )
        ),
        "forecastHorizonDays": int(payload.forecastHorizonDays),
        "planningYear": coverage_window.planning_year,
        "forecastType": coverage_window.forecast_type or None,
        "coverageStartMonthIndex": coverage_window.start_month_index if coverage_window.plan_aligned else None,
        "coverageStartDate": coverage_window.start_date.date().isoformat()
        if coverage_window.start_date is not None
        else "",
        "coverageEndDate": coverage_window.end_date.date().isoformat()
        if coverage_window.end_date is not None
        else "",
        "planningReady": planning_ready,
        "projectedTotalContacts": _safe_float(sum(row["contacts"] for row in monthly_rollup), 2)
        if monthly_rollup
        else (_safe_float(float(future["yhat"].sum()), 2) if not future.empty else 0.0),
        "peakForecastMonthLabel": peak_month["monthLabel"] if peak_month else "",
        "peakForecastMonthContacts": peak_month["contacts"] if peak_month else 0.0,
        "peakForecastDayDate": peak_day["ds"].date().isoformat() if peak_day is not None else "",
        "peakForecastDayVolume": _safe_float(float(peak_day[summary_value_column]), 2) if peak_day is not None else 0.0,
    }


def run_daily_volume_forecast(payload: ForecastRunRequest) -> dict[str, Any]:
    prepared_history = _prepare_history(payload)
    coverage_window = _resolve_coverage_window(payload)
    holidays = _build_holiday_frame(prepared_history.frame, payload.modelConfig)
    model = _build_prophet_model(
        payload.modelConfig,
        holidays=holidays,
        changepoints=_parse_manual_changepoints(payload.modelConfig.manualChangepoints),
    )

    model.fit(_build_model_frame(prepared_history.frame, payload.modelConfig.growth))

    future = _build_future_frame(
        model,
        prepared_history.frame,
        payload.modelConfig,
        periods=_resolve_forecast_periods(payload, prepared_history.frame, coverage_window),
    )
    forecast = model.predict(future)
    history_cutoff = prepared_history.frame["ds"].max()

    monthly_rollup, coverage_frame = _build_monthly_rollup(
        prepared_history.frame,
        forecast,
        history_cutoff,
        coverage_window,
    )
    diagnostics = {
        "warnings": prepared_history.warnings,
        "validationNotes": prepared_history.validation_notes,
        "holdout": _compute_holdout_metrics(prepared_history.frame, payload),
    }

    return {
        "runAt": pd.Timestamp.now("UTC").isoformat(),
        "dailyForecast": _build_daily_rows(prepared_history.frame, forecast),
        "monthlyRollup": monthly_rollup,
        "components": _build_components(forecast),
        "summary": _build_summary(
            prepared_history,
            forecast,
            monthly_rollup,
            coverage_window,
            coverage_frame,
            payload,
        ),
        "diagnostics": diagnostics,
    }
