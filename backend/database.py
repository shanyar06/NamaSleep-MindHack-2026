import os
from typing import Dict, Any, List
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base
import pandas as pd

# SQLite database file 
DATABASE_URL = "sqlite:///./patients.db"

# create engine 
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# create session - used to talk to the database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

patients: Dict[str, Dict[str, Any]] = {}
feedback_store: List[Dict[str, Any]] = []

policy_state = {
    "escalation_bias": 0,
}

thresholds = {
    "low_max": 34,
    "medium_max": 64,
}


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
LIFESTYLE_PATH = os.path.join(DATA_DIR, "Sleep_health_and_lifestyle_dataset.csv")


def _safe_read_csv(path: str) -> pd.DataFrame:
    if os.path.exists(path):
        return pd.read_csv(path)
    return pd.DataFrame()


def _normalize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    out = df.copy()
    out.columns = [c.strip().lower().replace(" ", "_") for c in out.columns]
    return out


lifestyle_df = _normalize_column_names(_safe_read_csv(LIFESTYLE_PATH))


def get_dataset_summary() -> Dict[str, int]:
    return {
        "lifestyle_rows": len(lifestyle_df),
        "lifestyle_columns": len(lifestyle_df.columns),
    }


def get_reference_cases(limit: int = 5) -> List[Dict[str, Any]]:
    if lifestyle_df.empty:
        return []

    cols = [
        "age",
        "occupation",
        "sleep_duration",
        "quality_of_sleep",
        "physical_activity_level",
        "stress_level",
        "bmi_category",
        "blood_pressure",
        "heart_rate",
        "daily_steps",
        "sleep_disorder",
    ]

    available = [c for c in cols if c in lifestyle_df.columns]
    if not available:
        return []

    subset = lifestyle_df[available].head(limit).copy()
    subset = subset.fillna("None")

    return subset.to_dict(orient="records")