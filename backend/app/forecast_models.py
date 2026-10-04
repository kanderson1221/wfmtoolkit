"""Lightweight request validation shared by the worker and isolated fit process."""

import os
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


def configured_limit(name: str, default: int) -> int:
    value = int(os.environ.get(name, default))
    if value <= 0:
        raise ValueError(f"{name} must be a positive integer")
    return value


MAX_HISTORY_ROWS = configured_limit("WFM_FORECAST_MAX_HISTORY_ROWS", 10000)
MAX_FOURIER_ORDER = configured_limit("WFM_FORECAST_MAX_FOURIER_ORDER", 30)
MAX_TOTAL_FOURIER_ORDER = configured_limit("WFM_FORECAST_MAX_TOTAL_FOURIER_ORDER", 100)
MAX_MODEL_CELLS = configured_limit("WFM_FORECAST_MAX_MODEL_CELLS", 2000000)
MAX_MCMC_SAMPLES = configured_limit("WFM_FORECAST_MAX_MCMC_SAMPLES", 1000)
MAX_CHANGEPOINTS = configured_limit("WFM_FORECAST_MAX_CHANGEPOINTS", 100)


class FiniteModel(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, validate_default=True)


class ForecastHistoryRow(FiniteModel):
    ds: str = Field(min_length=1)
    y: float = Field(ge=0)
    cap: float | None = Field(default=None, ge=0)
    floor: float | None = Field(default=None, ge=0)
    holidayLabel: str = ""


class SeasonalityConfig(FiniteModel):
    enabled: bool = True
    fourierOrder: int = Field(default=min(3, MAX_FOURIER_ORDER), ge=1, le=MAX_FOURIER_ORDER)
    priorScale: float = Field(default=10, gt=0)


class MonthlySeasonalityConfig(SeasonalityConfig):
    periodDays: float = Field(default=30.5, gt=0)


class CustomSeasonalityConfig(FiniteModel):
    name: str = Field(min_length=1)
    periodDays: float = Field(gt=0)
    fourierOrder: int = Field(ge=1, le=MAX_FOURIER_ORDER)
    priorScale: float = Field(gt=0)
    mode: Literal["additive", "multiplicative"] = "additive"


class CustomHolidayConfig(FiniteModel):
    name: str = Field(min_length=1)
    date: str = Field(min_length=1)
    lowerWindow: int = Field(default=0, ge=-30, le=30)
    upperWindow: int = Field(default=0, ge=-30, le=30)
    priorScale: float = Field(default=10, gt=0)


class ForecastModelConfig(FiniteModel):
    growth: Literal["linear", "logistic", "flat"] = "linear"
    defaultCap: float | None = Field(default=None, ge=0)
    defaultFloor: float | None = Field(default=0, ge=0)
    changepointPriorScale: float = Field(default=0.05, gt=0)
    changepointRange: float = Field(default=0.8, gt=0, le=1)
    changepointCount: int = Field(default=min(25, MAX_CHANGEPOINTS), ge=0, le=MAX_CHANGEPOINTS)
    manualChangepoints: list[str] = Field(default_factory=list, max_length=MAX_CHANGEPOINTS)
    seasonalityMode: Literal["additive", "multiplicative"] = "additive"
    weeklySeasonality: SeasonalityConfig = Field(default_factory=SeasonalityConfig)
    yearlySeasonality: SeasonalityConfig = Field(
        default_factory=lambda: SeasonalityConfig(enabled=True, fourierOrder=min(10, MAX_FOURIER_ORDER), priorScale=10)
    )
    monthlySeasonality: MonthlySeasonalityConfig = Field(
        default_factory=lambda: MonthlySeasonalityConfig(enabled=False, periodDays=30.5, fourierOrder=min(5, MAX_FOURIER_ORDER), priorScale=10)
    )
    builtInHolidayCountry: str = ""
    holidaysPriorScale: float = Field(default=10, gt=0)
    customSeasonalities: list[CustomSeasonalityConfig] = Field(default_factory=list, max_length=10)
    customHolidays: list[CustomHolidayConfig] = Field(default_factory=list, max_length=1000)
    intervalWidth: float = Field(default=0.8, gt=0, lt=1)
    mcmcSamples: int = Field(default=0, ge=0, le=MAX_MCMC_SAMPLES)
    holdoutDays: int = Field(default=60, ge=0)


class ForecastRunRequest(FiniteModel):
    timezone: str = "America/New_York"
    forecastHorizonDays: int = Field(default=365, ge=0, le=730)
    planningYear: int | None = Field(default=None, ge=2000, le=2100)
    forecastType: Literal["budget"] | None = None
    coverageStartDate: str = ""
    coverageEndDate: str = ""
    history: list[ForecastHistoryRow] = Field(min_length=1, max_length=MAX_HISTORY_ROWS)
    modelConfig: ForecastModelConfig = Field(default_factory=ForecastModelConfig)

    @model_validator(mode="after")
    def check_model_budget(self):
        config = self.modelConfig
        seasonalities = [config.weeklySeasonality, config.yearlySeasonality, config.monthlySeasonality]
        orders = sum(item.fourierOrder for item in seasonalities if item.enabled)
        orders += sum(item.fourierOrder for item in config.customSeasonalities)
        if orders > MAX_TOTAL_FOURIER_ORDER:
            raise ValueError(f"Combined seasonality order must not exceed {MAX_TOTAL_FOURIER_ORDER}.")
        holiday_features = {
            (holiday.name, offset)
            for holiday in config.customHolidays
            for offset in range(holiday.lowerWindow, holiday.upperWindow + 1)
        }
        holiday_features.update((row.holidayLabel.strip(), 0) for row in self.history if row.holidayLabel.strip())
        changepoints = max(config.changepointCount, len(config.manualChangepoints))
        features = 2 * orders + len(holiday_features) + changepoints + (128 if config.builtInHolidayCountry else 0)
        if features * (len(self.history) + 730) > MAX_MODEL_CELLS:
            raise ValueError("History and seasonality settings exceed the model size limit. Reduce history or seasonality complexity.")
        return self
