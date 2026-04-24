"""Adaptive check-in: questions change based on detected anomalies."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.engine.patterns import detect
from app.schemas.common import CheckInPrompt, CheckInQuestion


_BASELINE_QS = [
    CheckInQuestion(
        key="energy",
        prompt="How's your energy right now?",
        kind="scale",
        reason="baseline",
    ),
    CheckInQuestion(
        key="mood",
        prompt="How's your mood today?",
        kind="scale",
        reason="baseline",
    ),
]


_ANOMALY_QS = {
    "recovery_deficit": [
        CheckInQuestion(
            key="late_caffeine",
            prompt="Did you have caffeine after 2pm yesterday?",
            kind="boolean",
            reason="Recovery is down — caffeine timing is a common driver.",
        ),
        CheckInQuestion(
            key="alcohol",
            prompt="Any alcohol last night?",
            kind="boolean",
            reason="Alcohol suppresses HRV and deep sleep.",
        ),
    ],
    "overreaching": [
        CheckInQuestion(
            key="session_rpe",
            prompt="How hard did yesterday's session feel (1–10)?",
            kind="scale",
            reason="Load spiked; we want to calibrate intensity against your perceived effort.",
        ),
    ],
    "circadian_variability": [
        CheckInQuestion(
            key="bedtime",
            prompt="What time did you actually fall asleep?",
            kind="choice",
            choices=["before 10pm", "10–11pm", "11pm–12am", "after 12am"],
            reason="Your bedtime has been inconsistent this week.",
        ),
        CheckInQuestion(
            key="screens_before_bed",
            prompt="Screens in the 30 min before bed?",
            kind="boolean",
            reason="Short-term contributor to sleep latency.",
        ),
    ],
    "peak_readiness": [
        CheckInQuestion(
            key="session_plan",
            prompt="Do you have a hard session scheduled today?",
            kind="boolean",
            reason="You look primed — we'll note whether you capitalize on it.",
        ),
    ],
}


def generate_prompt(db: Session, user_id: int) -> CheckInPrompt:
    patterns = detect(db, user_id)
    questions: list[CheckInQuestion] = list(_BASELINE_QS)
    seen: set[str] = set(q.key for q in questions)
    for p in sorted(patterns, key=lambda x: -x.severity):
        for q in _ANOMALY_QS.get(p.key, []):
            if q.key not in seen:
                questions.append(q)
                seen.add(q.key)
    # Keep it short — max 5
    questions = questions[:5]
    return CheckInPrompt(generated_at=datetime.utcnow(), questions=questions)


def infer_context(answers: dict) -> dict:
    """Pull out structured signals from free-form answers."""
    inferred: dict = {}
    if answers.get("late_caffeine") is True:
        inferred["caffeine_timing_risk"] = True
    if answers.get("alcohol") is True:
        inferred["alcohol_impact_possible"] = True
    if isinstance(answers.get("session_rpe"), (int, float)) and answers["session_rpe"] >= 8:
        inferred["high_perceived_effort"] = True
    if answers.get("screens_before_bed") is True:
        inferred["blue_light_exposure"] = True
    return inferred
