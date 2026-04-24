"""Compute daily health state: recovery, stress, load, readiness."""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.engine.baselines import get_baseline, z_score
from app.models import DailyUserState, HealthMetric


@dataclass
class DailySnapshot:
    day: date
    hrv: float | None
    sleep_hours: float | None
    resting_hr: float | None
    steps: float | None
    workout_minutes: float | None


def _daily_map(db: Session, user_id: int, days: int = 30) -> dict[date, DailySnapshot]:
    since = datetime.utcnow() - timedelta(days=days)
    rows = db.execute(
        select(HealthMetric.timestamp, HealthMetric.metric_type, HealthMetric.value)
        .where(HealthMetric.user_id == user_id)
        .where(HealthMetric.timestamp >= since)
        .order_by(HealthMetric.timestamp)
    ).all()

    buckets: dict[date, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for ts, metric, value in rows:
        buckets[ts.date()][metric].append(value)

    result: dict[date, DailySnapshot] = {}
    for day, metrics in buckets.items():
        avg = lambda key: (sum(metrics[key]) / len(metrics[key])) if metrics.get(key) else None
        result[day] = DailySnapshot(
            day=day,
            hrv=avg("hrv"),
            sleep_hours=avg("sleep_hours"),
            resting_hr=avg("resting_hr"),
            steps=sum(metrics["steps"]) if metrics.get("steps") else None,
            workout_minutes=sum(metrics["workout_minutes"]) if metrics.get("workout_minutes") else None,
        )
    return result


def _clip01(x: float) -> float:
    return max(0.0, min(1.0, x))


def compute_daily_state(db: Session, user_id: int, day: date, snapshot: DailySnapshot) -> DailyUserState:
    """Score each dimension 0..100."""
    hrv_b = get_baseline(db, user_id, "hrv", 30)
    sleep_b = get_baseline(db, user_id, "sleep_hours", 30)
    rhr_b = get_baseline(db, user_id, "resting_hr", 30)
    load_b = get_baseline(db, user_id, "workout_minutes", 30)

    # Sleep score: 0 at <5h, 100 at >=8h, baseline-adjusted
    sleep_score = 0.0
    if snapshot.sleep_hours is not None:
        raw = _clip01((snapshot.sleep_hours - 5.0) / 3.0) * 100.0
        if sleep_b:
            z = z_score(snapshot.sleep_hours, sleep_b) or 0.0
            raw = _clip01(0.5 + z / 4.0) * 100.0
        sleep_score = raw

    # Load score: workout minutes relative to baseline; 100 at baseline, decays outside
    load_score = 50.0
    if snapshot.workout_minutes is not None and load_b:
        z = z_score(snapshot.workout_minutes, load_b) or 0.0
        load_score = _clip01(0.5 + z / 4.0) * 100.0

    # Stress score: HRV suppression + elevated RHR
    stress_signals = []
    if snapshot.hrv is not None and hrv_b:
        z = z_score(snapshot.hrv, hrv_b)
        if z is not None:
            stress_signals.append(-z)  # lower HRV = higher stress
    if snapshot.resting_hr is not None and rhr_b:
        z = z_score(snapshot.resting_hr, rhr_b)
        if z is not None:
            stress_signals.append(z)  # higher RHR = higher stress
    stress_score = 50.0
    if stress_signals:
        agg = sum(stress_signals) / len(stress_signals)
        stress_score = _clip01(0.5 + agg / 4.0) * 100.0

    # Recovery score: inverse of stress, boosted by sleep
    recovery_score = _clip01(
        0.6 * (1.0 - stress_score / 100.0) + 0.4 * (sleep_score / 100.0)
    ) * 100.0

    # Energy is a soft read; default to weighted average until the user self-reports
    energy_score = 0.6 * recovery_score + 0.4 * sleep_score

    # Composite readiness: recovery weighted high, penalize extreme load
    load_penalty = abs(load_score - 50.0) / 100.0  # 0..0.5
    composite = _clip01(
        0.55 * (recovery_score / 100.0)
        + 0.25 * (sleep_score / 100.0)
        + 0.20 * (1.0 - stress_score / 100.0)
        - 0.10 * load_penalty
    ) * 100.0

    # upsert
    existing = db.execute(
        select(DailyUserState)
        .where(DailyUserState.user_id == user_id)
        .where(DailyUserState.date == day)
    ).scalar_one_or_none()
    if existing:
        existing.sleep_score = sleep_score
        existing.stress_score = stress_score
        existing.energy_score = energy_score
        existing.recovery_score = recovery_score
        existing.load_score = load_score
        existing.composite_readiness = composite
        state = existing
    else:
        state = DailyUserState(
            user_id=user_id,
            date=day,
            sleep_score=sleep_score,
            stress_score=stress_score,
            energy_score=energy_score,
            recovery_score=recovery_score,
            load_score=load_score,
            composite_readiness=composite,
        )
        db.add(state)
    return state


def recompute_all_states(db: Session, user_id: int) -> list[DailyUserState]:
    snapshots = _daily_map(db, user_id, 60)
    states: list[DailyUserState] = []
    for day, snap in sorted(snapshots.items()):
        states.append(compute_daily_state(db, user_id, day, snap))
    db.commit()
    return states


def latest_snapshot(db: Session, user_id: int) -> DailySnapshot | None:
    snapshots = _daily_map(db, user_id, 7)
    if not snapshots:
        return None
    latest_day = max(snapshots.keys())
    return snapshots[latest_day]
