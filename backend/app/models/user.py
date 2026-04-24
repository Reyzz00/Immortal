from datetime import datetime

from sqlalchemy import DateTime, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    onboarding_profile: Mapped[dict] = mapped_column(JSON, default=dict)
    wearable_type: Mapped[str] = mapped_column(String(32), default="apple_health")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
