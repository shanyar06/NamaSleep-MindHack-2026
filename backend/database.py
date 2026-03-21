import os
from typing import Dict, Any, List
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

LIFESTYLE_PATH = os.path.join(DATA_DIR, "sleep_health_lifestyle.csv")
DIAGNOSES_PATH = os.path.join(DATA_DIR, "sleep_disorder_diagnoses.csv")
APNEA_PATH = os.path.join(DATA_DIR, "sleep_apnea_ecg.csv")


def _safe_read_csv(path: str) -> pd.DataFrame:
    if os.path.exists(path):
        return pd.read_csv(path)
    return pd.DataFrame()


lifestyle_df = _safe_read_csv(LIFESTYLE_PATH)
diagnoses_df = _safe_read_csv(DIAGNOSES_PATH)
apnea_df = _safe_read_csv(APNEA_PATH)

patients: Dict[str, Dict[str, Any]] = {}
feedback_store: List[Dict[str, Any]] = []

weights = {
    "sleep_duration": 0.18,
    "awakenings": 0.22,
    "sleep_efficiency": 0.22,
    "stress_level": 0.14,
    "screen_time_before_bed": 0.08,
    "caffeine_intake": 0.05,
    "bedtime_consistency": 0.06,
    "rem_irregularity": 0.05,
}

thresholds = {
    "low_max": 34,
    "medium_max": 64,
}

policy_state = {
    "escalation_bias": 0,
}


def get_dataset_summary() -> Dict[str, int]:
    return {
        "lifestyle_rows": len(lifestyle_df),
        "diagnoses_rows": len(diagnoses_df),
        "apnea_rows": len(apnea_df),
    }


def _normalize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    df = df.copy()
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    return df


lifestyle_df = _normalize_column_names(lifestyle_df)
diagnoses_df = _normalize_column_names(diagnoses_df)
apnea_df = _normalize_column_names(apnea_df)


def get_reference_cases(limit: int = 5) -> List[Dict[str, Any]]:
    if lifestyle_df.empty:
        return []

    df = lifestyle_df.copy()

    possible_cols = [
        "sleep_duration",
        "stress_level",
        "physical_activity_level",
        "heart_rate",
        "daily_steps",
        "quality_of_sleep",
        "sleep_disorder",
    ]
    available = [c for c in possible_cols if c in df.columns]
    if not available:
        return []

    subset = df[available].head(limit)
    return subset.to_dict(orient="records")