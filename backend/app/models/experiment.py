from datetime import date

from sqlalchemy import Date, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    hypothesis: Mapped[str] = mapped_column(Text)
    outcome_metric: Mapped[str] = mapped_column(String(32))  # e.g. "hrv"
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    baseline_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    result_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    effect_size: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="active")  # active, completed, cancelled
    context: Mapped[dict] = mapped_column(JSON, default=dict)
