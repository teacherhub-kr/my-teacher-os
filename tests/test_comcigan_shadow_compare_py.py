import unittest
from datetime import date
from types import SimpleNamespace as NS
from scripts.comcigan_shadow_compare_py import item_digest,build_comparison
from scripts.comcigan_py_shadow import EXPECTED

class DualPythonTests(unittest.TestCase):
    def test_digest_does_not_contain_raw_names(self):
        token=item_digest("음악","가나*","a"*64)
        self.assertEqual(len(token),64)
        self.assertNotIn("가나",token)
    def test_candidate_never_includes_teacher_identity(self):
        classes=[[None] for _ in range(4)]
        for grade,room in EXPECTED:
            while len(classes[grade])<=room:classes[grade].append(None)
        for i,(grade,room) in enumerate(EXPECTED):
            weekdays=[None]
            for day in range(1,6):
                periods=[]
                for period in range(1,9):
                    active=(day==i//3+1 and period==i%3+1)
                    periods.append(NS(period=period,subject="음악" if active else "수학",teacher="가나*" if active else "다라*",replaced=False))
                weekdays.append(periods)
            classes[grade][room]=weekdays
        schedule=NS(start_date="2026-11-16",timetable=classes)
        result,candidate,hashes=build_comparison(schedule,"가나*","a"*64,date(2026,11,16))
        self.assertEqual(result,"prepared")
        self.assertEqual(len(candidate["slots"]),15)
        self.assertEqual(len(hashes),15)
        self.assertNotIn("가나",str(candidate))
        self.assertNotIn("다라",str(candidate))
    def test_wrong_week_blocks(self):
        schedule=NS(start_date="2026-11-02",timetable=[])
        self.assertEqual(build_comparison(schedule,"가나*","a"*64,date(2026,11,16))[0],"wrong-week")

if __name__=="__main__":
    unittest.main()
