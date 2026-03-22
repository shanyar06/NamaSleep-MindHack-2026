from pydantic import BaseModel
from typing import List, Optional

class PatientInput(BaseModel):
    gender: str
    age: int
    occupation: str
    sleep_duration: float
    quality_of_sleep: int
    physical_activity: int
    stress_level: int
    bmi_category: str
    blood_pressure_category: str
    heart_rate: int
    daily_steps: int
    sleep_disorders: Optional[str]


class AnalysisResponse(BaseModel):
    patient_id: str
    risk_level: str
    risk_score: float
    recommendation_type: str
    doctor_flag: bool
    factors: List[str]
    patient_summary: str
    doctor_summary: str


class DoctorFeedback(BaseModel):
    patient_id: str
    doctor_decision: str
    updated_recommendation_type: str
    notes: Optional[str]


class ComparisonResponse(BaseModel):
    patient_id: str
    before: AnalysisResponse
    after: AnalysisResponse