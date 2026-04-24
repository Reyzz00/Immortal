"""Insights feed: human-readable explanations for the dashboard."""
from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.engine.baselines import get_baseline
from app.engine.patterns import detect
from app.engine.state import latest_snapshot
from app.models import DailyUserState
from app.schemas.common import InsightOut


def _recent_states(db: Session, user_id: int, days: int = 14) -> list[DailyUserState]:
    since = (datetime.utcnow() - timedelta(days=days)).date()
    return (
        db.execute(
            select(DailyUserState)
            .where(DailyUserState.user_id == user_id)
            .where(DailyUserState.date >= since)
            .order_by(DailyUserState.date)
        )
        .scalars()
        .all()
    )


def build_feed(db: Session, user_id: int) -> list[InsightOut]:
    feed: list[InsightOut] = []

    for p in detect(db, user_id):
        feed.append(
            InsightOut(
                id=f"pattern:{p.key}",
                title=p.title,
                body=p.detail,
                kind="anomaly" if p.key != "peak_readiness" else "win",
                confidence=0.5 + 0.4 * p.severity,
            )
        )

    states = _recent_states(db, user_id, 14)
    if len(states) >= 7:
        recent = states[-7:]
        prior = states[-14:-7] if len(states) >= 14 else states[:-7]
        if prior:
            d_readiness = (
                sum(s.composite_readiness for s in recent) / len(recent)
                - sum(s.composite_readiness for s in prior) / len(prior)
            )
            if abs(d_readiness) > 4:
                direction = "up" if d_readiness > 0 else "down"
                feed.append(
                    InsightOut(
                        id="trend:readiness_7v7",
                        title=f"Readiness trending {direction}",
                        body=(
                            f"Your 7-day average readiness is {abs(d_readiness):.1f} points "
                            f"{'higher' if d_readiness > 0 else 'lower'} than the week before."
                        ),
                        kind="trend",
                        confidence=0.65,
                    )
                )

    snap = latest_snapshot(db, user_id)
    hrv_b = get_baseline(db, user_id, "hrv", 30)
    if snap and snap.hrv and hrv_b:
        feed.append(
            InsightOut(
                id="context:hrv_baseline",
                title="HRV snapshot",
                body=(
                    f"Latest HRV is {snap.hrv:.0f} ms vs a 30-day baseline of "
                    f"{hrv_b.baseline_mean:.0f} ms (σ={hrv_b.baseline_std:.1f})."
                ),
                kind="trend",
                confidence=0.8,
            )
        )

    return feed
