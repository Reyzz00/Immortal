"""Generate 30 days of synthetic wearable data, seed a user and a sample experiment.

Run:
    python -m scripts.seed
"""
from __future__ import annotations

import math
import random
from datetime import datetime, timedelta

from sqlalchemy import delete

from app.core.config import settings
from app.db.session import Base, SessionLocal, engine
from app.engine.baselines import update_baselines
from app.engine.experiments import start_experiment
from app.engine.recommendations import generate
from app.engine.state import recompute_all_states
from app.models import CheckIn, Experiment, HealthMetric, Recommendation, User, UserBaseline, DailyUserState


DAYS = 30
DEMO_USER_ID = 1


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # wipe existing demo data
        for model in (CheckIn, Experiment, Recommendation, DailyUserState, UserBaseline, HealthMetric, User):
            db.execute(delete(model))
        db.commit()

        user = User(id=DEMO_USER_ID, email="demo@immortal.app", wearable_type="apple_health")
        db.add(user)
        db.commit()

        random.seed(42)
        now = datetime.utcnow().replace(hour=7, minute=0, second=0, microsecond=0)

        for i in range(DAYS, 0, -1):
            day = now - timedelta(days=i - 1)
            # gentle weekly circadian signal + noise
            week_phase = math.sin((i / 7.0) * 2 * math.pi)

            # HRV: mean 58, σ ~6, dip near the end of the window so anomalies are detectable today
            hrv_base = 58 + 3 * week_phase
            if i <= 3:
                hrv_base -= 9  # recent suppression
            hrv = max(30.0, random.gauss(hrv_base, 3.5))

            # Sleep: 7.3h mean, dipping with HRV
            sleep_base = 7.3 + 0.3 * week_phase
            if i == 2:
                sleep_base -= 1.4  # one short night
            if i == 1:
                sleep_base -= 0.6
            sleep_h = max(4.5, random.gauss(sleep_base, 0.4))

            # Resting HR: inverse with HRV
            rhr = max(48.0, random.gauss(62 - 0.2 * (hrv - 58), 2.0))

            # Steps: ~8500/day with variance, weekend dip
            steps = max(1500, random.gauss(8500 + 1200 * week_phase, 1800))

            # Workout minutes: spike near the end for the "overreaching" pattern
            workout_base = 35 if i > 5 else 60 + (10 if i <= 2 else 0)
            workout = max(0, random.gauss(workout_base, 12))

            for metric_type, value in (
                ("hrv", hrv),
                ("sleep_hours", sleep_h),
                ("resting_hr", rhr),
                ("steps", steps),
                ("workout_minutes", workout),
            ):
                db.add(
                    HealthMetric(
                        user_id=DEMO_USER_ID,
                        timestamp=day,
                        metric_type=metric_type,
                        value=float(value),
                        source="seed",
                    )
                )
        db.commit()

        update_baselines(db, DEMO_USER_ID)
        recompute_all_states(db, DEMO_USER_ID)
        recs = generate(db, DEMO_USER_ID)

        # Seed one sample experiment so the screen isn't empty
        start_experiment(
            db,
            user_id=DEMO_USER_ID,
            name="No caffeine after 2pm",
            hypothesis="Cutting afternoon caffeine will raise average HRV by ≥5%.",
            outcome_metric="hrv",
            duration_days=7,
        )

        print(f"Seeded {DAYS} days of data for user {DEMO_USER_ID}")
        print(f"Recommendations generated: {len(recs)}")
        for r in recs:
            print(f"  - [{r.type}] {r.message}  (conf={r.confidence:.2f})")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
