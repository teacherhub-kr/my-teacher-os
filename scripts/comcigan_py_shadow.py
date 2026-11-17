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


def summarize_original_and_changes(schedule, masked_teacher):
    identity=normalized(masked_teacher)
    if len(identity)!=2:
        return None
    current=[0,0,0]
    original=[0,0,0]
    anymusic=[0,0,0]
    period_seen=set()
    conflict=False
    try:
        for grade, room in EXPECTED:
            curr=orig=music=0
            for day in range(1,6):
                for entry in schedule.timetable[grade][room][day]:
                    if not isinstance(entry.subject,str) or not isinstance(entry.teacher,str):
                        return None
                    if "음악" in entry.subject:
                        music+=1
                    if normalized(entry.teacher)==identity and "음악" in entry.subject:
                        curr+=1
                        slot=(day,entry.period)
                        if slot in period_seen:
                            conflict=True
                        period_seen.add(slot)
                    before=entry.original if getattr(entry,"replaced",False) else entry
                    if before and isinstance(before.subject,str) and isinstance(before.teacher,str) and normalized(before.teacher)==identity and "음악" in before.subject:
                        orig+=1
            current[0 if curr==0 else 1 if curr==1 else 2]+=1
            original[0 if orig==0 else 1 if orig==1 else 2]+=1
            anymusic[0 if music==0 else 1 if music==1 else 2]+=1
        return tuple(current),tuple(original),tuple(anymusic),conflict
    except (KeyError,IndexError,AttributeError,TypeError):
        return None

def run():
    status, counts, provenance, identity_state = "unavailable", None, None, "unknown"
    try:
        config=json.loads(Path("comcigan-config.json").read_text(encoding="utf-8"))
        code=int(config.get("schoolCode") or 0)
        teacher=str(config.get("teacherName") or "")
        if not config.get("enabled") or code<=0 or len(normalized(teacher))!=2:
            status="config-invalid"
        else:
            from pycomcigan import TimeTable
            identity=normalized(teacher)
            class AuditedTimeTable(TimeTable):
                def _initialize_from_data(self, data, local_code, school_name, school_code, comcigan_codes):
                    try:
                        names=data["자료"+comcigan_codes[2]]
                        matched=sum(normalized(self._format_teacher_name(n))==identity for n in names)
                        self.match_state="unique" if matched==1 else "missing" if matched==0 else "duplicate"
                    except (KeyError,IndexError,TypeError):
                        self.match_state="unknown"
                    return super()._initialize_from_data(data,local_code,school_name,school_code,comcigan_codes)
            schedule=AuditedTimeTable("와부중학교",school_code=code,week_num=0)
            identity_state=getattr(schedule,"match_state","unknown")
            today=datetime.now(ZoneInfo("Asia/Seoul")).date()
            monday=today-timedelta(days=today.weekday())
            status,counts=inspect_schedule(schedule,teacher,monday)
            if status!="wrong-week":
                provenance=summarize_original_and_changes(schedule,teacher)
    except Exception:
        status="lookup-failed"
    if status not in ALLOWED:
        status="unavailable"
    print("PY_SHADOW_STATUS="+status)
    if counts and sum(counts)==15:
        print("PY_SHADOW_DISTRIBUTION="+",".join(str(x) for x in counts))
    if provenance:
        for label,values in zip(("CURRENT","ORIGINAL","ANYMUSIC"),provenance[:3]):
            if sum(values)==15:
                print("PY_SHADOW_"+label+"_COUNTS="+",".join(str(x) for x in values))
        print("PY_SHADOW_PERIOD_CONFLICT="+("yes" if provenance[3] else "no"))
    print("PY_SHADOW_IDENTITY="+(identity_state if identity_state in {"unique","missing","duplicate","unknown"} else "unknown"))
    print("PY_SHADOW_PUBLICATION=blocked")

if __name__ == "__main__":
    run()
