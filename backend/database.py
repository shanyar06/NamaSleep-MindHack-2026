from typing import Dict, Any, List

patients: Dict[str, Dict[str, Any]] = {}
feedback_store: List[Dict[str, Any]] = []

# Global weights for pseudo-RL
weights = {
    "sleep_duration": 0.20,
    "awakenings": 0.20,
    "sleep_efficiency": 0.20,
    "stress_level": 0.15,
    "screen_time_before_bed": 0.10,
    "caffeine_intake": 0.05,
    "bedtime_consistency": 0.05,
    "rem_irregularity": 0.05,
}