from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import current_user_id
from app.db.session import get_db
from app.engine.experiments import evaluate_all, list_experiments, start_experiment
from app.schemas.common import ExperimentIn, ExperimentOut

router = APIRouter(prefix="/experiments", tags=["experiments"])


@router.get("", response_model=list[ExperimentOut])
def list_all(db: Session = Depends(get_db), user_id: int = Depends(current_user_id)):
    evaluate_all(db, user_id)
    return list_experiments(db, user_id)


@router.post("/start", response_model=ExperimentOut)
def start(payload: ExperimentIn, db: Session = Depends(get_db)):
    return start_experiment(
        db,
        user_id=payload.user_id,
        name=payload.name,
        hypothesis=payload.hypothesis,
        outcome_metric=payload.outcome_metric,
        duration_days=payload.duration_days,
    )
