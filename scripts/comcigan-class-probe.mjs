import { failureKind } from './comcigan-diagnostics.mjs';

// Read-only diagnostic: return only a fixed status code, never timetable data.
export async function probeClassReader(Reader, schoolCode, maxMs=12000) {
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
      return Object.keys(timetable).some(x => /^[123]$/.test(x)) ? 'ok' : 'invalid-shape';
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
