from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import DbDep, UserIdDep, current_user_id
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
    for m in payload.metrics:
        db.add(
            HealthMetric(
                user_id=payload.user_id,
                timestamp=m.timestamp,
                metric_type=m.metric_type,
                value=m.value,
                source=m.source,
            )
        )
    db.commit()
    update_baselines(db, payload.user_id)
    recompute_all_states(db, payload.user_id)
    return {"status": "ok", "ingested": len(payload.metrics), "synced_at": datetime.utcnow()}
