from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import current_user_id
from app.db.session import get_db
from app.engine.insights import build_feed
from app.schemas.common import InsightOut

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/feed", response_model=list[InsightOut])
def feed(db: Session = Depends(get_db), user_id: int = Depends(current_user_id)):
    return build_feed(db, user_id)
