"""
MediGuard AI - Utility Functions & Helper Formatting
"""

from datetime import datetime, date

def format_time_12hr(time_str: str) -> str:
    """Converts '08:00' to '08:00 AM'."""
    try:
        dt = datetime.strptime(time_str, "%H:%M")
        return dt.strftime("%I:%M %p")
    except Exception:
        return time_str

def get_greeting() -> str:
    """Returns contextual greeting based on current local hour."""
    hour = datetime.now().hour
    if 5 <= hour < 12:
        return "Good Morning"
    elif 12 <= hour < 17:
        return "Good Afternoon"
    else:
        return "Good Evening"

def get_status_color(status: str) -> str:
    """Returns hex code for medication status badges."""
    mapping = {
        'Taken on Time': '#16A34A',
        'Taken Late': '#F59E0B',
        'Missed': '#DC2626',
        'Due Now': '#0D6EFD',
        'Upcoming': '#64748B',
        'Pending': '#64748B',
        'Wrong Medicine': '#DC2626',
        'Verified': '#16A34A',
        'Not Verified': '#94A3B8'
    }
    return mapping.get(status, '#64748B')
