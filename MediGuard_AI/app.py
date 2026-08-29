"""
MediGuard AI - Main Streamlit Application Entry Point
Smart Medicine Reminder & Predictive Adherence Tracking System
"""

import streamlit as st
import pandas as pd
from datetime import datetime, date
import database as db
import ai_model
import analytics
import notifications
import qr_verification
import utils

# Page Config
st.set_page_config(
    page_title="MediGuard AI - Smart Adherence Platform",
    page_icon="💊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Healthcare Styling
st.markdown("""
<style>
    .stApp {
        background-color: #F5F8FC;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .metric-card {
        background-color: #FFFFFF;
        border-radius: 12px;
        padding: 20px;
        border: 1px solid #E2E8F0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .hero-title {
        color: #0B1F33;
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 4px;
    }
    .hero-sub {
        color: #64748B;
        font-size: 14px;
        font-weight: 500;
    }
    .badge {
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        color: white;
    }
</style>
""", unsafe_allow_html=True)

# Initialize DB
db.init_database()

# Sidebar
with st.sidebar:
    st.markdown("### 💊 MediGuard AI")
    st.caption("Smart Medication Intelligence")
    st.divider()

    st.markdown("**👤 Patient Profile**")
    st.write("Eleanor Vance (68y, A+)")
    st.caption("Hypertension & Type 2 Diabetes")
    st.divider()

    page = st.radio(
        "Navigation",
        [
            "🏠 Dashboard",
            "💊 My Medicines",
            "📅 Medication Schedule",
            "🔔 Reminder Center",
            "✅ Medicine Verification",
            "📊 Adherence Analytics",
            "🧠 AI Risk Analysis",
            "👨‍⚕️ Caregiver Center",
            "📜 Medication History",
            "⚙️ Settings & Demo Data"
        ]
    )

    st.divider()
    st.success("🟢 System Status: Online")
    st.caption("Hackathon Prototype v1.0")

# Load Data
events = db.get_events()
medicines = db.get_medicines()
today_str = datetime.now().strftime("%Y-%m-%d")
today_events = [e for e in events if e.get('scheduled_date') == today_str]
risk_analysis = ai_model.predict_adherence_risk(events)
adh_stats = ai_model.calculate_adherence_score(events)

# Routing
if page == "🏠 Dashboard":
    st.markdown(f"<div class='hero-title'>MediGuard AI</div>", unsafe_allow_html=True)
    st.markdown("<div class='hero-sub'>Remind • Verify • Track • Predict • Intervene</div>", unsafe_allow_html=True)
    st.write(f"*{utils.get_greeting()}, Eleanor Vance*")
    st.write("")

    # KPI Row
    col1, col2, col3, col4, col5, col6 = st.columns(6)
    with col1:
        st.metric("Today's Doses", len(today_events))
    with col2:
        taken_today = len([e for e in today_events if e['status'] in ['Taken on Time', 'Taken Late']])
        st.metric("Taken", taken_today)
    with col3:
        pending_today = len([e for e in today_events if e['status'] in ['Due Now', 'Upcoming', 'Pending']])
        st.metric("Pending", pending_today)
    with col4:
        missed_today = len([e for e in today_events if e['status'] == 'Missed'])
        st.metric("Missed", missed_today)
    with col5:
        st.metric("Adherence", f"{adh_stats['score']}%")
    with col6:
        st.metric("Risk Level", risk_analysis['risk_level'])

    st.divider()

    st.subheader("Today's Medication Timeline")
    if today_events:
        for ev in today_events:
            c1, c2, c3, c4 = st.columns([2, 4, 3, 3])
            c1.write(f"**{utils.format_time_12hr(ev['scheduled_time'])}**")
            c2.write(f"**{ev['medicine_name']}** ({ev['dosage']})")
            c3.markdown(f"<span style='color:{utils.get_status_color(ev['status'])}; font-weight:600;'>{ev['status']}</span>", unsafe_allow_html=True)
            c4.caption(f"Verification: {ev['verification_status']}")
    else:
        st.info("No medication events scheduled for today. Click '⚙️ Settings & Demo Data' to load 14-day sample dataset.")

elif page == "💊 My Medicines":
    st.subheader("💊 My Prescribed Medicines")
    st.caption("Manage active prescription schedules, dosages, and administration guidelines.")

    if st.button("➕ Add New Medicine"):
        st.info("Open modal to enter prescription details (Name, Dosage, Frequency, Food Timing).")

    if medicines:
        for med in medicines:
            with st.expander(f"{med['name']} – {med['dosage']} ({med['frequency']})", expanded=True):
                col_a, col_b, col_c = st.columns(3)
                col_a.write(f"**Timing:** {med['reminder_time']}")
                col_a.write(f"**Food Timing:** {med['food_timing']}")
                col_b.write(f"**Quantity Left:** {med['quantity']} units")
                col_b.write(f"**Instructions:** {med['instructions']}")
                col_c.write(f"**QR Verification Code:** `{med['qr_code_data']}`")
                col_c.write(f"**Status:** {'🟢 Active' if med['active'] else '⚪ Inactive'}")
    else:
        st.info("No medicines found in database. Load demo data in Settings.")

elif page == "📅 Medication Schedule":
    st.subheader("📅 Daily Medication Schedule")
    selected_date = st.date_input("Select Schedule Date", value=datetime.now())
    d_str = selected_date.strftime("%Y-%m-%d")
    day_events = db.get_events(date=d_str)

    if day_events:
        st.table(pd.DataFrame(day_events)[['scheduled_time', 'medicine_name', 'dosage', 'status', 'verification_status', 'actual_time']])
    else:
        st.info(f"No medication events recorded for {d_str}.")

elif page == "🔔 Reminder Center":
    st.subheader("🔔 Intelligent Reminder Center")
    st.write("Time-aware classification into UPCOMING, DUE NOW, DELAYED, and MISSED.")

    # Show active state
    for ev in today_events:
        rem = notifications.classify_reminder_status(ev['scheduled_time'])
        with st.container():
            st.markdown(f"**{ev['medicine_name']} ({ev['dosage']})** - Scheduled at {utils.format_time_12hr(ev['scheduled_time'])}")
            st.caption(f"State: {rem['label']} | Current Status: {ev['status']}")
            b1, b2 = st.columns(2)
            if b1.button("✅ I've Taken It", key=f"take_{ev['id']}"):
                st.success("Dose recorded! Please proceed to Medicine Verification.")
            if b2.button("⏰ Remind Me in 10m", key=f"snooze_{ev['id']}"):
                st.info("Reminder snoozed for 10 minutes.")
            st.divider()

elif page == "✅ Medicine Verification":
    st.subheader("✅ QR & Barcode Medicine Verification")
    st.write("Ensures patient safety by verifying the physical medicine before intake confirmation.")

    if medicines:
        selected_med_name = st.selectbox("Select Scheduled Medicine to Verify", [m['name'] for m in medicines])
        sel_med = next(m for m in medicines if m['name'] == selected_med_name)

        st.write(f"**Expected Prescription:** {sel_med['name']} ({sel_med['dosage']})")
        scanned_input = st.text_input("Enter Scanned QR Code / Barcode Data", value=sel_med['qr_code_data'])

        if st.button("🔍 Verify Scanned Medicine"):
            result = qr_verification.verify_medicine_scan(sel_med, scanned_input)
            if result['is_correct']:
                st.success(result['message'])
            else:
                st.error(result['message'])
    else:
        st.warning("Please load demo medicines first.")

elif page == "📊 Adherence Analytics":
    st.subheader("📊 Adherence Analytics Dashboard")
    st.plotly_chart(analytics.create_adherence_trend_chart(events), use_container_width=True)

    col1, col2 = st.columns(2)
    with col1:
        st.plotly_chart(analytics.create_status_distribution_chart(events), use_container_width=True)
    with col2:
        st.plotly_chart(analytics.create_time_of_day_chart(events), use_container_width=True)

elif page == "🧠 AI Risk Analysis":
    st.subheader("🧠 AI Adherence Risk Analysis & Prediction")
    st.info(f"**AI Risk Level: {risk_analysis['risk_level']}** (Score: {risk_analysis['adherence_score']}%)")

    st.markdown("#### Detected Behavioral Patterns")
    for pat in risk_analysis['patterns']:
        st.write(f"• {pat}")

    st.markdown("#### Recommended Interventions")
    for rec in risk_analysis['recommendations']:
        st.write(f"👉 {rec}")

    st.caption(risk_analysis['disclaimer'])

elif page == "👨‍⚕️ Caregiver Center":
    st.subheader("👨‍⚕️ Caregiver Alert & Support Center")
    st.write("Provides real-time visibility for family members and clinical caregivers.")

    st.markdown("#### Active Caregivers")
    st.write("1. **Michael Vance (Son)** - Primary Family Caregiver (+1 555-987-6543) - Level: ALL")
    st.write("2. **Nurse Clara Rodriguez, RN** - Home Care Nurse (+1 555-456-7890) - Level: CRITICAL_ONLY")

    st.divider()
    st.markdown("#### Recent Caregiver Alerts")
    st.error("🚨 HIGH PRIORITY: Missed evening dose of Metformin HCl on Day -3 (Acknowledged by Michael Vance)")
    st.warning("⚠️ MEDIUM: AI Detected evening dose friction (24% delay rate).")

elif page == "📜 Medication History":
    st.subheader("📜 Medication Intake Audit History")
    if events:
        df_hist = pd.DataFrame(events)[['scheduled_date', 'scheduled_time', 'medicine_name', 'dosage', 'status', 'verification_status', 'actual_time']]
        st.dataframe(df_hist, use_container_width=True)
        csv = df_hist.to_csv(index=False).encode('utf-8')
        st.download_button("📥 Export CSV Audit Report", csv, "mediguard_adherence_report.csv", "text/csv")
    else:
        st.info("No history found.")

elif page == "⚙️ Settings & Demo Data":
    st.subheader("⚙️ Settings & Hackathon Demo Controls")
    if st.button("🚀 Load 14-Day Hackathon Demo Data", type="primary"):
        db.load_demo_data()
        st.success("Successfully loaded 14-day sample dataset with realistic adherence, missed doses, and alerts! Refreshing...")
        st.rerun()

    st.divider()
    st.write("**Reminder Buffer Settings:** Early Window: 15 mins | Late Window: 30 mins | Missed Threshold: 120 mins")
    st.caption("MediGuard AI is a medication adherence support prototype and does not replace professional medical advice.")
