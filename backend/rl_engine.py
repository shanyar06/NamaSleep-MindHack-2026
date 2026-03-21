from database import weights

STEP = 0.02


def apply_feedback(doctor_decision: str, updated_recommendation_type: str) -> None:
    """
    Hackathon pseudo-RL:
    - if doctor adjusts toward escalation, increase sensitivity to strong clinical signals
    - if doctor agrees, keep as is
    """
    if doctor_decision == "agree":
        return

    if updated_recommendation_type == "escalate":
        weights["awakenings"] = min(weights["awakenings"] + STEP, 0.35)
        weights["sleep_efficiency"] = min(weights["sleep_efficiency"] + STEP, 0.35)
        weights["stress_level"] = min(weights["stress_level"] + STEP / 2, 0.25)
        weights["screen_time_before_bed"] = max(weights["screen_time_before_bed"] - STEP / 2, 0.03)

    elif updated_recommendation_type == "monitor":
        weights["awakenings"] = max(weights["awakenings"] - STEP / 2, 0.05)
        weights["sleep_efficiency"] = max(weights["sleep_efficiency"] - STEP / 2, 0.05)
        weights["stress_level"] = min(weights["stress_level"] + STEP / 2, 0.25)

    elif updated_recommendation_type == "lifestyle":
        weights["stress_level"] = max(weights["stress_level"] - STEP / 2, 0.05)
        weights["screen_time_before_bed"] = min(weights["screen_time_before_bed"] + STEP / 2, 0.20)