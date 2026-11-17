"""Read-only pycomcigan shadow validation; never print raw school/teacher data."""
import json
import re
from datetime import date, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
from datetime import datetime

EXPECTED = [(2, room) for room in range(1, 10)] + [(3, room) for room in range(4, 10)]
ALLOWED = {
    "coverage-15", "wrong-week", "missing-class", "ambiguous-class",
    "period-conflict", "invalid-shape", "lookup-failed", "config-invalid",
    "unavailable",
}

def normalized(value):
    return re.sub(r"[\s*]", "", str(value or "")).strip()

def inspect_schedule(schedule, masked_teacher, current_monday):
    identity = normalized(masked_teacher)
    if len(identity) != 2:
        return "config-invalid", None
    try:
        beginning = date.fromisoformat(str(schedule.start_date))
        if beginning != current_monday:
            return "wrong-week", None
        counts = [0, 0, 0]
        lesson_slots = set()
        conflict = False
        for grade, room in EXPECTED:
            weekdays = schedule.timetable[grade][room]
            if not isinstance(weekdays, list) or len(weekdays) < 6:
                return "invalid-shape", None
            matched = []
            for day in range(1, 6):
                periods = weekdays[day]
                if not isinstance(periods, list) or len(periods) < 1 or len(periods) > 10:
                    return "invalid-shape", None
                for idx, entry in enumerate(periods, start=1):
                    if not isinstance(entry.period, int) or entry.period != idx or idx > 10:
                        return "invalid-shape", None
                    if not isinstance(entry.teacher, str) or not isinstance(entry.subject, str):
                        return "invalid-shape", None
                    if normalized(entry.teacher) == identity and "음악" in entry.subject:
                        matched.append((day, entry.period))
            counts[0 if not matched else 1 if len(matched) == 1 else 2] += 1
            for item in matched:
                if item in lesson_slots:
                    conflict = True
                lesson_slots.add(item)
        if counts[2]:
            return "ambiguous-class", tuple(counts)
        if counts[0]:
            return "missing-class", tuple(counts)
        if conflict:
            return "period-conflict", tuple(counts)
        return "coverage-15", tuple(counts)
    except (KeyError, IndexError, AttributeError, ValueError, TypeError):
        return "invalid-shape", None

def run():
    status, counts = "unavailable", None
    try:
        config = json.loads(Path("comcigan-config.json").read_text(encoding="utf-8"))
        code = int(config.get("schoolCode") or 0)
        teacher = str(config.get("teacherName") or "")
        if not config.get("enabled") or code <= 0 or len(normalized(teacher)) != 2:
            status = "config-invalid"
        else:
            from pycomcigan import TimeTable
            # The bound school code disambiguates same-name schools. Current week=0.
            schedule = TimeTable("와부중학교", school_code=code, week_num=0)
            now = datetime.now(ZoneInfo("Asia/Seoul")).date()
            monday = now - timedelta(days=now.weekday())
            status, counts = inspect_schedule(schedule, teacher, monday)
    except Exception:
        status = "lookup-failed"
    if status not in ALLOWED:
        status = "unavailable"
    print("PY_SHADOW_STATUS=" + status)
    if counts and sum(counts) == 15 and all(isinstance(x, int) and 0 <= x <= 15 for x in counts):
        print("PY_SHADOW_DISTRIBUTION=" + ",".join(str(x) for x in counts))
    print("PY_SHADOW_PUBLICATION=blocked")

if __name__ == "__main__":
    run()
