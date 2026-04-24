from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db


def current_user_id() -> int:
    """Placeholder until auth is wired up — see AUTH in README."""
    return settings.demo_user_id


UserIdDep = Depends(current_user_id)
DbDep = Depends(get_db)
