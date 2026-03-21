import os
import pandas as pd
from database import SessionLocal, engine, Base
from models import Patient
# ensure tables exist
Base.metadata.create_all(bind=engine)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(
    BASE_DIR,
    "datasets",
    "Sleep_health_and_lifestyle_dataset.csv"
)

print(f"Loading dataset from: {DATASET_PATH}")


def load_csv_to_db():
    session = SessionLocal()

    try:
        df = pd.read_csv(DATASET_PATH)

        # optional: prevent duplicates (based on ID)
        existing_ids = {
            r[0] for r in session.query(Patient.id).all()
        }

        new_count = 0

        for _, row in df.iterrows():
            patient_id = row["Person ID"]

            # skip if already in DB
            if patient_id in existing_ids:
                continue

            patient = Patient(
                id=patient_id,
                gender=row["Gender"],
                age=row["Age"],
                occupation=row["Occupation"],
                sleep_duration=row["Sleep Duration"],
                quality_of_sleep=row["Quality of Sleep"],
                physical_activity=row["Physical Activity Level"],
                stress_level=row["Stress Level"],
                BMI_category=row["BMI Category"],
                blood_pressure_category=row["Blood Pressure"],
                heart_rate=row["Heart Rate"],
                daily_steps=row["Daily Steps"],
                sleep_disorders=row["Sleep Disorder"],
            )

            session.add(patient)
            new_count += 1

        session.commit()
        print(f"Loaded {new_count} new patients into database")

    except Exception as e:
        session.rollback()
        print("Error loading CSV:", e)

    finally:
        session.close()


if __name__ == "__main__":
    load_csv_to_db()