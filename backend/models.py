from sqlalchemy import Column, Integer, String, DateTime, Numeric
from database import Base

class Patient(Base):
    __tablename__ = "patients"

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