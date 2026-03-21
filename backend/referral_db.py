import sqlite3
from typing import List, Dict

DB_PATH = "app.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def find_ranked_doctors_by_city_and_specialties(city: str, specialties: List[str], limit: int = 5) -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()

    results = []

    for specialty in specialties:
        remaining = limit - len(results)
        if remaining <= 0:
            break

        cursor.execute(
            """
            SELECT id, full_name, specialty, city, clinic_name, phone, email, accepting_new_patients
            FROM doctors
            WHERE city = ?
              AND specialty = ?
              AND accepting_new_patients = 1
            ORDER BY full_name
            LIMIT ?
            """,
            (city, specialty, remaining),
        )

        rows = cursor.fetchall()
        results.extend([dict(r) for r in rows])

    conn.close()
    return results


def create_referral(patient_id: str, assessment_id: int, from_doctor_id: int, to_doctor_id: int, reason: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO referrals (patient_id, assessment_id, from_doctor_id, to_doctor_id, reason)
        VALUES (?, ?, ?, ?, ?)
        """,
        (patient_id, assessment_id, from_doctor_id, to_doctor_id, reason),
    )

    conn.commit()
    conn.close()