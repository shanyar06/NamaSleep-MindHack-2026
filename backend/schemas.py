from pydantic import BaseModel, Field
from typing import List, Optional


class PatientInput(BaseModel):
    name: str = "Anonymous"

    person_id: Optional[int] = None
    gender: Optional[str] = None
    age: int = Field(..., ge=1, le=120)
    occupation: Optional[str] = None
    city: Optional[str] = "Ottawa"

    sleep_duration: float = Field(..., ge=0, le=24)
    sleep_quality: float = Field(..., ge=1, le=10)
    activity_level: int = Field(..., ge=0, le=100)
    stress_level: int = Field(..., ge=1, le=10)

    bmi_category: Optional[str] = None
    blood_pressure: Optional[str] = None
    heart_rate: Optional[int] = Field(default=None, ge=30, le=220)
    daily_steps: int = Field(..., ge=0, le=100000)

    sleep_disorder: Optional[str] = None


class AnalysisResponse(BaseModel):
    patient_id: str
    risk_level: str
    risk_score: int
    recommendation_type: str
    doctor_flag: bool
    factors: List[str]
    patient_summary: str
    doctor_summary: str
    matched_reference_cases: List[str] = []


class DoctorFeedback(BaseModel):
    patient_id: str
    doctor_decision: str
    updated_recommendation_type: str
    notes: Optional[str] = ""


class ComparisonResponse(BaseModel):
    patient_id: str
    before: AnalysisResponse
    after: AnalysisResponse