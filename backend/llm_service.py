import os
from typing import List, Dict
from dotenv import load_dotenv
from openai import OpenAI
from database import get_reference_cases

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL_NAME = "gpt-5.4-mini"


def _format_reference_cases(cases: List[Dict]) -> str:
    if not cases:
        return "No structured reference cases available."
    lines = []
    for i, case in enumerate(cases, start=1):
        lines.append(f"Case {i}: {case}")
    return "\n".join(lines)


def _fallback_patient_summary(risk_level: str, factors: List[str], recommendation_type: str) -> str:
    joined = ", ".join(factors[:3]) if factors else "mild sleep-related variation"

    if recommendation_type == "lifestyle":
        next_step = (
            "Try improving sleep hygiene by keeping a more regular bedtime, reducing evening screen time, "
            "and limiting caffeine later in the day."
        )
    elif recommendation_type == "monitor":
        next_step = (
            "It would be reasonable to monitor these patterns closely over the next several days and seek follow-up if they continue."
        )
    else:
        next_step = (
            "Because these patterns are more concerning, it would be reasonable to discuss them with a healthcare professional."
        )

    return (
        f"Your recent sleep data suggests {risk_level} sleep-related risk, mainly driven by {joined}. "
        f"{next_step} This tool is designed for early support and does not provide a medical diagnosis."
    )


def _fallback_doctor_summary(risk_level: str, factors: List[str], recommendation_type: str) -> str:
    joined = ", ".join(factors[:4]) if factors else "limited abnormal indicators"
    return (
        f"{risk_level.capitalize()}-risk triage result with indicators including {joined}. "
        f"Current recommendation: {recommendation_type}. Output intended for screening support, not diagnosis."
    )


def generate_patient_summary(
    risk_level: str,
    factors: List[str],
    recommendation_type: str
) -> str:
    try:
        factor_text = ", ".join(factors) if factors else "mild sleep-related variation"
        reference_cases = _format_reference_cases(get_reference_cases(limit=3))

        prompt = f"""
You are writing a patient-facing summary for a sleep triage prototype.

Structured result:
- Risk level: {risk_level}
- Recommendation: {recommendation_type}
- Contributing factors: {factor_text}

Reference sleep-health dataset examples:
{reference_cases}

Instructions:
- Write one short paragraph under 90 words
- Calm, supportive, natural language
- No definitive diagnosis
- No scary or alarmist wording
- Mention practical next steps aligned with the recommendation
- Mention that the tool is for screening/early support and not diagnosis
"""

        response = client.responses.create(
            model=MODEL_NAME,
            input=prompt,
        )
        text = response.output_text.strip()
        return text or _fallback_patient_summary(risk_level, factors, recommendation_type)
    except Exception:
        return _fallback_patient_summary(risk_level, factors, recommendation_type)


def generate_doctor_summary(
    risk_level: str,
    factors: List[str],
    recommendation_type: str
) -> str:
    try:
        factor_text = ", ".join(factors) if factors else "limited abnormal indicators"
        reference_cases = _format_reference_cases(get_reference_cases(limit=3))

        prompt = f"""
You are writing a concise clinician-facing summary for a sleep triage prototype.

Structured result:
- Risk level: {risk_level}
- Recommendation: {recommendation_type}
- Indicators: {factor_text}

Reference sleep-health dataset examples:
{reference_cases}

Instructions:
- Keep under 70 words
- Concise, professional tone
- Mention risk indicators and current recommendation
- Do not make definitive diagnosis claims
- Suitable for triage support
"""

        response = client.responses.create(
            model=MODEL_NAME,
            input=prompt,
        )
        text = response.output_text.strip()
        return text or _fallback_doctor_summary(risk_level, factors, recommendation_type)
    except Exception:
        return _fallback_doctor_summary(risk_level, factors, recommendation_type)