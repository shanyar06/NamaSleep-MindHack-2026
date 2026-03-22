import datetime
import uuid
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from models import Patient
from database import SessionLocal, engine, Base

from schemas import PatientInput, AnalysisResponse, DoctorFeedback, ComparisonResponse
from database import (
    patients,
    feedback_store,
    get_dataset_summary,
    get_reference_cases,
    thresholds,
    policy_state,
    save_patient_analysis,
    add_new_patient,
    get_all_patients,
    get_patient_by_id,
    create_new_entry_from_patient,
)
from risk_engine import score_patient
from rl_engine import apply_feedback
from llm_service import generate_patient_summary, generate_doctor_summary
from seed_cases import SEEDED_CASES
from referral_logic import get_specialty_priority
from referral_db import (
    find_ranked_doctors_by_city_and_specialties,
    create_referral,
    assign_patient_to_doctor,
    get_patient_ids_for_doctor,
    doctor_has_patient,
    get_all_doctors,
)


Base.metadata.create_all(bind=engine)
app = FastAPI(title="Sleep LLM Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def to_dict(obj):
    return {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}


class ReferralRequest(BaseModel):
    from_doctor_id: int
    to_doctor_id: int
    reason: str

class AssignmentRequest(BaseModel):
    doctor_id: int
    patient_id: str

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


def _latest_analysis(patient_record: dict):
    return patient_record["after"] if patient_record.get("after") else patient_record["before"]


def _needs_attention(patient_record: dict) -> bool:
    latest = _latest_analysis(patient_record)

    if latest["doctor_flag"]:
        return True

    if latest["risk_level"] == "high":
        return True

    before = patient_record.get("before")
    after = patient_record.get("after")

    if before and after:
        escalation_order = {"lifestyle": 1, "monitor": 2, "escalate": 3}
        if escalation_order.get(after["recommendation_type"], 0) > escalation_order.get(
            before["recommendation_type"], 0
        ):
            return True

    return False


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
        "history": [
            {
                "label": "Current",
                "sleep_duration": data.sleep_duration,
                "quality_of_sleep": data.quality_of_sleep,
                "physical_activity": data.physical_activity,
                "stress_level": data.stress_level,
                "blood_pressure": data.blood_pressure,
                "heart_rate": data.heart_rate,
                "daily_steps": data.daily_steps,
                "risk_score": analysis.risk_score,
                "risk_level": analysis.risk_level,
            }
        ],
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

    # update history with a reviewed version for frontend trends/comparison
    patient.setdefault("history", []).append(
        {
            "label": "After clinician feedback",
            "sleep_duration": original_input.sleep_duration,
            "sleep_quality": original_input.quality_of_sleep,
            "physical_activity": original_input.physical_activity,
            "stress_level": original_input.stress_level,
            "blood_pressure": original_input.blood_pressure,
            "heart_rate": original_input.heart_rate,
            "daily_steps": original_input.daily_steps,
            "risk_score": updated.risk_score,
            "risk_level": updated.risk_level,
        }
    )

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
            "history": [
                {
                    "label": "Current",
                    "sleep_duration": patient.sleep_duration,
                    "sleep_quality": patient.sleep_quality,
                    "activity_level": patient.activity_level,
                    "stress_level": patient.stress_level,
                    "blood_pressure": patient.blood_pressure,
                    "heart_rate": patient.heart_rate,
                    "daily_steps": patient.daily_steps,
                    "risk_score": analysis.risk_score,
                    "risk_level": analysis.risk_level,
                }
            ],
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

# -----------------------------
# CREATE PATIENT
# -----------------------------
@app.post("/patients")
def create_patient(data: PatientInput):
    session = SessionLocal()

    try:
        patient = Patient(**data.dict())
        session.add(patient)
        session.commit()
        session.refresh(patient)

        return {
            "status": "success",
            "patient": to_dict(patient)
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        session.close()


# -----------------------------
# GET ALL PATIENTS
# -----------------------------
@app.get("/patients")
def get_patients():
    session = SessionLocal()

    try:
        patients = session.query(Patient).all()

        return {
            "status": "success",
            "count": len(patients),
            "patients": [to_dict(p) for p in patients]
        }

    finally:
        session.close()


# -----------------------------
# GET PATIENT DETAILS
# -----------------------------
@app.get("/patient/{patient_id}/details")
def get_patient_details(patient_id: int):
    session = SessionLocal()

    try:
        patient = session.query(Patient).filter(Patient.id == patient_id).first()

        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")

        return {
            "status": "success",
            "patient": to_dict(patient)
        }

    finally:
        session.close()


# -----------------------------
# ADD NEW ENTRY (UPDATE)
# -----------------------------
@app.post("/patient/{patient_id}/new-entry")
def add_patient_entry(patient_id: int, data: PatientInput):
    session = SessionLocal()

    try:
        patient = session.query(Patient).filter(Patient.id == patient_id).first()

        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")

        # update existing patient
        for key, value in data.dict().items():
            setattr(patient, key, value)

        patient.created_at = datetime.utcnow()

        session.commit()

        return {
            "status": "success",
            "message": "Patient updated successfully",
            "patient": to_dict(patient)
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        session.close()
# -----------------------------
# DOCTOR DASHBOARD ENDPOINTS
# -----------------------------

@app.get("/doctor/dashboard")
def doctor_dashboard():
    dashboard_rows = []

    for patient_id, record in patients.items():
        latest = _latest_analysis(record)
        patient_input = record["input"]

        dashboard_rows.append(
            {
                "patient_id": patient_id,
                "name": patient_input.get("name", "Unknown"),
                "age": patient_input.get("age"),
                "gender": patient_input.get("gender"),
                "occupation": patient_input.get("occupation"),
                "city": patient_input.get("city", "Ottawa"),
                "risk_level": latest["risk_level"],
                "risk_score": latest["risk_score"],
                "recommendation_type": latest["recommendation_type"],
                "doctor_flag": latest["doctor_flag"],
                "needs_attention": _needs_attention(record),
                "factors": latest["factors"][:4],
            }
        )

    dashboard_rows.sort(
        key=lambda x: (
            not x["needs_attention"],
            {"high": 0, "medium": 1, "low": 2}.get(x["risk_level"], 3),
            -x["risk_score"],
        )
    )

    return {
        "total_patients": len(dashboard_rows),
        "flagged_patients": sum(1 for row in dashboard_rows if row["needs_attention"]),
        "patients": dashboard_rows,
    }


@app.get("/doctor/patient/{patient_id}")
def doctor_patient_detail(patient_id: str):
    patient = patients.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    latest = _latest_analysis(patient)

    latest_feedback = None
    matching_feedback = [f for f in feedback_store if f["patient_id"] == patient_id]
    if matching_feedback:
        latest_feedback = matching_feedback[-1]

    comparison = None
    if patient.get("after"):
        comparison = {
            "before": patient["before"],
            "after": patient["after"],
        }

    return {
        "patient_id": patient_id,
        "profile": patient["input"],
        "latest": latest,
        "history": patient.get("history", []),
        "latest_feedback": latest_feedback,
        "comparison": comparison,
        "needs_attention": _needs_attention(patient),
    }

@app.get("/doctor/{doctor_id}/dashboard")
def doctor_dashboard(doctor_id: int):
    assigned_patient_ids = set(get_patient_ids_for_doctor(doctor_id))

    dashboard_rows = []

    for patient_id, record in patients.items():
        if patient_id not in assigned_patient_ids:
            continue

        latest = _latest_analysis(record)
        patient_input = record["input"]

        dashboard_rows.append(
            {
                "patient_id": patient_id,
                "name": patient_input.get("name", "Unknown"),
                "age": patient_input.get("age"),
                "gender": patient_input.get("gender"),
                "occupation": patient_input.get("occupation"),
                "city": patient_input.get("city", "Ottawa"),
                "risk_level": latest["risk_level"],
                "risk_score": latest["risk_score"],
                "recommendation_type": latest["recommendation_type"],
                "doctor_flag": latest["doctor_flag"],
                "needs_attention": _needs_attention(record),
                "factors": latest["factors"][:4],
            }
        )

    dashboard_rows.sort(
        key=lambda x: (
            not x["needs_attention"],
            {"high": 0, "medium": 1, "low": 2}.get(x["risk_level"], 3),
            -x["risk_score"],
        )
    )

    return {
        "doctor_id": doctor_id,
        "total_patients": len(dashboard_rows),
        "flagged_patients": sum(1 for row in dashboard_rows if row["needs_attention"]),
        "patients": dashboard_rows,
    }

@app.get("/doctor/{doctor_id}/patient/{patient_id}")
def doctor_patient_detail(doctor_id: int, patient_id: str):
    if not doctor_has_patient(doctor_id, patient_id):
        raise HTTPException(status_code=403, detail="This patient is not assigned to this doctor")

    patient = patients.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    latest = _latest_analysis(patient)

    latest_feedback = None
    matching_feedback = [f for f in feedback_store if f["patient_id"] == patient_id]
    if matching_feedback:
        latest_feedback = matching_feedback[-1]

    comparison = None
    if patient.get("after"):
        comparison = {
            "before": patient["before"],
            "after": patient["after"],
        }

    return {
        "doctor_id": doctor_id,
        "patient_id": patient_id,
        "profile": patient["input"],
        "latest": latest,
        "history": patient.get("history", []),
        "latest_feedback": latest_feedback,
        "comparison": comparison,
        "needs_attention": _needs_attention(patient),
    }

@app.post("/doctor/{doctor_id}/patient/{patient_id}/feedback")
def doctor_patient_feedback(doctor_id: int, patient_id: str, feedback: DoctorFeedback):
    if not doctor_has_patient(doctor_id, patient_id):
        raise HTTPException(status_code=403, detail="This patient is not assigned to this doctor")

    patient = patients.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    feedback_store.append(feedback.model_dump())
    apply_feedback(feedback.doctor_decision, feedback.updated_recommendation_type)

    original_input = PatientInput(**patient["input"])
    updated = build_analysis(patient_id, original_input)

    patient["after"] = updated.model_dump()

    patient.setdefault("history", []).append(
        {
            "label": "After clinician feedback",
            "sleep_duration": original_input.sleep_duration,
            "quality_of_life": original_input.quality_of_sleep,
            "physical_activity": original_input.physical_activity,
            "stress_level": original_input.stress_level,
            "blood_pressure_category": original_input.blood_pressure_category,
            "heart_rate": original_input.heart_rate,
            "daily_steps": original_input.daily_steps,
            "sleep_disorders": original_input.sleep_disorders,
            "risk_score": updated.risk_score,
            "risk_level": updated.risk_level,
        }
    )

    return {
        "status": "feedback_applied",
        "doctor_id": doctor_id,
        "patient_id": patient_id,
        "updated_recommendation": updated.recommendation_type,
        "updated_score": updated.risk_score,
    }

# -----------------------------
# REFERRAL ENDPOINTS
# -----------------------------

@app.get("/doctor/{doctor_id}/patient/{patient_id}/recommended-doctors")
def recommended_doctors(doctor_id: int, patient_id: str):
    if not doctor_has_patient(doctor_id, patient_id):
        raise HTTPException(status_code=403, detail="This patient is not assigned to this doctor")

    patient = patients.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    analysis = _latest_analysis(patient)
    risk_level = analysis["risk_level"]
    city = patient["input"].get("city", "Ottawa")

    specialties = get_specialty_priority(risk_level)
    doctors = find_ranked_doctors_by_city_and_specialties(city, specialties, limit=5)

    return {
        "doctor_id": doctor_id,
        "patient_id": patient_id,
        "city": city,
        "risk_level": risk_level,
        "recommended_specialties": specialties,
        "doctors": doctors,
    }


@app.post("/doctor/{doctor_id}/patient/{patient_id}/refer-doctor")
def refer_doctor(doctor_id: int, patient_id: str, payload: ReferralRequest):
    if not doctor_has_patient(doctor_id, patient_id):
        raise HTTPException(status_code=403, detail="This patient is not assigned to this doctor")

    patient = patients.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    latest = _latest_analysis(patient)

    create_referral(
        patient_id=patient_id,
        assessment_id=0,
        from_doctor_id=doctor_id,
        to_doctor_id=payload.to_doctor_id,
        reason=payload.reason,
    )

    return {
        "status": "referral_created",
        "doctor_id": doctor_id,
        "patient_id": patient_id,
        "risk_level": latest["risk_level"],
        "to_doctor_id": payload.to_doctor_id,
    }

@app.post("/doctor/assign-patient")
def assign_patient(payload: AssignmentRequest):
    if payload.patient_id not in patients:
        raise HTTPException(status_code=404, detail="Patient not found")

    assign_patient_to_doctor(payload.doctor_id, payload.patient_id)

    return {
        "status": "assigned",
        "doctor_id": payload.doctor_id,
        "patient_id": payload.patient_id,
    }

@app.get("/doctors")
def list_doctors():
    doctors = get_all_doctors()
    return {
        "count": len(doctors),
        "doctors": doctors,
    }