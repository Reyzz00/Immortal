from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class HealthMetric(Base):
    """Time-series table. Hypertable candidate in TimescaleDB."""

    __tablename__ = "health_metrics"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)
    metric_type: Mapped[str] = mapped_column(String(32), index=True)  # hrv, sleep, steps, hr, ...
    value: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(32), default="apple_health")

    __table_args__ = (
        Index("ix_metric_user_type_time", "user_id", "metric_type", "timestamp"),
        # Dedup contract: a (user, instant, type, source) tuple is unique.
        # Same instant from the same source can't disagree on value, so we drop
        # repeats on re-sync rather than upsert. See docs/HEALTHKIT.md.
        Index(
            "uq_metric_user_time_type_source",
            "user_id",
            "timestamp",
            "metric_type",
            "source",
            unique=True,
        ),
    )


class DailyUserState(Base):
    __tablename__ = "daily_user_state"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    sleep_score: Mapped[float] = mapped_column(Float, default=0.0)
    stress_score: Mapped[float] = mapped_column(Float, default=0.0)
    energy_score: Mapped[float] = mapped_column(Float, default=0.0)
    recovery_score: Mapped[float] = mapped_column(Float, default=0.0)
    load_score: Mapped[float] = mapped_column(Float, default=0.0)
    composite_readiness: Mapped[float] = mapped_column(Float, default=0.0)

    __table_args__ = (
        Index("ix_state_user_date", "user_id", "date", unique=True),
    )


class UserBaseline(Base):
    __tablename__ = "user_baselines"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    metric_type: Mapped[str] = mapped_column(String(32))
    rolling_window: Mapped[int] = mapped_column(Integer)  # days
    baseline_mean: Mapped[float] = mapped_column(Float)
    baseline_std: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index(
            "ix_baseline_user_metric_window",
            "user_id",
            "metric_type",
            "rolling_window",
            unique=True,
        ),
    )
