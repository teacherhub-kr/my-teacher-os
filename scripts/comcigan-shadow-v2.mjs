import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Read-only alternative parser probe. Never export/print raw upstream responses,
// teacher identities, school identifiers, lesson details, or student information.
const ALLOWED = new Set(['both-readable','invalid-shape','empty','not-supported','unavailable','timeout','first-read-failed','second-read-failed','config-unavailable']);

export function classifyClassResult(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.timetable) || value.timetable.length !== 5) return 'invalid-shape';
  if (!Array.isArray(value.times)) return 'invalid-shape';
  let count=0;
  for (const day of value.timetable) {
    if (!day || !Number.isSafeInteger(day.total) || day.total < 0 || day.total > 10 || !Array.isArray(day.items) || day.items.length !== day.total) return 'invalid-shape';
    for (const item of day.items) {
      if (!item || typeof item !== 'object' || typeof item.subject !== 'string' || typeof item.teacher !== 'string') return 'invalid-shape';
    }
    count += day.total;
  }
  return count ? 'readable' : 'empty';
}
export async function bounded(operation, ms=25000) {
  let timer;
  return Promise.race([
    Promise.resolve().then(operation),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('deadline')),ms);})
  ]).finally(()=>clearTimeout(timer));
}
export async function probeReader(Reader, code, timeoutMs=25000) {
  if (typeof Reader !== 'function') return 'not-supported';
  if (!Number.isSafeInteger(code) || code <= 0) return 'config-unavailable';
  let client;
  try { client = new Reader(code); } catch { return 'unavailable'; }
  // Two non-identifying samples; cannot verify the teacher's 15 periods.
  // Do not use compressed per-day items to infer period numbers.
  for (const [index, selection] of [[2,1],[3,4]].entries()) {
    let result;
    try {
      result=await bounded(()=>client.timetable({grade:selection[0],classNum:selection[1],week:1}),timeoutMs);
    } catch (e) {
      if (e instanceof Error && e.message==='deadline') return 'timeout';
      return index===0 ? 'first-read-failed' : 'second-read-failed';
    }
    const verdict=classifyClassResult(result);
    if(verdict!=='readable')return verdict;
  }
  return 'both-readable';
}
async function main() {
  let outcome='unavailable';
  try {
    const config=JSON.parse(await fs.readFile('comcigan-config.json','utf8'));
    if(config?.enabled && Number.isSafeInteger(Number(config.schoolCode)) && Number(config.schoolCode)>0) {
      const mod=await import('parse-comcigan');
      outcome=await probeReader(mod.default,Number(config.schoolCode));
    }else outcome='config-unavailable';
  } catch { outcome='unavailable'; }
  // Never include the package's raw error messages in action logs.
  process.stdout.write('SHADOW_V2='+ (ALLOWED.has(outcome)?outcome:'unavailable')+'\n');
  process.stdout.write('SHADOW_PUBLICATION=blocked\n');
  process.exit(0);
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  await main();
}
