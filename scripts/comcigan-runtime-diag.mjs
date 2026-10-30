/**
 * Fail-closed error fingerprint: no original message/stack, teacher data or URL
 * is returned. The only variable number is a source line of the installed
 * public comcigan npm package, useful to debug a stale parser.
 */
export function upstreamFailureFingerprint(error) {
  const message = typeof error?.message === 'string' ? error.message : '';
  let mode = 'unknown';
  if (/Cannot read (?:properties|property) of undefined/i.test(message)) mode = 'undefined-read';
  else if (/Cannot read (?:properties|property) of null/i.test(message)) mode = 'null-read';
  else if (/is not a function/i.test(message)) mode = 'not-function';
  else if (/not iterable|is not iterable/i.test(message)) mode = 'not-iterable';
  else if (/Cannot (?:set|assign|create) .*undefined/i.test(message)) mode = 'undefined-write';
  else if (error instanceof TypeError) mode = 'other-typeerror';
  else mode = 'other';

  const stack = typeof error?.stack === 'string' ? error.stack : '';
  const match = stack.match(/(?:^|\n)\s*at [^\n]*?(?:\/|\\)node_modules(?:\/|\\)comcigan(?:\/|\\)[^\n:()]*?:(\d+):\d+/i);
  const line = match ? Number(match[1]) : 0;
  const loc = Number.isSafeInteger(line) && line > 0 && line < 100000 ? String(line) : 'none';
  return mode + '-line-' + loc;
}
