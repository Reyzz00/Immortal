"""Evidence-grounded recommendation engine backed by Claude.

Architecture notes:
- System prompt lives in `app/prompts/longevity_coach.py` and is cached via
  Anthropic prompt caching (`cache_control: ephemeral`). The prompt is ~8K
  tokens and invariant across users, so the first call in a 5-minute window
  pays full price and the rest read at ~10%.
- Claude Opus 4.7 with adaptive thinking + effort="high". The task is
  intelligence-sensitive (citation accuracy, priority logic) but not
  agentic/coding, so `high` rather than `xhigh`.
- Output is constrained via `output_config.format.json_schema` so the model
  cannot deviate from the Pydantic shape.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import anthropic
from anthropic import APIError, APIStatusError

from app.core.config import settings
from app.prompts.longevity_coach import SYSTEM_PROMPT
from app.schemas.coach import COACH_OUTPUT_JSON_SCHEMA, CoachPlan


class CoachUnavailable(Exception):
    """Raised when the LLM path cannot be used (missing key, upstream error)."""


_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        if not settings.anthropic_api_key:
            raise CoachUnavailable(
                "ANTHROPIC_API_KEY is not set. Configure it in backend/.env to enable the coach."
            )
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
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
    """Call Claude and return a validated CoachPlan.

    Raises CoachUnavailable on missing key or upstream errors the caller
    should surface as 503 rather than 500.
    """
    client = _get_client()
    user_msg = _format_user_message(payload)

    try:
        response = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=8192,
            thinking={"type": "adaptive"},
            output_config={
                "effort": "high",
                "format": {"type": "json_schema", "schema": COACH_OUTPUT_JSON_SCHEMA},
            },
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_msg}],
        )
    except APIStatusError as e:
        raise CoachUnavailable(f"Claude API {e.status_code}: {e.message}") from e
    except APIError as e:
        raise CoachUnavailable(f"Claude API error: {e}") from e

    if response.stop_reason == "refusal":
        raise CoachUnavailable(
            "The model declined to answer this request. Try adjusting the check-in inputs."
        )

    text_block = next((b for b in response.content if b.type == "text"), None)
    if text_block is None:
        raise CoachUnavailable("Claude returned no text block.")

    try:
        raw = json.loads(text_block.text)
    except json.JSONDecodeError as e:
        raise CoachUnavailable(f"Claude returned malformed JSON: {e}") from e

    # The schema guarantees a `generated_at` string; force it to the server time
    # so we don't drift if the model fills in a different ISO timestamp.
    raw["generated_at"] = datetime.utcnow().isoformat()

    try:
        return CoachPlan.model_validate(raw)
    except Exception as e:  # pydantic ValidationError
        raise CoachUnavailable(f"Coach response failed validation: {e}") from e


def is_configured() -> bool:
    return bool(settings.anthropic_api_key)
