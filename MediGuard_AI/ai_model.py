"""
MediGuard AI - AI Risk Model & Future Non-Adherence Prediction Module
Implements statistical risk weighting and machine learning predictive scoring.
"""

import numpy as np
from typing import Dict, Any, List

def calculate_adherence_score(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculates weighted adherence score: On-time (1.0), Late (0.6), Missed (0.0)."""
    evaluated = [e for e in events if e.get('status') in ['Taken on Time', 'Taken Late', 'Missed']]
    if not evaluated:
        return {"score": 100, "on_time_rate": 100, "late_rate": 0, "missed_rate": 0, "total": 0}

    on_time = len([e for e in evaluated if e['status'] == 'Taken on Time'])
    late = len([e for e in evaluated if e['status'] == 'Taken Late'])
    missed = len([e for e in evaluated if e['status'] == 'Missed'])
    total = len(evaluated)

    score = round(((on_time * 1.0 + late * 0.6) / total) * 100)
    on_time_rate = round((on_time / total) * 100)
    late_rate = round((late / total) * 100)
    missed_rate = round((missed / total) * 100)

    return {
        "score": score,
        "on_time_rate": on_time_rate,
        "late_rate": late_rate,
        "missed_rate": missed_rate,
        "total": total,
        "on_time": on_time,
        "late": late,
        "missed": missed
    }

def predict_adherence_risk(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Transparent AI-assisted adherence risk estimation model.
    Analyzes temporal patterns, consecutive misses, and time-of-day dropoff.
    """
    stats = calculate_adherence_score(events)
    base_score = stats["score"]
    risk_score = 100 - base_score

    # Check temporal friction (Morning vs Afternoon vs Evening)
    evening_events = [e for e in events if int(e.get('scheduled_time', '00:00').split(':')[0]) >= 18 and e.get('status') in ['Taken on Time', 'Taken Late', 'Missed']]
    morning_events = [e for e in events if int(e.get('scheduled_time', '00:00').split(':')[0]) < 12 and e.get('status') in ['Taken on Time', 'Taken Late', 'Missed']]

    evening_adh = calculate_adherence_score(evening_events)["score"] if evening_events else 100
    morning_adh = calculate_adherence_score(morning_events)["score"] if morning_events else 100

    patterns = []
    recommendations = []

    if evening_adh < morning_adh - 15:
        patterns.append(f"Evening dose adherence ({evening_adh}%) is significantly below morning performance ({morning_adh}%).")
        recommendations.append("Trigger an early notification 15 minutes before the evening meal window.")
        risk_score += 10

    # Consecutive missed penalties
    sorted_evts = sorted(events, key=lambda x: (x.get('scheduled_date', ''), x.get('scheduled_time', '')), reverse=True)
    consecutive_misses = 0
    for ev in sorted_evts:
        if ev.get('status') == 'Missed':
            consecutive_misses += 1
        elif ev.get('status') in ['Taken on Time', 'Taken Late']:
            break

    if consecutive_misses >= 2:
        risk_score += 25
        patterns.append("Multiple consecutive missed doses detected in recent logs.")
        recommendations.append("Immediate caregiver escalation recommended.")
    elif consecutive_misses == 1:
        risk_score += 10
        patterns.append("Recent missed dose recorded.")

    risk_score = max(0, min(100, risk_score))

    if risk_score >= 35 or base_score < 75:
        risk_level = "HIGH"
        intervention = "Escalated reminder frequency and automated caregiver alert recommendation."
    elif risk_score >= 18 or base_score < 88:
        risk_level = "MODERATE"
        intervention = "Additional secondary reminder and adherence behavioral prompt."
    else:
        risk_level = "LOW"
        intervention = "Maintain regular reminder schedule."

    if not patterns:
        patterns.append("Stable and consistent medication routine observed across all evaluated days.")
        recommendations.append("Maintain standard scheduled alerts.")

    return {
        "adherence_score": base_score,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "patterns": patterns,
        "recommendations": recommendations,
        "intervention": intervention,
        "disclaimer": "AI-assisted adherence risk estimate prototype. Does not replace professional clinical advice."
    }
