"""
MediGuard AI - Interactive Analytics & Plotly Charts Module
"""

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from typing import List, Dict, Any

def create_adherence_trend_chart(events: List[Dict[str, Any]]) -> go.Figure:
    """Generates 7-day and 14-day adherence trend line with daily performance points."""
    df = pd.DataFrame(events)
    if df.empty:
        fig = go.Figure()
        fig.add_annotation(text="No medication history available yet.", showarrow=False)
        return fig

    # Filter evaluated
    df = df[df['status'].isin(['Taken on Time', 'Taken Late', 'Missed'])]
    if df.empty:
        fig = go.Figure()
        fig.add_annotation(text="No evaluated doses yet.", showarrow=False)
        return fig

    # Calculate daily score
    df['credit'] = df['status'].map({'Taken on Time': 100, 'Taken Late': 60, 'Missed': 0})
    daily = df.groupby('scheduled_date')['credit'].mean().reset_index()
    daily.columns = ['Date', 'AdherenceScore']
    daily['AdherenceScore'] = daily['AdherenceScore'].round(1)

    fig = px.line(
        daily,
        x='Date',
        y='AdherenceScore',
        title="Daily Adherence Score Trend (%)",
        markers=True,
        color_discrete_sequence=['#0D6EFD']
    )
    fig.update_layout(
        plot_bgcolor='white',
        paper_bgcolor='white',
        yaxis=dict(range=[0, 105], title="Adherence (%)"),
        xaxis=dict(title="Scheduled Date"),
        margin=dict(l=40, r=20, t=50, b=40)
    )
    fig.add_hline(y=80, line_dash="dash", line_color="#16A34A", annotation_text="Target Adherence (80%)")
    return fig

def create_status_distribution_chart(events: List[Dict[str, Any]]) -> go.Figure:
    """Donut chart showing breakdown of Taken on Time vs Taken Late vs Missed."""
    df = pd.DataFrame(events)
    if df.empty:
        return go.Figure()

    eval_df = df[df['status'].isin(['Taken on Time', 'Taken Late', 'Missed'])]
    if eval_df.empty:
        return go.Figure()

    counts = eval_df['status'].value_counts().reset_index()
    counts.columns = ['Status', 'Count']

    colors = {
        'Taken on Time': '#16A34A',
        'Taken Late': '#F59E0B',
        'Missed': '#DC2626'
    }

    fig = px.pie(
        counts,
        names='Status',
        values='Count',
        title="Dose Intake Distribution",
        hole=0.45,
        color='Status',
        color_discrete_map=colors
    )
    fig.update_traces(textinfo='percent+label')
    fig.update_layout(margin=dict(l=20, r=20, t=50, b=20), paper_bgcolor='white')
    return fig

def create_time_of_day_chart(events: List[Dict[str, Any]]) -> go.Figure:
    """Bar chart comparing adherence across Morning, Afternoon, Evening, and Night."""
    df = pd.DataFrame(events)
    if df.empty:
        return go.Figure()

    eval_df = df[df['status'].isin(['Taken on Time', 'Taken Late', 'Missed'])].copy()
    if eval_df.empty:
        return go.Figure()

    def get_slot(t_str):
        h = int(str(t_str).split(':')[0])
        if h < 12: return "Morning (8 AM)"
        elif h < 17: return "Afternoon (1 PM)"
        elif h < 21: return "Evening (8 PM)"
        else: return "Night (9 PM+)"

    eval_df['Slot'] = eval_df['scheduled_time'].apply(get_slot)
    eval_df['Credit'] = eval_df['status'].map({'Taken on Time': 100, 'Taken Late': 60, 'Missed': 0})
    slot_avg = eval_df.groupby('Slot')['Credit'].mean().reset_index()
    slot_avg.columns = ['Time of Day', 'Adherence']
    slot_avg['Adherence'] = slot_avg['Adherence'].round(1)

    fig = px.bar(
        slot_avg,
        x='Time of Day',
        y='Adherence',
        title="Adherence by Time of Day (%)",
        color='Adherence',
        color_continuous_scale=['#DC2626', '#F59E0B', '#16A34A'],
        range_color=[0, 100]
    )
    fig.update_layout(
        plot_bgcolor='white',
        paper_bgcolor='white',
        yaxis=dict(range=[0, 105], title="Adherence (%)"),
        margin=dict(l=40, r=20, t=50, b=40)
    )
    return fig
