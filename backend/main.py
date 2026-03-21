import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas import PatientInput, AnalysisResponse, DoctorFeedback, ComparisonResponse
from database import SessionLocal, engine, patients, feedback_store
import models
from risk_engine import score_patient
from rl_engine import apply_feedback
from llm_service import generate_patient_summary, generate_doctor_summary

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sleep LLM Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def build_analysis(patient_id: str, payload: PatientInput) -> AnalysisResponse:
    risk_score, risk_level, recommendation_type, doctor_flag, factors = score_patient(payload)

    return AnalysisResponse(
        patient_id=patient_id,
        risk_level=risk_level,
        risk_score=risk_score,
        recommendation_type=recommendation_type,
        doctor_flag=doctor_flag,
        factors=factors,
        patient_summary=generate_patient_summary(risk_level, factors, recommendation_type),
        doctor_summary=generate_doctor_summary(risk_level, factors, recommendation_type),
    )


@app.get("/")
def root():
    return {"status": "ok", "service": "sleep-llm-backend"}

@app.get("/favicon.ico HTTP/1.1")
def get_favicon():
    return {"status": "ok"}

# get all patients 
@app.get("/patients")
def get_all_patients():
    session = SessionLocal()
    patients = session.query(models.Patient).all()
    session.close()
    return [
    {
        "id": p.id,
        "gender": p.gender,
        "age": p.age,
        "occupation": p.occupation,
        "sleep_duration": p.sleep_duration,
        "quality_of_sleep": p.quality_of_sleep,
        "physical_activity": p.physical_activity,
        "stress_level": p.stress_level,
        "BMI_category": p.BMI_category,
        "blood_pressure_category": p.blood_pressure_category,
        "heart_rate": p.heart_rate,
        "daily_steps": p.daily_steps,
        "sleep_disorder": p.sleep_disorders,
    }
    for p in patients
    ]

# get single patient by id
@app.get("/patients/{patient_id}")
def get_patient_by_id(patient_id: int):
    session = SessionLocal()
    patient = session.query(models.Patient).filter(models.Patient.id == patient_id).first()
    session.close()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return patient

@app.post("/analyze-patient/{patient_id}", response_model=AnalysisResponse)
def analyze_patient(patient_id: int):
    session = SessionLocal()
    patient = session.query(models.Patient).filter(models.Patient.id == patient_id).first()
    session.close()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    payload = PatientInput(
        gender=patient.gender,
        age=patient.age,
        occupation=patient.occupation,
        sleep_duration=patient.sleep_duration,
        quality_of_sleep=patient.quality_of_sleep,
        physical_activity=patient.physical_activity,
        stress_level=patient.stress_level,
        BMI_category=patient.BMI_category,
        blood_pressure_category=patient.blood_pressure_category,
        heart_rate=patient.heart_rate,
        daily_steps=patient.daily_steps,
        sleep_disorder=patient.sleep_disorders,
    )
    
    analysis = build_analysis(str(patient.id), payload)

    patients[str(patient.id)] = {
        "input": payload.model_dump(),
        "before": analysis.model_dump(),
        "after": None,
        "flagged": analysis.doctor_flag,
    }
    return analysis


@app.get("/patient/{patient_id}")
def get_patient(patient_id: str):
    patient = patients.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@app.get("/patients/flagged")
def get_flagged_patients():
    return [
        {"patient_id": pid, **data["before"]}
        for pid, data in patients.items()
        if data.get("flagged")
    ]


@app.post("/doctor-feedback")
def doctor_feedback(feedback: DoctorFeedback):
    patient = patients.get(feedback.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    feedback_store.append(feedback.model_dump())
    apply_feedback(feedback.doctor_decision, feedback.updated_recommendation_type)

    # Re-run same patient after feedback to simulate improved policy
    original_input = PatientInput(**patient["input"])
    updated = build_analysis(feedback.patient_id, original_input)
    patient["after"] = updated.model_dump()

    return {
        "status": "feedback_applied",
        "patient_id": feedback.patient_id,
        "updated_recommendation": updated.recommendation_type,
        "updated_score": updated.risk_score,
    }


@app.get("/patient/{patient_id}/comparison", response_model=ComparisonResponse)
def get_comparison(patient_id: str):
    patient = patients.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if not patient.get("after"):
        raise HTTPException(status_code=400, detail="No feedback comparison available yet")

    return ComparisonResponse(
        patient_id=patient_id,
        before=AnalysisResponse(**patient["before"]),
        after=AnalysisResponse(**patient["after"]),
    )