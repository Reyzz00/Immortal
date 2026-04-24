from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import current_user_id
from app.db.session import get_db
from app.engine.checkin import generate_prompt, infer_context
from app.models import CheckIn
from app.schemas.common import CheckInPrompt, CheckInSubmit

router = APIRouter(prefix="/checkin", tags=["checkin"])


@router.get("/prompt", response_model=CheckInPrompt)
def prompt(db: Session = Depends(get_db), user_id: int = Depends(current_user_id)):
    return generate_prompt(db, user_id)


@router.post("/submit")
def submit(payload: CheckInSubmit, db: Session = Depends(get_db)):
    inferred = infer_context(payload.answers)
    entry = CheckIn(
        user_id=payload.user_id,
        questions_asked=[q.model_dump() for q in payload.questions_asked],
        answers=payload.answers,
        inferred_context=inferred,
    )
    db.add(entry)
    db.commit()
    return {"status": "ok", "inferred": inferred}
