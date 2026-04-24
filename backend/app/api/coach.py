from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import current_user_id
from app.db.session import get_db
from app.engine.assembler import build_coach_input
from app.engine.llm_coach import CoachUnavailable, generate_plan, is_configured
from app.schemas.coach import CoachPlan

router = APIRouter(prefix="/coach", tags=["coach"])


@router.get("/status")
def status():
    return {"configured": is_configured()}


@router.get("/plan", response_model=CoachPlan)
def plan(db: Session = Depends(get_db), user_id: int = Depends(current_user_id)):
    try:
        payload = build_coach_input(db, user_id)
        return generate_plan(payload)
    except CoachUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/debug/input")
def debug_input(db: Session = Depends(get_db), user_id: int = Depends(current_user_id)):
    """Surface what we'd send to Claude — useful for validating the assembler."""
    return build_coach_input(db, user_id)
