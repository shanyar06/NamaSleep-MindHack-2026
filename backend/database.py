import os
from typing import Dict, Any, List
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
LIFESTYLE_PATH = os.path.join(DATA_DIR, "Sleep_health_and_lifestyle_dataset.csv")
PATIENTS_PATH = os.path.join(DATA_DIR, "patients.csv")
ANALYSIS_PATH = os.path.join(DATA_DIR, "patient_analysis.csv")

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

patients: Dict[str, Dict[str, Any]] = {}
feedback_store: List[Dict[str, Any]] = []

thresholds = {
    "low_max": 34,
    "medium_max": 64,
}

policy_state = {
    "escalation_bias": 0,
}

def _initialize_patients_csv():
    """Create patients.csv if it doesn't exist"""
    os.makedirs(DATA_DIR, exist_ok=True)
    
    if not os.path.exists(PATIENTS_PATH):
        patients_df = pd.DataFrame(columns=[
            "id", "gender", "age", "occupation", "sleep_duration",
            "quality_of_sleep", "physical_activity", "stress_level",
            "bmi_category", "blood_pressure_category", "heart_rate",
            "daily_steps", "created_at"
        ])
        patients_df.to_csv(PATIENTS_PATH, index=False)


def _initialize_analysis_csv():
    """Create patient_analysis.csv if it doesn't exist"""
    os.makedirs(DATA_DIR, exist_ok=True)
    
    if not os.path.exists(ANALYSIS_PATH):
        analysis_df = pd.DataFrame(columns=[
            "patient_id",
            "risk_level",
            "risk_score",
            "recommendation_type",
            "doctor_flag",
            "factors",
            "patient_summary",
            "doctor_summary",
            "matched_reference_cases",
            "created_at"
        ])
        analysis_df.to_csv(ANALYSIS_PATH, index=False)


#new patient
def add_new_patient(patient_data: Dict[str, Any]) -> bool:
    """Add a new patient to the CSV"""
    try:
        df = pd.read_csv(PATIENTS_PATH) if os.path.exists(PATIENTS_PATH) else pd.DataFrame()
        new_patient = pd.DataFrame([patient_data])
        df = pd.concat([df, new_patient], ignore_index=True)
        df.to_csv(PATIENTS_PATH, index=False)
        return True
    except Exception as e:
        print(f"Error adding patient: {e}")
        return False


def get_all_patients() -> List[Dict[str, Any]]:
    """Retrieve all patients from CSV"""
    if os.path.exists(PATIENTS_PATH):
        df = pd.read_csv(PATIENTS_PATH)
        return df.to_dict(orient="records")
    return []


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
        "created_at",
    ]
    available = [c for c in cols if c in lifestyle_df.columns]
    if not available:
        return []

    subset = lifestyle_df[available].head(limit).copy()
    subset = subset.fillna("None")
    records = subset.to_dict(orient="records")
    for record in records:
        record["created_at"] = str(pd.Timestamp.now())
    return records


def get_patient_by_id(patient_id: str) -> Dict[str, Any]:
    """Retrieve a specific patient by ID"""
    try:
        df = pd.read_csv(PATIENTS_PATH)
        patient = df[df["id"] == patient_id]
        if patient.empty:
            print(f"Patient ID {patient_id} not found.")
            return {}
        return patient.iloc[0].to_dict()
    except Exception as e:
        print(f"Error retrieving patient: {e}")
        return {}


def create_new_entry_from_patient(patient_id: str, new_data: Dict[str, Any]) -> bool:
    """Create a new entry for an existing patient, preserving id, occupation, and age"""
    try:
        existing_patient = get_patient_by_id(patient_id)
        if not existing_patient:
            return False
        
        # Preserve key fields from existing patient
        new_entry = {
            "id": existing_patient.get("id"),
            "occupation": existing_patient.get("occupation"),
            "age": existing_patient.get("age"),
        }
        
        # Merge with new data
        new_entry.update(new_data)
        
        # Add to CSV
        return add_new_patient(new_entry)
    except Exception as e:
        print(f"Error creating new entry: {e}")
        return False


def save_patient_analysis(
    patient_id: str,
    risk_level: str,
    risk_score: float,
    recommendation_type: str,
    doctor_flag: bool,
    factors: List[str],
    patient_summary: str,
    doctor_summary: str,
    matched_reference_cases: List[str]
) -> bool:
    """Save patient analysis results to CSV as a new entry"""
    try:
        df = pd.read_csv(ANALYSIS_PATH) if os.path.exists(ANALYSIS_PATH) else pd.DataFrame()
        
        analysis_data = {
            "patient_id": patient_id,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "recommendation_type": recommendation_type,
            "doctor_flag": doctor_flag,
            "factors": ",".join(factors) if isinstance(factors, list) else factors,
            "patient_summary": patient_summary,
            "doctor_summary": doctor_summary,
            "matched_reference_cases": ",".join(matched_reference_cases),
            "created_at": str(pd.Timestamp.now())
        }
        
        # Always create new patient analysis entry
        new_analysis = pd.DataFrame([analysis_data])
        df = pd.concat([df, new_analysis], ignore_index=True)
        
        df.to_csv(ANALYSIS_PATH, index=False)
        return True
    except Exception as e:
        print(f"Error saving analysis: {e}")
        return False


def get_patient_analysis(patient_id: str) -> List[Dict[str, Any]]:
    """Retrieve all analysis records for a specific patient"""
    try:
        df = pd.read_csv(ANALYSIS_PATH)
        patient_analyses = df[df["patient_id"] == patient_id]
        if patient_analyses.empty:
            return []
        return patient_analyses.to_dict(orient="records")
    except Exception as e:
        print(f"Error retrieving analysis: {e}")
        return []


# Initialize on startup
_initialize_patients_csv()
_initialize_analysis_csv()