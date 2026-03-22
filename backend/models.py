from sqlalchemy import Column, Integer, String, DateTime, Numeric
from database import Base

class PatientModel(Base):
    __tablename__ = "patientsModel"

    id = Column(Numeric, primary_key=True, unique=True, index=True)
    gender = Column(String)  # JSON string of the input data
    age = Column(Numeric)  # JSON string of the analysis before feedback
    occupation = Column(String)  # JSON string of the analysis after feedback
    sleep_duration = Column(Numeric, default=0.0)
    quality_of_sleep = Column(Numeric, default=0.0)
    physical_activity = Column(Numeric, default=0.0)
    stress_level = Column(Numeric, default=0.0)
    BMI_category = Column(String)
    blood_pressure_category = Column(String)
    heart_rate = Column(String)
    daily_steps = Column(Numeric, default=0.0)
    sleep_disorders = Column(String)  # JSON string of the flagged conditions
    created_at = Column(DateTime)

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text
from datetime import datetime
from database import Base


# -----------------------------
# PATIENTS TABLE
# -----------------------------
class Patient(Base):
    __tablename__ = "patient"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    age = Column(Integer, nullable=False)
    occupation = Column(String, nullable=True)

    sleep_duration = Column(Float, nullable=False)
    quality_of_sleep = Column(Float, nullable=False)
    physical_activity = Column(Integer, nullable=False)
    stress_level = Column(Integer, nullable=False)

    bmi_category = Column(String, nullable=True)
    blood_pressure_category = Column(String, nullable=True)
    heart_rate = Column(Integer, nullable=True)
    daily_steps = Column(Integer, nullable=False)

    sleep_disorders = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


# -----------------------------
# PATIENT ANALYSIS TABLE
# -----------------------------
class PatientAnalysis(Base):
    __tablename__ = "patient_analysis"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(Integer, nullable=False)

    risk_level = Column(String)
    risk_score = Column(Float)
    recommendation_type = Column(String)
    doctor_flag = Column(Boolean)

    factors = Column(Text)  # store as comma-separated string
    patient_summary = Column(Text)
    doctor_summary = Column(Text)

    matched_reference_cases = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)


# -----------------------------
# DOCTOR FEEDBACK TABLE
# -----------------------------
class DoctorFeedback(Base):
    __tablename__ = "doctor_feedback"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(Integer, nullable=False)

    doctor_decision = Column(String)  # agree / adjust / escalate
    updated_recommendation_type = Column(String)

    notes = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)

class DoctorPatient(Base):
    __tablename__ = "doctor_patients"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, nullable=False)
    patient_id = Column(Integer, nullable=False)


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    specialty = Column(String)
    city = Column(String)
    clinic_name = Column(String)
    phone = Column(String)
    email = Column(String)
    accepting_new_patients = Column(Boolean)


class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer)
    assessment_id = Column(Integer)
    from_doctor_id = Column(Integer)
    to_doctor_id = Column(Integer)
    reason = Column(Text)