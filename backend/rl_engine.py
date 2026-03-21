from database import weights, thresholds, policy_state

STEP_MAJOR = 0.04
STEP_MINOR = 0.02


def apply_feedback(doctor_decision: str, updated_recommendation_type: str) -> None:
    if doctor_decision == "agree":
        return

    if updated_recommendation_type == "escalate":
        weights["awakenings"] = min(weights["awakenings"] + STEP_MAJOR, 0.34)
        weights["sleep_efficiency"] = min(weights["sleep_efficiency"] + STEP_MAJOR, 0.34)
        weights["stress_level"] = min(weights["stress_level"] + STEP_MINOR, 0.24)

        weights["screen_time_before_bed"] = max(weights["screen_time_before_bed"] - 0.01, 0.04)
        weights["caffeine_intake"] = max(weights["caffeine_intake"] - 0.01, 0.03)

        thresholds["medium_max"] = max(thresholds["medium_max"] - 8, 50)
        policy_state["escalation_bias"] = min(policy_state["escalation_bias"] + 12, 20)

    elif updated_recommendation_type == "monitor":
        weights["stress_level"] = min(weights["stress_level"] + STEP_MINOR, 0.22)
        weights["screen_time_before_bed"] = min(weights["screen_time_before_bed"] + STEP_MINOR, 0.14)
        policy_state["escalation_bias"] = max(policy_state["escalation_bias"] - 2, 0)

    elif updated_recommendation_type == "lifestyle":
        weights["stress_level"] = max(weights["stress_level"] - STEP_MINOR, 0.08)
        weights["awakenings"] = max(weights["awakenings"] - STEP_MINOR, 0.14)
        thresholds["medium_max"] = min(thresholds["medium_max"] + 4, 70)
        policy_state["escalation_bias"] = max(policy_state["escalation_bias"] - 4, 0)