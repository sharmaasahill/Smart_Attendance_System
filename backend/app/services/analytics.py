"""
Attendance analytics computed strictly from real records.

Data model available: Attendance(user_id, date, time_in, status) and
User(department). Every metric below is derived only from those facts — no
simulated, random, or fabricated values.

Definitions:
  * "On time" means clocking in at or before WORK_START (09:00).
  * Attendance rate (day) = distinct present users that day / total users.
  * Streak = consecutive calendar days present, counting back from a user's
    most recent present day.
"""

from collections import Counter, defaultdict
from datetime import time, timedelta

from app.core.time_utils import now_local

WORK_START = time(9, 0)


def _avg_arrival(times) -> str:
    if not times:
        return "N/A"
    secs = sum(t.hour * 3600 + t.minute * 60 + t.second for t in times) / len(times)
    return f"{int(secs // 3600):02d}:{int((secs % 3600) // 60):02d}"


def _format_hour(hour: int) -> str:
    h12 = hour % 12 or 12
    return f"{h12} {'AM' if hour < 12 else 'PM'}"


def live_stats(users: list, records: list) -> dict:
    """Today's snapshot."""
    today = now_local().date()
    today_present = [r for r in records if r.date == today and r.status == "present"]
    present_ids = {r.user_id for r in today_present}
    times = [r.time_in for r in today_present if r.time_in]
    on_time = sum(1 for t in times if t <= WORK_START)
    late = sum(1 for t in times if t > WORK_START)

    total = len(users)
    present = len(present_ids)

    return {
        "totalEmployees": total,
        "currentlyPresent": present,
        "onTimeToday": on_time,
        "lateToday": late,
        "absentToday": max(0, total - present),
        "attendanceRate": round(present / total * 100, 1) if total else 0,
        "punctualityRate": round(on_time / present * 100, 1) if present else 0,
        "averageArrival": _avg_arrival(times),
        "peakHour": _format_hour(Counter(t.hour for t in times).most_common(1)[0][0]) if times else "N/A",
    }


def department_breakdown(users: list, records: list) -> list:
    """Per-department present/total for today."""
    today = now_local().date()
    present_ids = {r.user_id for r in records if r.date == today and r.status == "present"}

    totals = defaultdict(int)
    present = defaultdict(int)
    for u in users:
        dept = u.department or "Unassigned"
        totals[dept] += 1
        if u.id in present_ids:
            present[dept] += 1

    return [
        {
            "name": dept,
            "present": present[dept],
            "total": totals[dept],
            "attendanceRate": round(present[dept] / totals[dept] * 100, 1) if totals[dept] else 0,
        }
        for dept in sorted(totals)
    ]


def daily_trends(records: list, start_date, end_date, total_users: int) -> list:
    """Per-day attendance % and on-time % across the period."""
    by_date = defaultdict(list)
    for r in records:
        if r.status == "present":
            by_date[r.date].append(r)

    out = []
    day = start_date
    while day <= end_date:
        recs = by_date.get(day, [])
        present = len({r.user_id for r in recs})
        on_time = sum(1 for r in recs if r.time_in and r.time_in <= WORK_START)
        out.append({
            "date": day.strftime("%b %d"),
            "attendance": round(present / total_users * 100, 1) if total_users else 0,
            "onTime": round(on_time / present * 100, 1) if present else 0,
        })
        day += timedelta(days=1)
    return out


def weekly_patterns(records: list, start_date, end_date, total_users: int) -> list:
    """Average attendance % and late-arrival counts by weekday over the period."""
    names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    occurrences = [0] * 7
    day = start_date
    while day <= end_date:
        occurrences[day.weekday()] += 1
        day += timedelta(days=1)

    present_pairs = defaultdict(set)  # weekday -> {(user_id, date)}
    late_counts = [0] * 7
    for r in records:
        if r.status == "present":
            wd = r.date.weekday()
            present_pairs[wd].add((r.user_id, r.date))
            if r.time_in and r.time_in > WORK_START:
                late_counts[wd] += 1

    out = []
    for i, name in enumerate(names):
        denom = total_users * occurrences[i]
        present_count = len(present_pairs.get(i, set()))
        out.append({
            "name": name,
            "attendance": round(present_count / denom * 100, 1) if denom else 0,
            "lateArrivals": late_counts[i],
        })
    return out


def user_performance(users: list, records: list) -> list:
    """Top users by attendance % over the period (with real current streak)."""
    by_user = defaultdict(list)
    for r in records:
        by_user[r.user_id].append(r)

    users_by_id = {u.id: u for u in users}
    out = []
    for uid, recs in by_user.items():
        user = users_by_id.get(uid)
        if not user:
            continue

        present_dates = sorted({r.date for r in recs if r.status == "present"})
        total = len(recs)
        present = len(present_dates)

        streak = 0
        if present_dates:
            present_set = set(present_dates)
            cursor = present_dates[-1]
            while cursor in present_set:
                streak += 1
                cursor -= timedelta(days=1)

        out.append({
            "name": user.full_name,
            "department": user.department or "Unassigned",
            "attendance": round(present / total * 100, 1) if total else 0,
            "presentDays": present,
            "streak": streak,
        })

    out.sort(key=lambda x: (x["attendance"], x["streak"]), reverse=True)
    return out[:5]


def detect_anomalies(records: list, users: list) -> list:
    """Flag users whose attendance rate over the period is below 60%."""
    anomalies = []
    by_user = defaultdict(list)
    for r in records:
        by_user[r.user_id].append(r)

    users_by_id = {u.id: u for u in users}
    for uid, recs in by_user.items():
        user = users_by_id.get(uid)
        if not user:
            continue
        present = [r for r in recs if r.status == "present"]
        if len(recs) > 5 and len(present) / len(recs) < 0.6:
            anomalies.append({
                "type": "low_attendance",
                "user": user.full_name,
                "description": f"Attendance rate below 60% ({len(present)}/{len(recs)} days)",
                "severity": "high",
                "date": recs[-1].date.strftime("%b %d") if recs else "Unknown",
            })
    return anomalies


def recommendations(records: list, users: list) -> list:
    """Actionable recommendations derived from real attendance/punctuality."""
    out = []
    present = [r for r in records if r.status == "present"]
    rate = len({r.user_id for r in present}) / max(len(users), 1) * 100
    if rate < 80:
        out.append({
            "type": "attendance",
            "priority": "high",
            "title": "Low Overall Attendance",
            "description": f"Attendance rate is {rate:.1f}%. Consider attendance incentives.",
        })

    late = [r for r in present if r.time_in and r.time_in > time(9, 15)]
    if present and len(late) > len(present) * 0.3:
        out.append({
            "type": "punctuality",
            "priority": "medium",
            "title": "Punctuality Issues",
            "description": f"{len(late)} late arrivals detected. Consider flexible timing.",
        })
    return out
