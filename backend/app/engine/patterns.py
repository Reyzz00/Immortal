"""Detect actionable health patterns from recent state + metrics."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.engine.baselines import get_baseline, z_score
from app.engine.state import latest_snapshot
from app.models import DailyUserState, HealthMetric


@dataclass
class Pattern:
    key: str
    title: str
    detail: str
    severity: float  # 0..1
    evidence: dict


def _recent_daily(db: Session, user_id: int, metric: str, days: int = 7) -> list[float]:
    since = datetime.utcnow() - timedelta(days=days)
    rows = db.execute(
        select(HealthMetric.timestamp, HealthMetric.value)
        .where(HealthMetric.user_id == user_id)
        .where(HealthMetric.metric_type == metric)
        .where(HealthMetric.timestamp >= since)
        .order_by(HealthMetric.timestamp)
    ).all()
    by_day: dict = {}
    for ts, v in rows:
        by_day.setdefault(ts.date(), []).append(v)
    return [sum(v) / len(v) for _, v in sorted(by_day.items())]


def detect(db: Session, user_id: int) -> list[Pattern]:
    out: list[Pattern] = []
    snap = latest_snapshot(db, user_id)
    if snap is None:
        return out

    hrv_b = get_baseline(db, user_id, "hrv", 30)
    sleep_b = get_baseline(db, user_id, "sleep_hours", 30)
    load_b = get_baseline(db, user_id, "workout_minutes", 30)

    hrv_z = z_score(snap.hrv, hrv_b) if snap.hrv is not None else None
    sleep_z = z_score(snap.sleep_hours, sleep_b) if snap.sleep_hours is not None else None
    load_z = z_score(snap.workout_minutes, load_b) if snap.workout_minutes is not None else None

    if hrv_z is not None and hrv_z < -1.0 and sleep_z is not None and sleep_z < -0.5:
        out.append(
            Pattern(
                key="recovery_deficit",
                title="Recovery deficit",
                detail=(
                    f"HRV is {abs(hrv_z):.1f}σ below your 30d baseline and sleep is short — "
                    "your body is asking for rest."
                ),
                severity=min(1.0, (abs(hrv_z) + abs(sleep_z)) / 4),
                evidence={"hrv_z": hrv_z, "sleep_z": sleep_z},
            )
        )

    if hrv_z is not None and hrv_z < -1.0 and load_z is not None and load_z > 0.8:
        out.append(
            Pattern(
                key="overreaching",
                title="Overreaching signal",
                detail=(
                    "Training load has spiked while HRV is suppressed — classic overreaching. "
                    "Consider a deload day."
                ),
                severity=min(1.0, (abs(hrv_z) + load_z) / 4),
                evidence={"hrv_z": hrv_z, "load_z": load_z},
            )
        )

    sleep_series = _recent_daily(db, user_id, "sleep_hours", 7)
    if len(sleep_series) >= 5:
        spread = max(sleep_series) - min(sleep_series)
        if spread > 2.5:
            out.append(
                Pattern(
                    key="circadian_variability",
                    title="Irregular sleep schedule",
                    detail=(
                        f"Your sleep duration varied by {spread:.1f}h in the last week — "
                        "a more consistent bedtime tends to improve next-day HRV."
                    ),
                    severity=min(1.0, spread / 5),
                    evidence={"spread_hours": spread},
                )
            )

    if hrv_z is not None and hrv_z > 1.0:
        out.append(
            Pattern(
                key="peak_readiness",
                title="Peak readiness",
                detail=(
                    f"HRV is {hrv_z:.1f}σ above baseline — a great day for a harder session "
                    "if you've been holding back."
                ),
                severity=min(1.0, hrv_z / 3),
                evidence={"hrv_z": hrv_z},
            )
        )

    return out
