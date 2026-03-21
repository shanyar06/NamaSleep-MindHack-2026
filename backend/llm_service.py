from typing import List


def generate_patient_summary(risk_level: str, factors: List[str]) -> str:
    joined = ", ".join(factors[:4]) if factors else "mild sleep-related variation"
    return (
        f"Your recent sleep patterns suggest {risk_level} insomnia-related risk. "
        f"The strongest contributing factors were {joined}. "
        f"This tool is meant for early support and not a clinical diagnosis."
    )


def generate_doctor_summary(risk_level: str, factors: List[str], recommendation_type: str) -> str:
    joined = ", ".join(factors[:5]) if factors else "limited abnormal indicators"
    return (
        f"Patient flagged as {risk_level} risk. "
        f"Primary indicators: {joined}. "
        f"Current system recommendation: {recommendation_type}."
    )