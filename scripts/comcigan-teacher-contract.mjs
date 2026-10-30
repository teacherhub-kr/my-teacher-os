/**
 * Safe adapter for comcigan@3.0.4:
 * ComciganTeacher.init() exposes teacherIndices; getTimetable(index)
 * returns an object keyed by the selected index. Neither names nor the
 * source response should be written to public GitHub data.
 */
export function resolveTeacherIndex(teacherIndices, configuredIndex, maskedName) {
  if (!Array.isArray(teacherIndices) || teacherIndices.length < 2) return {ok:false,code:'teacher-indices-missing'};
  const norm = value => String(value||'').trim().replace(/\s+/g,'').replace(/\*+$/g,'');
  const name=norm(maskedName);
  if (name.length!==2) return {ok:false,code:'config-invalid'};
  const matches=teacherIndices.map((value,index)=>({index,name:norm(value)}))
    .filter(x=>x.index>0 && x.name===name);
  if (!matches.length) return {ok:false,code:'teacher-name-not-found'};
  if (matches.length!==1) return {ok:false,code:'teacher-name-multiple'};
  const index=matches[0].index;
  const preferred=Number(configuredIndex);
  if (Number.isInteger(preferred) && preferred>0 && teacherIndices[preferred] && preferred!==index) {
    // A uniquely matching current name takes precedence over an obsolete index.
    // No automatic acceptance of a *second* masked-name candidate.
    if (norm(teacherIndices[preferred])===name) return {ok:false,code:'teacher-name-multiple'};
  }
  return {ok:true,index};
}

export function selectTeacherDays(result, selectedIndex) {
  const days=result?.[selectedIndex] ?? result?.[String(selectedIndex)];
  if (!days || typeof days!=='object' || Array.isArray(days)) return null;
  if (![1,2,3,4,5].some(day => days[day] && typeof days[day]==='object')) return null;
  return days;
}

export function validateMusicSchedule(slots) {
  const expected=new Set([
    ...Array.from({length:9},(_,i)=>'2-'+(i+1)),
    ...Array.from({length:6},(_,i)=>'3-'+(i+4))
  ]);
  if (!Array.isArray(slots) || slots.length!==15) return false;
  const targets=new Set(),timeSlots=new Set();
  for (const s of slots) {
    if (!s || !expected.has(s.target) || targets.has(s.target)) return false;
    if (!['월','화','수','목','금'].includes(s.day) ||
        !Number.isInteger(s.period) || s.period<1 || s.period>8) return false;
    const time=s.date+'|'+s.period;
    if (timeSlots.has(time)) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s.date||''))) return false;
    if (typeof s.subject!=='string' || !s.subject.includes('음악') || s.subject.length>32) return false;
    if (typeof s.label!=='string' || s.label!==s.target+' '+s.subject) return false;
    targets.add(s.target);
    timeSlots.add(time);
  }
  return targets.size===15 && [...expected].every(t=>targets.has(t));
}

export function makePublicTimetable(weekStart,fetchedAt,slots) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || !Number.isFinite(Date.parse(fetchedAt)) ||
      !validateMusicSchedule(slots)) return null;
  // Deliberately do not return teacher name, index, school code or raw data.
  return {version:2,weekStart,fetchedAt,slots};
}

/** Returns only a fixed failure category, never classes, subjects or times. */
export function scheduleFailureReason(slots) {
  if (!Array.isArray(slots) || slots.length===0) return 'empty';
  if (slots.length<15) return 'too-few';
  if (slots.length>15) return 'too-many';
  const targetSet=new Set(),periodSet=new Set(),expected=new Set([
    ...Array.from({length:9},(_,i)=>'2-'+(i+1)),
    ...Array.from({length:6},(_,i)=>'3-'+(i+4))
  ]);
  for (const s of slots) {
    if (!s || !expected.has(s.target)) return 'scope';
    if (targetSet.has(s.target)) return 'duplicate-class';
    if (!['월','화','수','목','금'].includes(s.day) ||
        !Number.isInteger(s.period)||s.period<1||s.period>8 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(String(s.date||''))) return 'invalid-time';
    const key=s.date+'|'+s.period;
    if(periodSet.has(key))return 'period-conflict';
    if(typeof s.subject!=='string'||!s.subject.includes('음악')||s.subject.length>32)return 'nonmusic';
    if(typeof s.label!=='string'||s.label!==s.target+' '+s.subject)return 'invalid-label';
    targetSet.add(s.target);periodSet.add(key);
  }
  if (targetSet.size!==expected.size) return 'coverage';
  return 'ok';
}
