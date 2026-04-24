from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CoachPriorityRec(BaseModel):
    domain: str
    headline: str
    why: str
    action: str
    evidence: str
    expected_impact: str


class CoachRec(BaseModel):
    domain: str
    priority: Literal["critical", "high", "medium", "low"]
    headline: str
    why: str
    action: str
    evidence: str
    expected_impact: str
    time_sensitive: bool
    time_window: str = ""


class CoachPlan(BaseModel):
    generated_at: datetime
    overall_score: int = Field(ge=0, le=100)
    overall_trend: Literal["improving", "stable", "declining"]
    priority_recommendation: CoachPriorityRec
    recommendations: list[CoachRec]
    positives: list[str]
    tonight_checklist: list[str]
    tomorrow_preview: str
    data_gaps: list[str]
    disclaimer: str


# JSON Schema for Anthropic output_config.format — strict subset of JSON Schema
# supported by structured outputs (no min/max, additionalProperties: false
# everywhere, all fields in required).
COACH_OUTPUT_JSON_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "generated_at": {"type": "string"},
        "overall_score": {"type": "integer"},
        "overall_trend": {
            "type": "string",
            "enum": ["improving", "stable", "declining"],
        },
        "priority_recommendation": {
            "type": "object",
            "properties": {
                "domain": {"type": "string"},
                "headline": {"type": "string"},
                "why": {"type": "string"},
                "action": {"type": "string"},
                "evidence": {"type": "string"},
                "expected_impact": {"type": "string"},
            },
            "required": [
                "domain",
                "headline",
                "why",
                "action",
                "evidence",
                "expected_impact",
            ],
            "additionalProperties": False,
        },
        "recommendations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "domain": {"type": "string"},
                    "priority": {
                        "type": "string",
                        "enum": ["critical", "high", "medium", "low"],
                    },
                    "headline": {"type": "string"},
                    "why": {"type": "string"},
                    "action": {"type": "string"},
                    "evidence": {"type": "string"},
                    "expected_impact": {"type": "string"},
                    "time_sensitive": {"type": "boolean"},
                    "time_window": {"type": "string"},
                },
                "required": [
                    "domain",
                    "priority",
                    "headline",
                    "why",
                    "action",
                    "evidence",
                    "expected_impact",
                    "time_sensitive",
                    "time_window",
                ],
                "additionalProperties": False,
            },
        },
        "positives": {"type": "array", "items": {"type": "string"}},
        "tonight_checklist": {"type": "array", "items": {"type": "string"}},
        "tomorrow_preview": {"type": "string"},
        "data_gaps": {"type": "array", "items": {"type": "string"}},
        "disclaimer": {"type": "string"},
    },
    "required": [
        "generated_at",
        "overall_score",
        "overall_trend",
        "priority_recommendation",
        "recommendations",
        "positives",
        "tonight_checklist",
        "tomorrow_preview",
        "data_gaps",
        "disclaimer",
    ],
    "additionalProperties": False,
}
