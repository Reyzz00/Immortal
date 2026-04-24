from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class HealthMetricIn(BaseModel):
    timestamp: datetime
    metric_type: str
    value: float
    source: str = "apple_health"


class HealthMetricOut(ORMModel):
    id: int
    timestamp: datetime
    metric_type: str
    value: float
    source: str


class SyncPayload(BaseModel):
    user_id: int = 1
    metrics: list[HealthMetricIn]


class UserStateOut(BaseModel):
    date: date
    sleep_score: float
    stress_score: float
    energy_score: float
    recovery_score: float
    load_score: float
    composite_readiness: float
    hrv_latest: float | None = None
    sleep_hours_latest: float | None = None
    resting_hr_latest: float | None = None
    anomalies: list[str] = []


class RecommendationOut(ORMModel):
    id: int
    timestamp: datetime
    type: str
    message: str
    reasoning: str
    expected_impact: str
    confidence: float
    status: str
    context_json: dict[str, Any]


class CheckInQuestion(BaseModel):
    key: str
    prompt: str
    kind: str  # "scale" | "boolean" | "choice"
    choices: list[str] | None = None
    reason: str  # why this is being asked right now


class CheckInPrompt(BaseModel):
    generated_at: datetime
    questions: list[CheckInQuestion]


class CheckInSubmit(BaseModel):
    user_id: int = 1
    answers: dict[str, Any]
    questions_asked: list[CheckInQuestion]


class ExperimentIn(BaseModel):
    user_id: int = 1
    name: str
    hypothesis: str
    outcome_metric: str
    duration_days: int = 7


class ExperimentOut(ORMModel):
    id: int
    name: str
    hypothesis: str
    outcome_metric: str
    start_date: date
    end_date: date
    baseline_value: float | None
    result_value: float | None
    effect_size: float | None
    status: str


class InsightOut(BaseModel):
    id: str
    title: str
    body: str
    kind: str  # "trend" | "anomaly" | "correlation" | "win"
    confidence: float


class TrendPoint(BaseModel):
    date: date
    value: float


class TrendSeries(BaseModel):
    metric_type: str
    baseline: float | None
    points: list[TrendPoint]
