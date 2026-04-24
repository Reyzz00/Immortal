"""Turn patterns into ranked, confidence-scored recommendations."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.engine.patterns import Pattern, detect
from app.models import Recommendation


_RULES = {
    "recovery_deficit": {
        "type": "recovery",
        "message": "Take a recovery day — low intensity only.",
        "expected_impact": "HRV rebound within 24–48h",
    },
    "overreaching": {
        "type": "training",
        "message": "Drop intensity by ~40% today; prioritize sleep tonight.",
        "expected_impact": "Reduced overtraining risk over the next 7 days",
    },
    "circadian_variability": {
        "type": "sleep",
        "message": "Fix your bedtime window — aim for a 30-minute band.",
        "expected_impact": "+0.3σ HRV within 2 weeks",
    },
    "peak_readiness": {
        "type": "performance",
        "message": "Green-light day: push on your primary training goal.",
        "expected_impact": "Better session quality with no recovery cost",
    },
}


def generate(db: Session, user_id: int) -> list[Recommendation]:
    patterns: list[Pattern] = detect(db, user_id)
    created: list[Recommendation] = []

    for p in patterns:
        rule = _RULES.get(p.key)
        if not rule:
            continue
        rec = Recommendation(
            user_id=user_id,
            timestamp=datetime.utcnow(),
            type=rule["type"],
            message=rule["message"],
            reasoning=p.detail,
            expected_impact=rule["expected_impact"],
            confidence=0.5 + 0.4 * p.severity,
            status="pending",
            context_json={"pattern": p.key, "evidence": p.evidence},
        )
        db.add(rec)
        created.append(rec)

    if not created:
        # A neutral, evergreen suggestion so the user isn't staring at an empty screen
        rec = Recommendation(
            user_id=user_id,
            timestamp=datetime.utcnow(),
            type="maintenance",
            message="Keep the streak — aim for 7.5h sleep and 10 minutes of morning light.",
            reasoning="No anomalies detected. Reinforce the habits that keep your baseline high.",
            expected_impact="Maintain readiness",
            confidence=0.55,
            context_json={"pattern": "steady_state"},
        )
        db.add(rec)
        created.append(rec)

    db.commit()
    return created


def todays_recommendations(db: Session, user_id: int) -> list[Recommendation]:
    today = datetime.utcnow().date()
    rows = db.execute(
        select(Recommendation)
        .where(Recommendation.user_id == user_id)
        .order_by(Recommendation.timestamp.desc())
    ).scalars().all()
    todays = [r for r in rows if r.timestamp.date() == today]
    if not todays:
        todays = generate(db, user_id)
    return todays
