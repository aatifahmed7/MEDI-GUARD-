"""
MediGuard AI - Database Management Module
Handles SQLite schema creation, CRUD operations, medication events, and demo data.
"""

import sqlite3
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

DB_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.join(DB_DIR, "mediguard.db")


def get_connection():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initialize SQLite tables for patients, medicines, events, verification, caregivers, and alerts."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER,
        gender TEXT,
        blood_group TEXT,
        condition_summary TEXT,
        doctor_name TEXT,
        emergency_contact TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS medicines (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        quantity INTEGER DEFAULT 30,
        reminder_time TEXT NOT NULL,
        frequency TEXT NOT NULL,
        duration INTEGER DEFAULT 30,
        start_date TEXT,
        end_date TEXT,
        instructions TEXT,
        food_timing TEXT DEFAULT 'After Food',
        qr_code_data TEXT,
        barcode TEXT,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS medication_events (
        id TEXT PRIMARY KEY,
        medicine_id TEXT NOT NULL,
        scheduled_date TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        actual_time TEXT,
        status TEXT NOT NULL,
        verification_status TEXT DEFAULT 'Not Verified',
        verified_with TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id),
        UNIQUE(medicine_id, scheduled_date, scheduled_time)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS caregivers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        relationship TEXT,
        phone TEXT,
        email TEXT,
        notification_level TEXT DEFAULT 'ALL',
        active INTEGER DEFAULT 1
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        medicine_id TEXT,
        alert_type TEXT NOT NULL,
        message TEXT NOT NULL,
        priority TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        acknowledged INTEGER DEFAULT 0,
        acknowledged_at TIMESTAMP,
        acknowledged_by TEXT,
        action_taken TEXT,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
    """)

    conn.commit()
    conn.close()


def load_demo_data():
    """Populates SQLite with 14-day realistic adherence logs for demo and hackathon judging."""
    init_database()
    conn = get_connection()
    cursor = conn.cursor()

    # Clear existing
    cursor.execute("DELETE FROM alerts")
    cursor.execute("DELETE FROM medication_events")
    cursor.execute("DELETE FROM medicines")
    cursor.execute("DELETE FROM caregivers")
    cursor.execute("DELETE FROM patients")

    # Insert default patient
    cursor.execute("""
    INSERT INTO patients (id, name, age, gender, blood_group, condition_summary, doctor_name, emergency_contact)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "patient-001",
        "Eleanor Vance",
        68,
        "Female",
        "A+",
        "Hypertension & Type 2 Diabetes Management",
        "Dr. Sarah Jenkins, MD (Cardiology)",
        "+1 (555) 234-8901"
    ))

    # Insert Medicines
    meds = [
        ("med-01", "patient-001", "Metformin HCl", "500 mg", 90, "08:00,13:00,20:00", "Three times daily", 30, "With Food", "MED-METF-500", "890103000202", "Take with main meals"),
        ("med-02", "patient-001", "Lisinopril", "10 mg", 30, "08:00", "Once daily", 30, "Before Food", "MED-LISI-010", "890103000404", "Take every morning before breakfast"),
        ("med-03", "patient-001", "Paracetamol Extra", "500 mg", 60, "08:00,20:00", "Twice daily", 30, "After Food", "MED-PARA-500", "890103000101", "Take after food for joint pain"),
        ("med-04", "patient-001", "Vitamin D3", "1000 IU", 30, "13:00", "Once daily", 30, "With Food", "MED-VITD-1000", "890103000505", "Take with lunch"),
        ("med-05", "patient-001", "Atorvastatin", "20 mg", 30, "21:00", "Once daily", 30, "After Food", "MED-ATOR-020", "890103000303", "Take at bedtime"),
    ]

    today = datetime.now()
    start_date_str = (today - timedelta(days=14)).strftime("%Y-%m-%d")
    end_date_str = (today + timedelta(days=16)).strftime("%Y-%m-%d")

    for m in meds:
        cursor.execute("""
        INSERT INTO medicines (id, patient_id, name, dosage, quantity, reminder_time, frequency, duration, start_date, end_date, instructions, food_timing, qr_code_data, barcode, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], start_date_str, end_date_str, m[11], m[8], m[9], m[10]))

    # Caregivers
    cursor.execute("""
    INSERT INTO caregivers (id, name, relationship, phone, email, notification_level, active)
    VALUES 
    ('cg-001', 'Michael Vance (Son)', 'Primary Family Caregiver', '+1 (555) 987-6543', 'michael.vance@example.com', 'ALL', 1),
    ('cg-002', 'Nurse Clara Rodriguez, RN', 'Visiting Home Care Nurse', '+1 (555) 456-7890', 'clara.rodriguez@healthcare.org', 'CRITICAL_ONLY', 1)
    """)

    # Generate 14 days of events
    for offset in range(-13, 1):
        dt = today + timedelta(days=offset)
        d_str = dt.strftime("%Y-%m-%d")
        is_today = (offset == 0)

        for m in meds:
            times = m[5].split(",")
            for t in times:
                h = int(t.split(":")[0])
                evt_id = f"evt-{m[0]}-{d_str}-{t.replace(':', '')}"

                if is_today:
                    if h <= 10:
                        status, v_status, act_time = "Taken on Time", "Verified", f"{h:02d}:05"
                    elif h <= 14:
                        status, v_status, act_time = "Due Now", "Not Verified", None
                    else:
                        status, v_status, act_time = "Upcoming", "Not Verified", None
                else:
                    if offset == -3 and h >= 20:
                        status, v_status, act_time = "Missed", "Not Verified", None
                    elif offset == -7 and h >= 20:
                        status, v_status, act_time = "Taken Late", "Verified", f"{h:02d}:45"
                    elif offset == -10 and h == 13:
                        status, v_status, act_time = "Missed", "Not Verified", None
                    else:
                        if h >= 20:
                            status, v_status, act_time = ("Taken Late", "Verified", f"{h:02d}:35") if (offset % 4 == 0) else ("Taken on Time", "Verified", f"{h:02d}:02")
                        else:
                            status, v_status, act_time = "Taken on Time", "Verified", f"{h:02d}:04"

                cursor.execute("""
                INSERT OR REPLACE INTO medication_events (id, medicine_id, scheduled_date, scheduled_time, actual_time, status, verification_status, verified_with, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (evt_id, m[0], d_str, t, act_time, status, v_status, "QR" if v_status == "Verified" else None, "Logged via MediGuard" if status != "Missed" else "Missed dose"))

    # Add sample alert
    cursor.execute("""
    INSERT INTO alerts (id, patient_id, medicine_id, alert_type, message, priority, acknowledged)
    VALUES ('alt-01', 'patient-001', 'med-01', 'MISSED_DOSE', 'Missed evening Metformin dose on Day -3. Caregiver notified.', 'HIGH', 1)
    """)

    conn.commit()
    conn.close()


def get_medicines():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM medicines WHERE active = 1 ORDER BY name ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_events(date=None):
    conn = get_connection()
    cursor = conn.cursor()
    if date:
        cursor.execute("""
        SELECT e.*, m.name as medicine_name, m.dosage 
        FROM medication_events e 
        JOIN medicines m ON e.medicine_id = m.id 
        WHERE e.scheduled_date = ? 
        ORDER BY e.scheduled_time ASC
        """, (date,))
    else:
        cursor.execute("""
        SELECT e.*, m.name as medicine_name, m.dosage 
        FROM medication_events e 
        JOIN medicines m ON e.medicine_id = m.id 
        ORDER BY e.scheduled_date DESC, e.scheduled_time DESC
        """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
