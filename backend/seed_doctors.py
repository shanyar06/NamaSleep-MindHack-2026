import csv
import sqlite3

DB_PATH = "app.db"
CSV_PATH = "../datasets/doctors.csv"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

with open(CSV_PATH, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    rows = [
        (
            row["full_name"],
            row["specialty"],
            row["city"],
            row["clinic_name"],
            row["phone"],
            row["email"],
            int(row["accepting_new_patients"]),
        )
        for row in reader
    ]

cursor.executemany(
    """
    INSERT INTO doctors (
        full_name,
        specialty,
        city,
        clinic_name,
        phone,
        email,
        accepting_new_patients
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """,
    rows,
)

conn.commit()
conn.close()

print(f"Inserted {len(rows)} doctors.")