"""Experiment engine: hypothesis-driven interventions with pre/post effect size."""
from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Experiment, HealthMetric


def _metric_mean(
    db: Session, user_id: int, metric: str, start: date, end: date
) -> float | None:
    rows = db.execute(
        select(HealthMetric.value)
        .where(HealthMetric.user_id == user_id)
        .where(HealthMetric.metric_type == metric)
        .where(HealthMetric.timestamp >= datetime.combine(start, datetime.min.time()))
        .where(HealthMetric.timestamp < datetime.combine(end, datetime.min.time()))
    ).scalars().all()
    if not rows:
        return None
    return sum(rows) / len(rows)


def start_experiment(
    db: Session,
    user_id: int,
    name: str,
    hypothesis: str,
    outcome_metric: str,
    duration_days: int,
) -> Experiment:
    start = date.today()
    end = start + timedelta(days=duration_days)
    baseline_start = start - timedelta(days=duration_days)
    baseline_value = _metric_mean(db, user_id, outcome_metric, baseline_start, start)

    exp = Experiment(
        user_id=user_id,
        name=name,
        hypothesis=hypothesis,
        outcome_metric=outcome_metric,
        start_date=start,
        end_date=end,
        baseline_value=baseline_value,
        status="active",
        context={"duration_days": duration_days},
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp


def evaluate(db: Session, experiment: Experiment) -> Experiment:
    """Compute result + effect size if the experiment window has elapsed."""
    if experiment.status != "active":
        return experiment
    today = date.today()
    if today < experiment.end_date:
        return experiment

    result = _metric_mean(
        db, experiment.user_id, experiment.outcome_metric, experiment.start_date, experiment.end_date
    )
    if result is None:
        experiment.status = "cancelled"
        db.commit()
        return experiment

    baseline = experiment.baseline_value or result
    effect = ((result - baseline) / baseline) if baseline else 0.0
    experiment.result_value = result
    experiment.effect_size = effect
    experiment.status = "completed"
    db.commit()
    return experiment


def evaluate_all(db: Session, user_id: int) -> list[Experiment]:
    rows = (
        db.execute(
            select(Experiment)
            .where(Experiment.user_id == user_id)
            .where(Experiment.status == "active")
        )
        .scalars()
        .all()
    )
    return [evaluate(db, e) for e in rows]


def list_experiments(db: Session, user_id: int) -> list[Experiment]:
    return (
        db.execute(
            select(Experiment)
            .where(Experiment.user_id == user_id)
            .order_by(Experiment.start_date.desc())
        )
        .scalars()
        .all()
    )
