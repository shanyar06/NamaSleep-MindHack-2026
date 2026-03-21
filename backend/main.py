import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas import PatientInput, AnalysisResponse, DoctorFeedback, ComparisonResponse
from database import patients, feedback_store, get_dataset_summary, get_reference_cases
from risk_engine import score_patient
from rl_engine import apply_feedback
from llm_service import generate_patient_summary, generate_doctor_summary
from seed_cases import SEEDED_CASES
#from database import patients, feedback_store, get_dataset_summary, get_reference_cases, weights, thresholds

from database import (
    patients,
    feedback_store,
    get_dataset_summary,
    get_reference_cases,
    weights,
    thresholds,
    policy_state,
)

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

    reference_cases = get_reference_cases(limit=3)
    matched_cases = [f"Reference case {i+1}" for i in range(len(reference_cases))]

    return AnalysisResponse(
        patient_id=patient_id,
        risk_level=risk_level,
        risk_score=risk_score,
        recommendation_type=recommendation_type,
        doctor_flag=doctor_flag,
        factors=factors,
        patient_summary=generate_patient_summary(risk_level, factors, recommendation_type),
        doctor_summary=generate_doctor_summary(risk_level, factors, recommendation_type),
        matched_reference_cases=matched_cases,
    )


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "sleep-llm-backend",
        "datasets": get_dataset_summary(),
    }


@app.post("/analyze-patient", response_model=AnalysisResponse)
def analyze_patient(data: PatientInput):
    patient_id = str(uuid.uuid4())
    analysis = build_analysis(patient_id, data)

    patients[patient_id] = {
        "input": data.model_dump(),
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
    flagged = []
    for pid, data in patients.items():
        if data.get("flagged"):
            record = data["before"].copy()
            record["patient_id"] = pid
            flagged.append(record)
    return flagged


@app.post("/doctor-feedback")
def doctor_feedback(feedback: DoctorFeedback):
    patient = patients.get(feedback.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    feedback_store.append(feedback.model_dump())
    apply_feedback(feedback.doctor_decision, feedback.updated_recommendation_type)

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
        raise HTTPException(status_code=400, detail="No comparison available yet")

    return ComparisonResponse(
        patient_id=patient_id,
        before=AnalysisResponse(**patient["before"]),
        after=AnalysisResponse(**patient["after"]),
    )


@app.post("/seed-demo-cases")
def seed_demo_cases():
    seeded_ids = []

    for case in SEEDED_CASES:
        patient = PatientInput(**case)
        patient_id = str(uuid.uuid4())
        analysis = build_analysis(patient_id, patient)

        patients[patient_id] = {
            "input": patient.model_dump(),
            "before": analysis.model_dump(),
            "after": None,
            "flagged": analysis.doctor_flag,
        }
        seeded_ids.append({"patient_id": patient_id, "name": case["name"]})

    return {
        "status": "seeded",
        "cases": seeded_ids,
    }

@app.post("/reset-demo")
def reset_demo():
    patients.clear()
    feedback_store.clear()

    weights.clear()
    weights.update({
        "sleep_duration": 0.18,
        "awakenings": 0.22,
        "sleep_efficiency": 0.22,
        "stress_level": 0.14,
        "screen_time_before_bed": 0.08,
        "caffeine_intake": 0.05,
        "bedtime_consistency": 0.06,
        "rem_irregularity": 0.05,
    })

    thresholds.clear()
    thresholds.update({
        "low_max": 34,
        "medium_max": 64,
    })

    return {"status": "reset_complete"}

@app.post("/reset-demo")
def reset_demo():
    patients.clear()
    feedback_store.clear()

    weights.clear()
    weights.update({
        "sleep_duration": 0.18,
        "awakenings": 0.22,
        "sleep_efficiency": 0.22,
        "stress_level": 0.14,
        "screen_time_before_bed": 0.08,
        "caffeine_intake": 0.05,
        "bedtime_consistency": 0.06,
        "rem_irregularity": 0.05,
    })

    thresholds.clear()
    thresholds.update({
        "low_max": 34,
        "medium_max": 64,
    })

    policy_state.clear()
    policy_state.update({
        "escalation_bias": 0,
    })

    return {"status": "reset_complete"}