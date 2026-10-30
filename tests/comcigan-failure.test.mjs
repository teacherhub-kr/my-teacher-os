import test from 'node:test';
import assert from 'node:assert/strict';
import { failureKind } from '../scripts/comcigan-diagnostics.mjs';

test('classifies HTTP status and message-only status without leaking details', () => {
  assert.equal(failureKind({response:{status:429}}), 'rate-limit');
  assert.equal(failureKind(new Error('Request failed with status code 403 at private URL')), 'upstream-denied');
  assert.equal(failureKind({cause:{status:502}}), 'upstream-5xx');
});
test('classifies nested transport and parser failures', () => {
  assert.equal(failureKind({cause:{code:'ENOTFOUND'}}), 'dns');
  assert.equal(failureKind(new Error('fetch failed',{cause:{code:'UND_ERR_CONNECT_TIMEOUT'}})), 'connection');
  assert.equal(failureKind(new SyntaxError('Unexpected token')), 'parse');
});
test('unknown exceptions remain unclassified, not falsely successful', () => {
  assert.equal(failureKind(new Error('unknown upstream rejection')), 'exception-error');
  assert.equal(failureKind(null), 'unclassified');
});

test('unknown thrown types are categorized with fixed safe labels', () => {
  assert.equal(failureKind(new TypeError('private URL and student')), 'exception-typeerror');
  assert.equal(failureKind(new ReferenceError('private teacher')), 'exception-referenceerror');
  assert.equal(failureKind(new RangeError('private source')), 'exception-rangeerror');
  assert.equal(failureKind('student name'), 'throw-string');
  assert.equal(failureKind({school:'private source'}), 'throw-object');
  assert.ok(!failureKind(new TypeError('private')).includes('private'));
});
