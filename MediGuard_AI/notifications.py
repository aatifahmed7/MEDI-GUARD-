"""
MediGuard AI - Notification & Time-Aware Reminder Engine
Classifies medication events into UPCOMING, DUE NOW, DELAYED, and MISSED states.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List

def classify_reminder_status(scheduled_time_str: str, current_time: datetime = None, early_window_mins: int = 15, late_window_mins: int = 30, missed_window_mins: int = 120) -> Dict[str, Any]:
    """
    Classifies a medication reminder state relative to the current time:
    - UPCOMING: Scheduled in the future (within early window)
    - DUE NOW: Right on schedule (-15m to +30m)
    - DELAYED: Overdue (+30m to +120m)
    - MISSED: Exceeded overdue threshold (>120m)
    """
    if current_time is None:
        current_time = datetime.now()

    sh, sm = map(int, scheduled_time_str.split(':'))
    scheduled_dt = current_time.replace(hour=sh, minute=sm, second=0, microsecond=0)

    diff_mins = (current_time - scheduled_dt).total_seconds() / 60.0

    if diff_mins < -early_window_mins:
        return {"category": "UPCOMING_LATER", "label": "Upcoming Later", "diff_mins": diff_mins}
    elif -early_window_mins <= diff_mins < 0:
        return {"category": "UPCOMING", "label": f"Due in {int(abs(diff_mins))} mins", "diff_mins": diff_mins}
    elif 0 <= diff_mins <= late_window_mins:
        return {"category": "DUE_NOW", "label": "Due Now", "diff_mins": diff_mins}
    elif late_window_mins < diff_mins <= missed_window_mins:
        return {"category": "DELAYED", "label": f"Delayed by {int(diff_mins)} mins", "diff_mins": diff_mins}
    else:
        return {"category": "MISSED", "label": "Missed Dose Window", "diff_mins": diff_mins}
