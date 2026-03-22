import os
import pandas as pd
from datetime import datetime
from database import SessionLocal, engine
from models import Patient, Base

# create tables
Base.metadata.create_all(bind=engine)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "data", "patients.csv")

def load_patients():
    session = SessionLocal()

    try:
        df = pd.read_csv(CSV_PATH)

        # clean column names
        df.columns = [c.strip().lower() for c in df.columns]

        # get existing IDs to avoid duplicates
        existing_ids = {p.id for p in session.query(Patient.id).all()}

        new_count = 0

        for _, row in df.iterrows():
            if row["id"] in existing_ids:
                continue

            patient = Patient(
                id=int(row["id"]),
                name=row.get("name"),
                gender=row.get("gender"),
                age=int(row.get("age")),
                occupation=row.get("occupation"),
                sleep_duration=float(row.get("sleep_duration")),
                quality_of_sleep=int(row.get("quality_of_sleep")),
                physical_activity=int(row.get("physical_activity")),
                stress_level=int(row.get("stress_level")),
                bmi_category=row.get("bmi_category"),
                blood_pressure_category=row.get("blood_pressure_category"),
                heart_rate=int(row.get("heart_rate")),
                daily_steps=int(row.get("daily_steps")),
                sleep_disorders=row.get("sleep_disorders"),
                created_at=datetime.utcnow()
            )

            session.add(patient)
            new_count += 1

        session.commit()
        print(f"✅ Loaded {new_count} new patients")

    except Exception as e:
        session.rollback()
        print("❌ Error:", e)

    finally:
        session.close()


if __name__ == "__main__":
    load_patients()