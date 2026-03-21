import sqlite3

conn = sqlite3.connect("app.db")
cursor = conn.cursor()

# Patients
cursor.execute("""
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT,
    city TEXT NOT NULL,
    occupation TEXT,
    height_cm REAL,
    weight_kg REAL,
    bmi_category TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")

# Assessments
cursor.execute("""
CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    sleep_duration REAL NOT NULL,
    sleep_quality REAL NOT NULL,
    activity_level INTEGER NOT NULL,
    stress_level INTEGER NOT NULL,
    blood_pressure TEXT,
    heart_rate INTEGER,
    daily_steps INTEGER NOT NULL,
    risk_score INTEGER,
    risk_level TEXT,
    recommendation_type TEXT,
    patient_summary TEXT,
    doctor_summary TEXT,
    doctor_flag INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);
""")

# Doctors
cursor.execute("""
CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    city TEXT NOT NULL,
    clinic_name TEXT,
    phone TEXT,
    email TEXT,
    accepting_new_patients INTEGER DEFAULT 1
);
""")

# Doctor Feedback
cursor.execute("""
CREATE TABLE IF NOT EXISTS doctor_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    doctor_decision TEXT NOT NULL,
    updated_recommendation_type TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);
""")

# Referrals
cursor.execute("""
CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    assessment_id INTEGER NOT NULL,
    from_doctor_id INTEGER NOT NULL,
    to_doctor_id INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (assessment_id) REFERENCES assessments(id),
    FOREIGN KEY (from_doctor_id) REFERENCES doctors(id),
    FOREIGN KEY (to_doctor_id) REFERENCES doctors(id)
);
""")

# Doctor-Patient Assignments
cursor.execute("""
CREATE TABLE IF NOT EXISTS doctor_patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    patient_id TEXT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);
""")

conn.commit()
conn.close()

print("Database + tables created successfully.")