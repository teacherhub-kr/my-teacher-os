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

// Valid current-week lessons may be fewer than enrolled classes due to holidays,
// events or temporary school timetable changes. They still require cross-view verification.
export function validateMusicSchedule(slots) {
  return scheduleFailureReason(slots)==='ok';
}

export function makePublicTimetable(weekStart,fetchedAt,slots,crosscheck) {
  if (crosscheck!=='match' || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || !Number.isFinite(Date.parse(fetchedAt)) ||
      !validateMusicSchedule(slots)) return null;
  // Deliberately do not return teacher name, index, school code or raw data.
  return {version:2,weekStart,fetchedAt,slots};
}

/** Returns only a fixed failure category, never classes, subjects or times. */
export function scheduleFailureReason(slots) {
  if (!Array.isArray(slots)||!slots.length) return 'empty';
  if (slots.length>40) return 'too-many';
  const permitted=new Set([
    ...Array.from({length:9},(_,i)=>'2-'+(i+1)),
    ...Array.from({length:6},(_,i)=>'3-'+(i+4))
  ]);
  const periods=new Set(),records=new Set();
  for(const s of slots){
    if(!s||!permitted.has(s.target))return 'scope';
    if(!['월','화','수','목','금'].includes(s.day)||
       !Number.isInteger(s.period)||s.period<1||s.period>8||
       !/^\d{4}-\d{2}-\d{2}$/.test(String(s.date||'')))return 'invalid-time';
    const when=s.date+'|'+s.period;
    const record=when+'|'+s.target;
    if(periods.has(when))return 'period-conflict';
    if(records.has(record))return 'duplicate-class';
    if(typeof s.subject!=='string'||!s.subject.trim()||s.subject.length>32)return 'invalid-subject';
    if(typeof s.label!=='string'||s.label!==s.target+' '+s.subject)return 'invalid-label';
    if(s.source!=='컴시간 자동동기화')return 'source-invalid';
    periods.add(when);records.add(record);
  }
  return 'ok';
}
