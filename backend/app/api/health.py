from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.engine.baselines import update_baselines
from app.engine.state import recompute_all_states
from app.models import HealthMetric
from app.schemas.common import SyncPayload

router = APIRouter(prefix="/health", tags=["health"])


@router.post("/sync")
def sync_metrics(
    payload: SyncPayload,
    db: Session = Depends(get_db),
):
    """
    Idempotent ingest of HealthKit (or any source) samples.

    Repeated syncs are expected — Apple HealthKit anchored queries can re-emit
    samples after edits, and the foreground auto-sync may overlap with manual
    syncs. We dedup on (user_id, timestamp, metric_type, source).
    """
    if not payload.metrics:
        return {"status": "ok", "ingested": 0, "skipped": 0, "synced_at": datetime.utcnow()}

    # Window the existence check to the span of the incoming batch (+/- 1 day
    # margin for clock skew). Avoids scanning the whole table on every sync
    # while still catching every overlap.
    timestamps = [m.timestamp for m in payload.metrics]
    window_start = min(timestamps) - timedelta(days=1)
    window_end = max(timestamps) + timedelta(days=1)

    existing_rows = db.execute(
        select(
            HealthMetric.timestamp,
            HealthMetric.metric_type,
            HealthMetric.source,
        ).where(
            HealthMetric.user_id == payload.user_id,
            HealthMetric.timestamp >= window_start,
            HealthMetric.timestamp <= window_end,
        )
    ).all()
    existing: set[tuple[datetime, str, str]] = {
        (r.timestamp, r.metric_type, r.source) for r in existing_rows
    }

    inserted = 0
    skipped = 0
    for m in payload.metrics:
        key = (m.timestamp, m.metric_type, m.source)
        if key in existing:
            skipped += 1
            continue
        existing.add(key)
        db.add(
            HealthMetric(
                user_id=payload.user_id,
                timestamp=m.timestamp,
                metric_type=m.metric_type,
                value=m.value,
                source=m.source,
            )
        )
        inserted += 1

    db.commit()

    # Only re-compute when something actually changed — saves work on heartbeat
    # syncs that bring back zero new samples.
    if inserted:
        update_baselines(db, payload.user_id)
        recompute_all_states(db, payload.user_id)

    return {
        "status": "ok",
        "ingested": inserted,
        "skipped": skipped,
        "synced_at": datetime.utcnow(),
    }
