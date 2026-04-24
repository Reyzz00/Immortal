"""Evidence-grounded recommendation engine backed by Gemini 2.5 Pro.

Architecture notes:
- System prompt lives in `app/prompts/longevity_coach.py` and is passed via
  `system_instruction`. The prompt is ~8K tokens.
- Model: `gemini-2.5-pro` — highest quality Gemini tier, with built-in
  thinking. The workload is citation-accurate reasoning + strict priority
  logic, which benefits from the thinking budget Gemini 2.5 Pro allocates by
  default.
- Output is constrained via `response_mime_type="application/json"` plus
  `response_schema=CoachPlan` so the model must produce a valid instance of
  our Pydantic schema.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings
from app.prompts.longevity_coach import SYSTEM_PROMPT
from app.schemas.coach import CoachPlan


class CoachUnavailable(Exception):
    """Raised when the LLM path cannot be used (missing key, upstream error)."""


_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.google_api_key:
            raise CoachUnavailable(
                "GOOGLE_API_KEY is not set. Configure it in backend/.env to enable the coach."
            )
        _client = genai.Client(api_key=settings.google_api_key)
    return _client


def _format_user_message(payload: dict[str, Any]) -> str:
    """Wrap the two input JSONs in XML so the model can parse each distinctly."""
    return (
        "<healthkit_data>\n"
        + json.dumps(payload["healthkit"], indent=2)
        + "\n</healthkit_data>\n\n"
        + "<daily_checkin>\n"
        + json.dumps(payload["checkin"], indent=2)
        + "\n</daily_checkin>"
    )


def generate_plan(payload: dict[str, Any]) -> CoachPlan:
    """Call Gemini and return a validated CoachPlan.

    Raises CoachUnavailable on missing key or upstream errors the caller
    should surface as 503 rather than 500.
    """
    client = _get_client()
    user_msg = _format_user_message(payload)

    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=user_msg,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=CoachPlan,
                temperature=0.2,
            ),
        )
    except Exception as e:  # google-genai surfaces a mix of error types
        raise CoachUnavailable(f"Gemini API error: {e}") from e

    # Prefer SDK-parsed instance; fall back to raw JSON when validation on
    # Google's side silently produces a string rather than a typed object.
    plan: CoachPlan | None = getattr(response, "parsed", None)
    if plan is None:
        raw_text = getattr(response, "text", None)
        if not raw_text:
            raise CoachUnavailable("Gemini returned no text — likely a safety block.")
        try:
            plan = CoachPlan.model_validate_json(raw_text)
        except Exception as e:
            raise CoachUnavailable(f"Coach response failed validation: {e}") from e

    # Override generated_at with server time — Gemini sometimes fills a
    # placeholder instead of an actual ISO8601 string.
    plan.generated_at = datetime.utcnow()
    return plan


def is_configured() -> bool:
    return bool(settings.google_api_key)
