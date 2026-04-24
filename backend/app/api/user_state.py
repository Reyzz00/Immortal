from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user_id
from app.db.session import get_db
from app.engine.baselines import update_baselines
from app.engine.patterns import detect
from app.engine.state import latest_snapshot, recompute_all_states
from app.models import DailyUserState
from app.schemas.common import UserStateOut

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/state", response_model=UserStateOut)
def get_state(
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
):
    # Always refresh baselines + states on read so the dashboard is never stale.
    update_baselines(db, user_id)
    states = recompute_all_states(db, user_id)
    if not states:
        raise HTTPException(404, "No metrics yet. POST to /health/sync.")

    today = states[-1]
    snap = latest_snapshot(db, user_id)
    anomalies = [p.key for p in detect(db, user_id)]

    return UserStateOut(
        date=today.date,
        sleep_score=round(today.sleep_score, 1),
        stress_score=round(today.stress_score, 1),
        energy_score=round(today.energy_score, 1),
        recovery_score=round(today.recovery_score, 1),
        load_score=round(today.load_score, 1),
        composite_readiness=round(today.composite_readiness, 1),
        hrv_latest=round(snap.hrv, 1) if snap and snap.hrv else None,
        sleep_hours_latest=round(snap.sleep_hours, 2) if snap and snap.sleep_hours else None,
        resting_hr_latest=round(snap.resting_hr, 1) if snap and snap.resting_hr else None,
        anomalies=anomalies,
    )
