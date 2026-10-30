/**
 * Only emits allowlisted failure categories. Never log upstream response data,
 * teacher names, URLs, cookies or exception messages from the collector.
 */
export function failureKind(error) {
  const chain = [];
  let cursor = error;
  for (let i = 0; cursor != null && i < 4; i++) {
    chain.push(cursor);
    if (typeof cursor !== 'object') break;
    cursor = cursor.cause;
  }
  const statuses = chain.map(e => Number(e?.response?.status ?? e?.status ?? e?.statusCode ?? 0));
  const message = chain.map(e => typeof e === 'string' ? e : String(e?.message ?? '')).join(' ').slice(0, 800);
  const inlineStatus = /(?:\bstatus(?:\s+code)?\s*[:=]?\s*|\bhttp\s+)([1-5]\d\d)\b/i.exec(message);
  if (inlineStatus) statuses.push(Number(inlineStatus[1]));
  if (statuses.includes(429)) return 'rate-limit';
  if (statuses.some(s => s === 401 || s === 403)) return 'upstream-denied';
  if (statuses.some(s => s >= 500 && s <= 599)) return 'upstream-5xx';
  if (statuses.some(s => s >= 400 && s <= 499)) return 'upstream-4xx';

  const codes = chain.map(e => typeof e === 'object' ? String(e?.code ?? e?.errno ?? '').toUpperCase() : '');
  if (codes.some(c => ['ENOTFOUND','EAI_AGAIN'].includes(c))) return 'dns';
  if (codes.some(c => ['ETIMEDOUT','ECONNRESET','ECONNREFUSED','EHOSTUNREACH','ENETUNREACH',
                      'UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_SOCKET',
                      'ABORT_ERR','ECONNABORTED'].includes(c))) return 'connection';
  if (chain.some(e => e instanceof SyntaxError)) return 'parse';
  if (/\b(?:ENOTFOUND|EAI_AGAIN|DNS lookup failed)\b/i.test(message)) return 'dns';
  if (/\b(?:timeout|timed out|network error|fetch failed|socket hang up|ECONNRESET|ECONNREFUSED)\b/i.test(message)) return 'connection';
  if (/\b(?:captcha|cloudflare|access denied|forbidden|blocked by)\b/i.test(message)) return 'upstream-denied';
  if (/\b(?:invalid json|unexpected token|not valid json|json parse|parse error)\b/i.test(message)) return 'parse';
  return 'unclassified';
}
