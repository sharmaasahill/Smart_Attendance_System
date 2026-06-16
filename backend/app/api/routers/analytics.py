"""Admin analytics, reporting, and anomaly endpoints (real data only)."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api import deps
from app.core.time_utils import now_local
from app.db.session import get_db
from app.models import Attendance, User
from app.services import analytics as svc

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _period_start(period: str, today: datetime) -> datetime:
    if period == "day":
        return today.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "month":
        return today - timedelta(days=30)
    if period == "quarter":
        return today - timedelta(days=90)
    return today - timedelta(days=7)  # default: week


def _build_dashboard(period: str, db: Session) -> dict:
    today = now_local()
    start_date = _period_start(period, today).date()
    end_date = today.date()

    records = db.query(Attendance).filter(Attendance.date >= start_date).all()
    users = db.query(User).all()
    total_users = len(users)

    return {
        "liveStats": svc.live_stats(users, records),
        "departments": svc.department_breakdown(users, records),
        "dailyTrends": svc.daily_trends(records, start_date, end_date, total_users),
        "weeklyStats": svc.weekly_patterns(records, start_date, end_date, total_users),
        "userStats": svc.user_performance(users, records),
        "anomalies": svc.detect_anomalies(records, users),
        "period": period,
        "generatedAt": today.isoformat(),
    }


@router.get("/dashboard")
async def get_analytics_dashboard(
    period: str = "week",
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    try:
        return _build_dashboard(period, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics calculation failed: {str(e)}")


@router.get("/export")
async def export_analytics_data(
    format: str = "csv",
    period: str = "week",
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    try:
        data = _build_dashboard(period, db)
        live = data["liveStats"]

        if format.lower() == "csv":
            rows = [
                ("metric", "value"),
                ("period", period),
                ("generated_at", data["generatedAt"]),
                ("total_employees", live["totalEmployees"]),
                ("currently_present", live["currentlyPresent"]),
                ("attendance_rate_percent", live["attendanceRate"]),
                ("on_time_today", live["onTimeToday"]),
                ("late_today", live["lateToday"]),
                ("absent_today", live["absentToday"]),
                ("punctuality_rate_percent", live["punctualityRate"]),
                ("average_arrival", live["averageArrival"]),
            ]
            csv_content = "\n".join(f"{k},{v}" for k, v in rows)
            return Response(
                content=csv_content,
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=analytics-{period}.csv"},
            )

        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/reports/automated")
async def generate_automated_report(
    report_type: str = "weekly",
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    try:
        today = now_local()
        period_map = {"daily": "day", "monthly": "month"}
        period = period_map.get(report_type, "week")
        title = {"daily": "Daily", "monthly": "Monthly"}.get(report_type, "Weekly") + " Attendance Report"

        start_date = _period_start(period, today).date()
        records = db.query(Attendance).filter(Attendance.date >= start_date).all()
        users = db.query(User).all()

        present_user_ids = {r.user_id for r in records if r.status == "present"}
        attendance_rate = round(len(present_user_ids) / max(len(users), 1) * 100, 1)

        return {
            "title": title,
            "period": report_type,
            "generatedAt": today.isoformat(),
            "summary": {
                "totalEmployees": len(users),
                "totalRecords": len(records),
                "attendanceRate": attendance_rate,
            },
            "recommendations": svc.recommendations(records, users),
            "topPerformers": svc.user_performance(users, records)[:3],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@router.get("/anomalies")
async def get_attendance_anomalies(
    days: int = 7,
    severity: str = "all",
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    try:
        start_date = now_local() - timedelta(days=days)
        records = db.query(Attendance).filter(Attendance.date >= start_date.date()).all()
        users = db.query(User).all()

        anomalies = svc.detect_anomalies(records, users)
        if severity != "all":
            anomalies = [a for a in anomalies if a["severity"] == severity]

        return {
            "anomalies": anomalies,
            "total": len(anomalies),
            "period": f"Last {days} days",
            "severityFilter": severity,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")
