"""Admin analytics, reporting, and anomaly endpoints."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api import deps
from app.db.session import get_db
from app.models import Attendance, User
from app.services import analytics as svc

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _period_start(period: str, today: datetime) -> datetime:
    if period == "day":
        return today.replace(hour=0, minute=0, second=0)
    if period == "month":
        return today - timedelta(days=30)
    return today - timedelta(days=7)  # default: week


def _build_dashboard(period: str, db: Session) -> dict:
    today = datetime.now()
    start_date = _period_start(period, today)
    attendance_records = db.query(Attendance).filter(Attendance.date >= start_date.date()).all()
    users = db.query(User).all()
    return {
        "liveStats": svc.calculate_live_stats(db, users, attendance_records),
        "dailyTrends": svc.calculate_daily_trends(attendance_records, start_date, today),
        "weeklyStats": svc.calculate_weekly_patterns(attendance_records),
        "userStats": svc.calculate_user_performance(db, users, attendance_records),
        "anomalies": svc.detect_anomalies(attendance_records, users),
        "productivity": svc.calculate_productivity_metrics(attendance_records, users),
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
    format: str = "json",
    period: str = "week",
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    try:
        analytics = _build_dashboard(period, db)
        if format.lower() == "csv":
            csv_content = "metric,value\n"
            csv_content += f"total_employees,{analytics['liveStats']['totalEmployees']}\n"
            csv_content += f"currently_present,{analytics['liveStats']['currentlyPresent']}\n"
            csv_content += f"productivity_score,{analytics['liveStats']['productivityScore']}\n"
            return Response(
                content=csv_content,
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=analytics-{period}.csv"},
            )
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/reports/automated")
async def generate_automated_report(
    report_type: str = "weekly",
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    try:
        today = datetime.now()
        if report_type == "daily":
            start_date = today.replace(hour=0, minute=0, second=0)
            title = "Daily Attendance Report"
        elif report_type == "monthly":
            start_date = today - timedelta(days=30)
            title = "Monthly Attendance Report"
        else:
            start_date = today - timedelta(days=7)
            title = "Weekly Attendance Report"

        attendance_records = db.query(Attendance).filter(Attendance.date >= start_date.date()).all()
        users = db.query(User).all()

        on_time_pct = round(
            len([
                r for r in attendance_records
                if r.time_in and r.time_in <= datetime.strptime("09:00", "%H:%M").time()
            ]) / max(len(attendance_records), 1) * 100,
            1,
        )

        return {
            "title": title,
            "period": report_type,
            "generatedAt": today.isoformat(),
            "summary": {
                "totalEmployees": len(users),
                "totalRecords": len(attendance_records),
                "avgAttendance": round(len(attendance_records) / max(len(users), 1), 2),
                "attendanceRate": round(
                    (len(set(r.user_id for r in attendance_records)) / max(len(users), 1)) * 100, 1
                ),
            },
            "insights": [
                {
                    "type": "attendance",
                    "title": "Overall Attendance",
                    "value": f"{round((len(set(r.user_id for r in attendance_records)) / max(len(users), 1)) * 100, 1)}%",
                    "trend": "stable",
                },
                {
                    "type": "punctuality",
                    "title": "On-Time Arrivals",
                    "value": f"{on_time_pct}%",
                    "trend": "improving",
                },
            ],
            "recommendations": svc.generate_simple_recommendations(attendance_records, users),
            "topPerformers": svc.calculate_user_performance(db, users, attendance_records)[:3],
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
        start_date = datetime.now() - timedelta(days=days)
        attendance_records = db.query(Attendance).filter(Attendance.date >= start_date.date()).all()
        users = db.query(User).all()

        anomalies = svc.detect_anomalies(attendance_records, users)
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
