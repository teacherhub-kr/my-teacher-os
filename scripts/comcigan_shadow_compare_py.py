"""Ephemeral, authenticated cross-parser comparison input. No raw teacher data on disk/logs."""
import hmac
import hashlib
import json
import os
import re
from datetime import datetime, date, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
from scripts.comcigan_py_shadow import EXPECTED, normalized

SUBJECT_PREFIX = re.compile(r"^[A-Z]_")
DAYS = ("월", "화", "수", "목", "금")

def normalized_subject(value):
    return SUBJECT_PREFIX.sub("", re.sub(r"\s+", "", str(value or "")))

def item_digest(subject, teacher, key):
    text=(normalized_subject(subject)+"\0"+normalized(teacher)).encode("utf-8")
    return hmac.new(bytes.fromhex(key), text, hashlib.sha256).hexdigest()

def current_monday():
    today=datetime.now(ZoneInfo("Asia/Seoul")).date()
    return today-timedelta(days=today.weekday())

def build_comparison(schedule, identity, key, monday):
    if date.fromisoformat(str(schedule.start_date)) != monday:
        return "wrong-week", None, None
    if len(normalized(identity)) != 2:
        return "identity-invalid", None, None
    expected=set(EXPECTED)
    hashes=[]
    slots=[]
    used=set()
    # Check even classes outside the target scope; do not silently truncate teacher sessions.
    for grade, rooms in enumerate(schedule.timetable):
        if grade == 0 or not isinstance(rooms, list):
            continue
        for room, weekdays in enumerate(rooms):
            if room == 0 or not isinstance(weekdays,list):
                continue
            for day in range(1,min(len(weekdays),6)):
                periods=weekdays[day]
                if not isinstance(periods,list):
                    return "invalid-data", None, None
                for item in periods:
                    if normalized(item.teacher)==normalized(identity) and item.subject:
                        if (grade,room) not in expected:
                            return "scope-mismatch", None, None
    for grade, room in EXPECTED:
        try:
            weekdays=schedule.timetable[grade][room]
            if len(weekdays)<6:
                return "invalid-data", None, None
            signed_days=[]
            for day in range(1,6):
                entries=weekdays[day]
                if not isinstance(entries,list) or not (1<=len(entries)<=10):
                    return "invalid-data", None, None
                signed=[]
                for period,entry in enumerate(entries,start=1):
                    if getattr(entry,"period",None)!=period or period>8:
                        return "invalid-data", None, None
                    if not isinstance(entry.subject,str) or not isinstance(entry.teacher,str):
                        return "invalid-data", None, None
                    if normalized_subject(entry.subject):
                        signed.append(item_digest(entry.subject,entry.teacher,key))
                    if normalized(entry.teacher)==normalized(identity) and entry.subject.strip():
                        if len(entry.subject)>32:
                            return "invalid-data", None, None
                        when=(day,period)
                        if when in used:
                            return "period-conflict", None, None
                        used.add(when)
                        target=f"{grade}-{room}"
                        daydate=monday+timedelta(days=day-1)
                        subject=entry.subject.strip()
                        slots.append({
                            "date":daydate.isoformat(),"day":DAYS[day-1],
                            "period":period,"target":target,"subject":subject,
                            "label":target+" "+subject,"changed":bool(getattr(entry,"replaced",False)),
                            "source":"컴시간 자동동기화"
                        })
                signed_days.append(signed)
            hashes.append({"grade":grade,"room":room,"days":signed_days})
        except (KeyError,IndexError,AttributeError,ValueError,TypeError):
            return "invalid-data", None, None
    if not slots or len(slots)>40:
        return "invalid-data", None, None
    slots.sort(key=lambda x:(x["date"],x["period"],x["target"]))
    return "prepared", {"weekStart":monday.isoformat(),"slots":slots}, hashes

def private_write(path,value):
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
    with os.fdopen(fd,"w",encoding="utf-8") as f:
        json.dump(value,f,ensure_ascii=False,separators=(",",":"))

def main():
    result="unavailable"
    try:
        key=os.environ.get("COMCIGAN_SHADOW_KEY","")
        if not re.fullmatch(r"[0-9a-f]{64}",key):
            raise ValueError("no ephemeral signing key")
        c=json.loads(Path("comcigan-config.json").read_text("utf-8"))
        code=int(c.get("schoolCode") or 0)
        identity=str(c.get("teacherName") or "")
        if not c.get("enabled") or code<=0 or len(normalized(identity))!=2:
            result="identity-invalid"
        else:
            from pycomcigan import TimeTable
            prefix=normalized(identity)
            class InspectTimeTable(TimeTable):
                def _initialize_from_data(self,data,local_code,school_name,school_code,comcigan_codes):
                    names=data["자료"+comcigan_codes[2]]
                    self.mask_matches=sum(normalized(self._format_teacher_name(n))==prefix for n in names)
                    return super()._initialize_from_data(data,local_code,school_name,school_code,comcigan_codes)
            schedule=InspectTimeTable("와부중학교",school_code=code,week_num=0)
            if schedule.mask_matches!=1:
                result="identity-invalid"
            else:
                result,candidate,hashes=build_comparison(schedule,identity,key,current_monday())
                if result=="prepared":
                    private_write("/tmp/comcigan-dual-candidate.json",candidate)
                    private_write("/tmp/comcigan-dual-hashes.json",hashes)
    except Exception:
        result="unavailable"
    print("PY_DUAL_STATUS="+(result if result in {"prepared","wrong-week","identity-invalid","scope-mismatch","invalid-data","period-conflict","unavailable"} else "unavailable"))

if __name__=="__main__":
    main()
