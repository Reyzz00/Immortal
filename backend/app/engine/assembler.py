"""Assemble the HealthKit + daily check-in JSON blobs the coach prompt expects.

Pulls from the same time-series + state + check-in tables that power the
dashboard, so the LLM sees the same view of the world the user does.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.engine.baselines import get_baseline
from app.engine.state import latest_snapshot
from app.models import CheckIn, DailyUserState, HealthMetric


def _latest_metric(db: Session, user_id: int, metric_type: str) -> float | None:
    row = db.execute(
        select(HealthMetric.value)
        .where(HealthMetric.user_id == user_id)
        .where(HealthMetric.metric_type == metric_type)
        .order_by(HealthMetric.timestamp.desc())
        .limit(1)
    ).scalar_one_or_none()
    return float(row) if row is not None else None


def _7day_avg(db: Session, user_id: int, metric: str) -> float | None:
    since = datetime.utcnow() - timedelta(days=7)
    rows = db.execute(
        select(HealthMetric.timestamp, HealthMetric.value)
        .where(HealthMetric.user_id == user_id)
        .where(HealthMetric.metric_type == metric)
        .where(HealthMetric.timestamp >= since)
    ).all()
    if not rows:
        return None
    by_day: dict = defaultdict(list)
    for ts, v in rows:
        by_day[ts.date()].append(v)
    daily = [sum(vs) / len(vs) for vs in by_day.values()]
    return sum(daily) / len(daily) if daily else None


def _7day_sum_avg(db: Session, user_id: int, metric: str) -> float | None:
    """Per-day sum (e.g. steps), averaged over 7 days."""
    since = datetime.utcnow() - timedelta(days=7)
    rows = db.execute(
        select(HealthMetric.timestamp, HealthMetric.value)
        .where(HealthMetric.user_id == user_id)
        .where(HealthMetric.metric_type == metric)
        .where(HealthMetric.timestamp >= since)
    ).all()
    if not rows:
        return None
    by_day: dict = defaultdict(float)
    for ts, v in rows:
        by_day[ts.date()] += v
    if not by_day:
        return None
    return sum(by_day.values()) / len(by_day)


def build_healthkit_payload(db: Session, user_id: int) -> dict[str, Any]:
    snap = latest_snapshot(db, user_id)

    hrv_baseline = get_baseline(db, user_id, "hrv", 7)
    sleep_baseline = get_baseline(db, user_id, "sleep_hours", 7)
    rhr_baseline = get_baseline(db, user_id, "resting_hr", 7)

    hrv = snap.hrv if snap else None
    sleep_h = snap.sleep_hours if snap else None
    rhr = snap.resting_hr if snap else None
    steps = snap.steps if snap else None
    workout = snap.workout_minutes if snap else None

    # Cardio fitness bucket from HRV + RHR (rough — real HealthKit gives it directly)
    cardio_level = "Unknown"
    if rhr is not None:
        if rhr < 55:
            cardio_level = "Above Average"
        elif rhr < 65:
            cardio_level = "Average"
        else:
            cardio_level = "Below Average"

    return {
        "sleep": {
            "total_hours": round(sleep_h, 2) if sleep_h else None,
            "sleep_efficiency_pct": None,  # not tracked yet
            "time_in_bed_hours": round(sleep_h * 1.12, 2) if sleep_h else None,  # approx
            "resting_heart_rate_bpm": round(rhr) if rhr else None,
            "hrv_ms": round(hrv, 1) if hrv else None,
            "respiratory_rate": None,
            "bedtime": None,
            "wake_time": None,
            "deep_sleep_minutes": None,
            "rem_sleep_minutes": None,
        },
        "activity": {
            "steps": round(steps) if steps else None,
            "active_energy_kcal": None,
            "exercise_minutes": round(workout) if workout else None,
            "stand_hours": None,
            "vo2max_ml_kg_min": None,
            "walking_speed_m_s": None,
        },
        "heart": {
            "resting_hr_bpm": round(rhr) if rhr else None,
            "hrv_ms": round(hrv, 1) if hrv else None,
            "cardio_fitness_level": cardio_level,
        },
        "body": {"weight_kg": None, "bmi": None, "body_fat_pct": None},
        "nutrition": {"active_energy_kcal": None, "dietary_energy_kcal": None},
        "mindfulness": {"mindful_minutes": 0},
        "trends": {
            "hrv_7day_avg": round(hrv_baseline.baseline_mean, 1) if hrv_baseline else None,
            "resting_hr_7day_avg": round(rhr_baseline.baseline_mean) if rhr_baseline else None,
            "sleep_7day_avg_hours": round(sleep_baseline.baseline_mean, 2) if sleep_baseline else None,
            "steps_7day_avg": round(_7day_sum_avg(db, user_id, "steps") or 0),
            "exercise_min_7day_avg": round(_7day_sum_avg(db, user_id, "workout_minutes") or 0),
        },
    }


def build_checkin_payload(db: Session, user_id: int) -> dict[str, Any]:
    """Pull the latest check-in (within 24h) or return neutral defaults."""
    cutoff = datetime.utcnow() - timedelta(hours=24)
    recent = db.execute(
        select(CheckIn)
        .where(CheckIn.user_id == user_id)
        .where(CheckIn.timestamp >= cutoff)
        .order_by(CheckIn.timestamp.desc())
        .limit(1)
    ).scalar_one_or_none()

    now = datetime.utcnow()
    payload: dict[str, Any] = {
        "subjective_energy": 5,
        "subjective_mood": 5,
        "subjective_stress": 5,
        "muscle_soreness": 3,
        "last_meal_time": None,
        "alcohol_last_24h": False,
        "sunscreen_applied": False,
        "current_time": now.strftime("%H:%M"),
        "sun_exposure_yesterday_mins": 0,
        "supplements_taken": [],
        "notes": "",
    }

    if recent is None:
        payload["notes"] = "No check-in submitted in the last 24 hours."
        return payload

    answers = recent.answers or {}
    payload.update(
        {
            "subjective_energy": _coerce_int(answers.get("energy"), 5),
            "subjective_mood": _coerce_int(answers.get("mood"), 5),
            "subjective_stress": _coerce_int(answers.get("stress"), 5),
            "muscle_soreness": _coerce_int(answers.get("soreness"), 3),
            "alcohol_last_24h": bool(answers.get("alcohol", False)),
            "sunscreen_applied": bool(answers.get("sunscreen", False)),
            "sun_exposure_yesterday_mins": _coerce_int(answers.get("sun_exposure_mins"), 0),
            "supplements_taken": _coerce_list(answers.get("supplements_taken")),
            "notes": str(answers.get("notes", "")),
        }
    )

    bedtime_choice = answers.get("bedtime")
    if isinstance(bedtime_choice, str) and bedtime_choice:
        payload["notes"] = (payload["notes"] + f" Bedtime: {bedtime_choice}.").strip()

    if answers.get("late_caffeine") is True:
        payload["notes"] = (payload["notes"] + " Had caffeine after 2pm yesterday.").strip()
    if answers.get("screens_before_bed") is True:
        payload["notes"] = (payload["notes"] + " Screens in 30 min before bed.").strip()

    return payload


def _coerce_int(v: Any, default: int) -> int:
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def _coerce_list(v: Any) -> list[str]:
    if isinstance(v, list):
        return [str(x) for x in v]
    if isinstance(v, str) and v:
        return [v]
    return []


def build_coach_input(db: Session, user_id: int) -> dict[str, Any]:
    return {
        "healthkit": build_healthkit_payload(db, user_id),
        "checkin": build_checkin_payload(db, user_id),
    }
