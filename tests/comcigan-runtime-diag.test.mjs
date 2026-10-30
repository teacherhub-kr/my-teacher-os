import test from 'node:test';
import assert from 'node:assert/strict';
import { upstreamFailureFingerprint } from '../scripts/comcigan-runtime-diag.mjs';

test('only fixed error class and package line are returned', () => {
  const e = new TypeError("Cannot read properties of undefined (reading 'secret student')");
  e.stack = "TypeError: secret student\n at ComciganTeacher.getTimetable (/home/runner/work/node_modules/comcigan/dist/teacher.js:152:30)";
  const value = upstreamFailureFingerprint(e);
  assert.equal(value, 'undefined-read-line-152');
  assert.doesNotMatch(value, /secret|student|teacher\.js|runner/);
});
test('safely handles other errors and unrelated stacks', () => {
  assert.equal(upstreamFailureFingerprint(new TypeError('x is not a function')), 'not-function-line-none');
  assert.equal(upstreamFailureFingerprint(new TypeError('PRIVATE')), 'other-typeerror-line-none');
  assert.equal(upstreamFailureFingerprint(null), 'other-line-none');
});
test('rejects unreasonable line numbers', () => {
  const e = new TypeError('Cannot read properties of null');
  e.stack = 'TypeError: confidential\nat fn (/node_modules/comcigan/lib/index.js:99999999999:2)';
  assert.equal(upstreamFailureFingerprint(e),'null-read-line-none');
});
