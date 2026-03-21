from database import thresholds, policy_state


def apply_feedback(doctor_decision: str, updated_recommendation_type: str) -> None:
    if doctor_decision == "agree":
        return

    if updated_recommendation_type == "escalate":
        thresholds["medium_max"] = max(thresholds["medium_max"] - 8, 50)
        policy_state["escalation_bias"] = min(policy_state["escalation_bias"] + 12, 20)

    elif updated_recommendation_type == "monitor":
        policy_state["escalation_bias"] = max(policy_state["escalation_bias"] - 2, 0)

    elif updated_recommendation_type == "lifestyle":
        thresholds["medium_max"] = min(thresholds["medium_max"] + 4, 70)
        policy_state["escalation_bias"] = max(policy_state["escalation_bias"] - 4, 0)