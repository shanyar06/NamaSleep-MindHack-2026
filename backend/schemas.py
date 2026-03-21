from pydantic import BaseModel, Field
from typing import List, Optional


class PatientInput(BaseModel):
    name: str = "Anonymous"
    age: int = 24
    sleep_duration: float = Field(..., ge=0, le=24)
    awakenings: int = Field(..., ge=0, le=20)
    sleep_efficiency: float = Field(..., ge=0, le=100)
    stress_level: int = Field(..., ge=1, le=10)
    screen_time_before_bed: int = Field(..., ge=0, le=600)
    caffeine_intake: int = Field(..., ge=0, le=10)
    bedtime_consistency: int = Field(..., ge=1, le=10)
    rem_irregularity: float = Field(..., ge=0, le=1)


class AnalysisResponse(BaseModel):
    patient_id: str
    risk_level: str
    risk_score: int
    recommendation_type: str
    doctor_flag: bool
    factors: List[str]
    patient_summary: str
    doctor_summary: str


class DoctorFeedback(BaseModel):
    patient_id: str
    doctor_decision: str  # agree | adjust
    updated_recommendation_type: str
    notes: Optional[str] = ""


class ComparisonResponse(BaseModel):
    patient_id: str
    before: AnalysisResponse
    after: AnalysisResponse