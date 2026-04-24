from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user_id
from app.db.session import get_db
from app.engine.baselines import get_baseline
from app.models import DailyUserState, HealthMetric
from app.schemas.common import TrendPoint, TrendSeries

router = APIRouter(prefix="/trends", tags=["trends"])


@router.get("/{metric_type}", response_model=TrendSeries)
def trend(
    metric_type: str,
    days: int = 30,
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
):
    if metric_type in {"readiness", "sleep_score", "recovery_score", "stress_score", "load_score"}:
        since = (datetime.utcnow() - timedelta(days=days)).date()
        col = {
            "readiness": DailyUserState.composite_readiness,
            "sleep_score": DailyUserState.sleep_score,
            "recovery_score": DailyUserState.recovery_score,
            "stress_score": DailyUserState.stress_score,
            "load_score": DailyUserState.load_score,
        }[metric_type]
        rows = db.execute(
            select(DailyUserState.date, col)
            .where(DailyUserState.user_id == user_id)
            .where(DailyUserState.date >= since)
            .order_by(DailyUserState.date)
        ).all()
        points = [TrendPoint(date=d, value=round(v, 1)) for d, v in rows]
        return TrendSeries(metric_type=metric_type, baseline=None, points=points)

    since = datetime.utcnow() - timedelta(days=days)
    rows = db.execute(
        select(HealthMetric.timestamp, HealthMetric.value)
        .where(HealthMetric.user_id == user_id)
        .where(HealthMetric.metric_type == metric_type)
        .where(HealthMetric.timestamp >= since)
        .order_by(HealthMetric.timestamp)
    ).all()
    by_day: dict = defaultdict(list)
    for ts, v in rows:
        by_day[ts.date()].append(v)
    points = [
        TrendPoint(date=d, value=round(sum(vs) / len(vs), 2))
        for d, vs in sorted(by_day.items())
    ]
    baseline = get_baseline(db, user_id, metric_type, 30)
    return TrendSeries(
        metric_type=metric_type,
        baseline=round(baseline.baseline_mean, 2) if baseline else None,
        points=points,
    )
