from typing import List, Tuple, Optional
from schemas import PatientInput
from database import thresholds, policy_state


def _normalize_sleep_duration(hours: float) -> float:
    if hours >= 7.0:
        return 0.0
    if hours <= 4.0:
        return 1.0
    return (7.0 - hours) / 3.0


def _normalize_sleep_quality(q: float) -> float:
    return 1.0 - ((q - 1.0) / 9.0)


def _normalize_stress(level: int) -> float:
    return (level - 1.0) / 9.0


def _normalize_activity(level: int) -> float:
    return max(0.0, min(1.0, 1.0 - (level / 100.0)))


def _normalize_steps(steps: int) -> float:
    if steps >= 8000:
        return 0.0
    return max(0.0, min(1.0, (8000 - steps) / 8000.0))


def _normalize_heart_rate(hr: Optional[int]) -> float:
    if hr is None:
        return 0.0
    if hr <= 60:
        return 0.0
    if hr >= 95:
        return 1.0
    return (hr - 60) / 35.0


def _normalize_bmi_category(bmi: Optional[str]) -> float:
    if not bmi:
        return 0.0
    bmi = bmi.lower().strip()
    if "normal" in bmi:
        return 0.0
    if "overweight" in bmi:
        return 0.5
    if "obese" in bmi:
        return 1.0
    return 0.2


def extract_factor_labels(data: PatientInput) -> List[str]:
    factors: List[str] = []

    if data.sleep_duration <= 6:
        factors.append("short sleep duration")
    if data.quality_of_sleep <= 6:
        factors.append("low sleep quality")
    if data.stress_level >= 7:
        factors.append("high stress")
    if data.physical_activity < 30:
        factors.append("low physical activity")
    if data.daily_steps < 5000:
        factors.append("low daily movement")
    if data.heart_rate is not None and data.heart_rate >= 85:
        factors.append("elevated resting heart rate")
    if data.bmi_category and "overweight" in data.bmi_category.lower():
        factors.append("overweight BMI category")
    if data.bmi_category and "obese" in data.bmi_category.lower():
        factors.append("obesity-related health context")

    return factors


def _clinical_feedback_bonus(data: PatientInput) -> int:
    """
    Add a visible policy bonus when clinician feedback has taught the system
    to escalate earlier for concerning medium-risk patterns.
    """
    escalation_bias = policy_state["escalation_bias"]
    if escalation_bias <= 0:
        return 0

    bonus = 0

    # Sleep-centered escalation
    if data.quality_of_sleep <= 6 and data.stress_level >= 7:
        bonus += escalation_bias

    if data.sleep_duration <= 6 and data.daily_steps < 5000:
        bonus += 4

    # Broader moderate-risk escalation for this dataset
    if data.stress_level >= 7 and data.daily_steps < 5000:
        bonus += escalation_bias

    if data.bmi_category and "overweight" in data.bmi_category.lower() and data.stress_level >= 7:
        bonus += 3

    return bonus


def score_patient(data: PatientInput) -> Tuple[int, str, str, bool, List[str]]:
    score = 0.0
    score += _normalize_sleep_duration(data.sleep_duration) * 28
    score += _normalize_sleep_quality(data.quality_of_sleep) * 28
    score += _normalize_stress(data.stress_level) * 18
    score += _normalize_activity(data.physical_activity) * 10
    score += _normalize_steps(data.daily_steps) * 8
    score += _normalize_heart_rate(data.heart_rate) * 4
    score += _normalize_bmi_category(data.bmi_category) * 4

    risk_score = round(score)
    risk_score += _clinical_feedback_bonus(data)
    risk_score = max(0, min(risk_score, 100))

    factors = extract_factor_labels(data)

    if risk_score <= thresholds["low_max"]:
        risk_level = "low"
        recommendation_type = "lifestyle"
        doctor_flag = False
    elif risk_score <= thresholds["medium_max"]:
        risk_level = "medium"
        recommendation_type = "monitor"
        doctor_flag = True
    else:
        risk_level = "high"
        recommendation_type = "escalate"
        doctor_flag = True

    return risk_score, risk_level, recommendation_type, doctor_flag, factors