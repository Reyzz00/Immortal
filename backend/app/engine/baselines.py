"""Rolling baselines + z-score anomaly detection."""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from statistics import mean, pstdev

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import HealthMetric, UserBaseline

METRIC_TYPES = ("hrv", "sleep_hours", "resting_hr", "steps", "workout_minutes")
WINDOWS = (7, 30, 90)


@dataclass
class BaselineReading:
    metric_type: str
    window: int
    mean: float
    std: float


def _daily_series(db: Session, user_id: int, metric_type: str, days: int) -> list[float]:
    since = datetime.utcnow() - timedelta(days=days)
    rows = db.execute(
        select(HealthMetric.timestamp, HealthMetric.value)
        .where(HealthMetric.user_id == user_id)
        .where(HealthMetric.metric_type == metric_type)
        .where(HealthMetric.timestamp >= since)
        .order_by(HealthMetric.timestamp)
    ).all()
    by_day: dict[str, list[float]] = defaultdict(list)
    for ts, value in rows:
        by_day[ts.date().isoformat()].append(value)
    # one value per day (daily mean) — stable for HRV/sleep that vary minute-to-minute
    return [mean(v) for _, v in sorted(by_day.items())]


def update_baselines(db: Session, user_id: int) -> list[BaselineReading]:
    readings: list[BaselineReading] = []
    for metric in METRIC_TYPES:
        for window in WINDOWS:
            series = _daily_series(db, user_id, metric, window)
            if len(series) < 3:
                continue
            m = mean(series)
            s = pstdev(series) or 1e-6
            reading = BaselineReading(metric, window, m, s)
            readings.append(reading)

            existing = db.execute(
                select(UserBaseline)
                .where(UserBaseline.user_id == user_id)
                .where(UserBaseline.metric_type == metric)
                .where(UserBaseline.rolling_window == window)
            ).scalar_one_or_none()
            if existing:
                existing.baseline_mean = m
                existing.baseline_std = s
                existing.updated_at = datetime.utcnow()
            else:
                db.add(
                    UserBaseline(
                        user_id=user_id,
                        metric_type=metric,
                        rolling_window=window,
                        baseline_mean=m,
                        baseline_std=s,
                    )
                )
    db.commit()
    return readings


def get_baseline(
    db: Session, user_id: int, metric_type: str, window: int = 30
) -> UserBaseline | None:
    return db.execute(
        select(UserBaseline)
        .where(UserBaseline.user_id == user_id)
        .where(UserBaseline.metric_type == metric_type)
        .where(UserBaseline.rolling_window == window)
    ).scalar_one_or_none()


def z_score(current: float, baseline: UserBaseline | None) -> float | None:
    if baseline is None or baseline.baseline_std == 0:
        return None
    return (current - baseline.baseline_mean) / baseline.baseline_std
