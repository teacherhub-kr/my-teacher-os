import { failureKind } from './comcigan-diagnostics.mjs';

// Read-only diagnostic: return only a fixed status code, never timetable data.
export async function probeClassReader(Reader, schoolCode, maxMs=12000, teacherName='') {
  if (typeof Reader !== 'function') return 'unavailable';
  let timer;
  try {
    const operation = (async () => {
      const client = new Reader();
      await client.init();
      if (typeof client.setSchoolCode !== 'function') return 'unsupported';
      client.setSchoolCode(schoolCode);
      const timetable = await client.getTimetable();
      if (!timetable || typeof timetable !== 'object' || Array.isArray(timetable)) return 'invalid-shape';
      return Object.keys(timetable).some(x => /^[123]$/.test(x)) ? (teacherName ? 'ok-' + classifyMusicTeacherCoverage(timetable,teacherName) : 'ok') : 'invalid-shape';
    })();
    return await Promise.race([operation, new Promise(resolve => {
      timer = setTimeout(() => resolve('timeout'), maxMs);
    })]);
  } catch(error) {
    return 'error-' + failureKind(error);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Conservative teacher-coverage check for a non-identifying diagnostic.
 * Never exports a teacher name, school code, roster or timetable.
 */
export function classifyMusicTeacherCoverage(raw, maskedName) {
  const prefix = String(maskedName || '').replace(/\*/g,'').replace(/\s+/g,'').trim();
  if (prefix.length !== 2) return 'invalid-identity';
  const expected = new Set([
    ...Array.from({length:9},(_,i) => '2-' + (i+1)),
    ...Array.from({length:6},(_,i) => '3-' + (i+4))
  ]);
  const matched = [], unique = new Set();
  for (const [grade, rooms] of Object.entries(raw || {})) {
    if (!/^[23]$/.test(grade) || !rooms || typeof rooms !== 'object') continue;
    for (const [room, days] of Object.entries(rooms)) {
      if (!/^\d+$/.test(room) || !days || typeof days !== 'object') continue;
      for (const [day, lessons] of Object.entries(days)) {
        if (!/^[1-5]$/.test(day) || !lessons || typeof lessons !== 'object') continue;
        for (const [period, item] of Object.entries(lessons)) {
          if (!/^[1-9]$/.test(period) || !item || typeof item !== 'object') continue;
          const teacher = String(item.teacher || '').replace(/\*/g,'').replace(/\s+/g,'');
          const subject = String(item.subject || '').replace(/\s+/g,'');
          if (teacher !== prefix || !subject.includes('음악')) continue;
          const target = grade + '-' + Number(room);
          const key = day + '-' + period;
          matched.push(target);
          if (!expected.has(target) || unique.has(target) || unique.has('slot:' + key)) return 'ambiguous';
          if (item.grd != null && Number(item.grd) !== Number(grade)) return 'ambiguous';
          if (item.cls != null && Number(item.cls) !== Number(room)) return 'ambiguous';
          unique.add(target);
          unique.add('slot:' + key);
        }
      }
    }
  }
  if (matched.length === 0) return 'none';
  if (matched.length === expected.size && expected.size === matched.filter(x => expected.has(x)).length) return 'complete';
  return 'partial';
}
