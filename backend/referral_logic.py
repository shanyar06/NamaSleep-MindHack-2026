def get_specialty_priority(risk_level: str):
    if risk_level == "high":
        return ["Sleep Specialist", "Neurologist", "Pulmonologist"]
    if risk_level == "medium":
        return ["Sleep Specialist", "Family Physician"]
    return []