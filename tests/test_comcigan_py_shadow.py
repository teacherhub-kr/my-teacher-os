import unittest
from datetime import date
from types import SimpleNamespace as NS
from scripts.comcigan_py_shadow import EXPECTED, inspect_schedule

MONDAY = date(2026, 11, 16)

def fake_schedule(missing=None, multi=None, conflict=False, beginning="2026-11-16"):
    rooms = [[None] for _ in range(4)]
    for grade, room in EXPECTED:
        while len(rooms[grade]) <= room:
            rooms[grade].append(None)
    for index, (grade, room) in enumerate(EXPECTED):
        day_hit, period_hit = index // 3 + 1, index % 3 + 1
        if conflict and index == 1:
            day_hit, period_hit = 1, 1
        weekdays = [None]
        for day in range(1,6):
            lessons = []
            for period in range(1,9):
                teacher = "가나*" if day == day_hit and period == period_hit else "다라*"
                if missing == (grade, room):
                    teacher = "다라*"
                subject = "음악" if teacher == "가나*" else "수학"
                lessons.append(NS(period=period, teacher=teacher, subject=subject))
            if multi == (grade, room) and day == 5:
                lessons[7] = NS(period=8,teacher="가나*",subject="음악")
            weekdays.append(lessons)
        rooms[grade][room] = weekdays
    return NS(start_date=beginning,timetable=rooms)

class ShadowTests(unittest.TestCase):
    def test_expected_classes(self):
        self.assertEqual(len(EXPECTED), 15)
        self.assertEqual(len(set(EXPECTED)), 15)
    def test_15_one_per_class_distinct_period(self):
        self.assertEqual(inspect_schedule(fake_schedule(),"가나*",MONDAY),("coverage-15",(0,15,0)))
    def test_missing(self):
        self.assertEqual(inspect_schedule(fake_schedule(missing=(2,1)),"가나*",MONDAY),("missing-class",(1,14,0)))
    def test_multiple(self):
        self.assertEqual(inspect_schedule(fake_schedule(multi=(2,1)),"가나*",MONDAY),("ambiguous-class",(0,14,1)))
    def test_conflict(self):
        self.assertEqual(inspect_schedule(fake_schedule(conflict=True),"가나*",MONDAY),("period-conflict",(0,15,0)))
    def test_old_week_rejected(self):
        self.assertEqual(inspect_schedule(fake_schedule(beginning="2026-11-02"),"가나*",MONDAY),("wrong-week",None))
    def test_private_inputs_never_returned(self):
        code = inspect_schedule(fake_schedule(),"가나*",MONDAY)[0]
        self.assertNotIn("가나",code)
        self.assertNotIn("와부",code)

if __name__ == "__main__":
    unittest.main()
