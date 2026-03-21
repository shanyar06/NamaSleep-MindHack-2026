from typing import Dict, List, Tuple
from schemas import PatientInput
from database import weights, thresholds, policy_state


def _normalize_sleep_duration(hours: float) -> float:
    if hours >= 7.0:
        return 0.0
    if hours <= 4.0:
        return 1.0
    return (7.0 - hours) / 3.0


def _normalize_awakenings(count: int) -> float:
    return min(count / 5.0, 1.0)


def _normalize_sleep_efficiency(eff: float) -> float:
    if eff >= 85:
        return 0.0
    if eff <= 55:
        return 1.0
    return (85 - eff) / 30.0


def _normalize_stress(level: int) -> float:
    return (level - 1) / 9.0


def _normalize_screen_time(minutes: int) -> float:
    return min(minutes / 180.0, 1.0)


def _normalize_caffeine(count: int) -> float:
    return min(count / 4.0, 1.0)


def _normalize_bedtime_consistency(score: int) -> float:
    return 1.0 - ((score - 1) / 9.0)


def _normalize_rem_irregularity(score: float) -> float:
    return max(0.0, min(score, 1.0))


def extract_factor_labels(data: PatientInput) -> List[str]:
    factors: List[str] = []

    if data.sleep_duration < 6.0:
        factors.append("short sleep duration")
    if data.awakenings >= 3:
        factors.append("frequent awakenings")
    if data.sleep_efficiency < 75:
        factors.append("poor sleep efficiency")
    if data.stress_level >= 7:
        factors.append("high stress")
    if data.screen_time_before_bed >= 90:
        factors.append("high evening screen time")
    if data.caffeine_intake >= 3:
        factors.append("high caffeine intake")
    if data.bedtime_consistency <= 4:
        factors.append("irregular bedtime pattern")
    if data.rem_irregularity >= 0.6:
        factors.append("elevated REM irregularity")

    return factors


def _clinical_feedback_bonus(data: PatientInput) -> int:
    """
    Add a visible policy bonus when clinician feedback has taught the system
    to escalate earlier for clinically concerning fragmentation patterns.
    """
    bonus = 0
    escalation_bias = policy_state["escalation_bias"]

    if escalation_bias <= 0:
        return 0

    if data.awakenings >= 3 and data.sleep_efficiency < 75:
        bonus += escalation_bias

    if data.sleep_duration < 6.0 and data.stress_level >= 7:
        bonus += 3

    return bonus


def score_patient(data: PatientInput) -> Tuple[int, str, str, bool, List[str]]:
    normalized: Dict[str, float] = {
        "sleep_duration": _normalize_sleep_duration(data.sleep_duration),
        "awakenings": _normalize_awakenings(data.awakenings),
        "sleep_efficiency": _normalize_sleep_efficiency(data.sleep_efficiency),
        "stress_level": _normalize_stress(data.stress_level),
        "screen_time_before_bed": _normalize_screen_time(data.screen_time_before_bed),
        "caffeine_intake": _normalize_caffeine(data.caffeine_intake),
        "bedtime_consistency": _normalize_bedtime_consistency(data.bedtime_consistency),
        "rem_irregularity": _normalize_rem_irregularity(data.rem_irregularity),
    }

    raw_score = sum(normalized[k] * weights[k] for k in normalized)
    risk_score = round(raw_score * 100)

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