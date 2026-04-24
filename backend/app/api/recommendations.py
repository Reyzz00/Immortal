from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user_id
from app.db.session import get_db
from app.engine.recommendations import todays_recommendations
from app.models import Recommendation
from app.schemas.common import RecommendationOut

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/today", response_model=list[RecommendationOut])
def today(
    db: Session = Depends(get_db),
    user_id: int = Depends(current_user_id),
):
    return todays_recommendations(db, user_id)


@router.post("/{rec_id}/accept", response_model=RecommendationOut)
def accept(rec_id: int, db: Session = Depends(get_db)):
    rec = db.get(Recommendation, rec_id)
    if not rec:
        raise HTTPException(404, "Recommendation not found")
    rec.status = "accepted"
    db.commit()
    db.refresh(rec)
    return rec


@router.post("/{rec_id}/ignore", response_model=RecommendationOut)
def ignore(rec_id: int, db: Session = Depends(get_db)):
    rec = db.get(Recommendation, rec_id)
    if not rec:
        raise HTTPException(404, "Recommendation not found")
    rec.status = "ignored"
    db.commit()
    db.refresh(rec)
    return rec
