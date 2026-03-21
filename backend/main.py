import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

from schemas import PatientInput, AnalysisResponse, DoctorFeedback, ComparisonResponse
from database import patients, feedback_store, get_dataset_summary, get_reference_cases, thresholds, policy_state, add_new_patient, get_all_patients, get_patient_by_id, create_new_entry_from_patient, save_patient_analysis
from risk_engine import score_patient
from rl_engine import apply_feedback
from llm_service import generate_patient_summary, generate_doctor_summary
from seed_cases import SEEDED_CASES

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

    patient_summary = generate_patient_summary(risk_level, factors, recommendation_type)
    doctor_summary = generate_doctor_summary(risk_level, factors, recommendation_type)

    analysis = AnalysisResponse(
        patient_id=patient_id,
        risk_level=risk_level,
        risk_score=risk_score,
        recommendation_type=recommendation_type,
        doctor_flag=doctor_flag,
        factors=factors,
        patient_summary=patient_summary,
        doctor_summary=doctor_summary,
        matched_reference_cases=matched_cases,
    )
    
    # Save analysis to CSV
    save_patient_analysis(
        patient_id=patient_id,
        risk_level=risk_level,
        risk_score=risk_score,
        recommendation_type=recommendation_type,
        doctor_flag=doctor_flag,
        factors=factors,
        patient_summary=patient_summary,
        doctor_summary=doctor_summary,
        matched_reference_cases=matched_cases
    )
    
    return analysis


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


@app.post("/add-patient")
def add_patient(data: PatientInput):
    """Add a new patient to the CSV database"""
    try:
        patient_data = {
            "id": str(uuid.uuid4()),
            "gender": data.gender,
            "age": data.age,
            "occupation": data.occupation,
            "sleep_duration": data.sleep_duration,
            "quality_of_sleep": data.quality_of_sleep,
            "physical_activity": data.physical_activity,
            "stress_level": data.stress_level,
            "bmi_category": data.bmi_category,
            "blood_pressure_category": data.blood_pressure_category,
            "heart_rate": data.heart_rate,
            "daily_steps": data.daily_steps,
            "created_at": str(pd.Timestamp.now()),
        }
        
        if add_new_patient(patient_data):
            return {
                "status": "success",
                "patient_id": patient_data["id"],
                "message": "Patient added to database"
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to add patient")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/patients")
def get_patients():
    """Retrieve all patients from the CSV database"""
    patients_list = get_all_patients()
    return {
        "status": "success",
        "count": len(patients_list),
        "patients": patients_list
    }


@app.post("/patient/{patient_id}/new-entry")
def add_patient_entry(patient_id: str, data: PatientInput):
    """Create a new entry for an existing patient with updated data"""
    try:
        new_data = {
            "gender": data.gender,
            "age": data.age,
            "occupation": data.occupation,
            "sleep_duration": data.sleep_duration,
            "quality_of_sleep": data.quality_of_sleep,
            "physical_activity": data.physical_activity,
            "stress_level": data.stress_level,
            "bmi_category": data.bmi_category,
            "blood_pressure_category": data.blood_pressure_category,
            "heart_rate": data.heart_rate,
            "daily_steps": data.daily_steps,
            "sleep_disorders": "",
            "created_at": str(pd.Timestamp.now()),
        }
        
        if create_new_entry_from_patient(patient_id, new_data):
            return {
                "status": "success",
                "patient_id": patient_id,
                "message": "New entry created for existing patient"
            }
        else:
            raise HTTPException(status_code=404, detail="Patient not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/patient/{patient_id}/details")
def get_patient_details(patient_id: str):
    """Retrieve a specific patient's details from CSV"""
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {
        "status": "success",
        "patient": patient
    }
