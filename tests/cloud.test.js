import test from 'node:test';
import assert from 'node:assert/strict';
import { LedgerStore } from '../src/cloud.js';
import { emptyState } from '../src/model.js';
function client(responses) {
  const calls = [];
  const fluent = { select(...args) { calls.push(['select', ...args]); return this; }, eq(...args) { calls.push(['eq', ...args]); return this; }, insert(...args) { calls.push(['insert', ...args]); return this; }, update(...args) { calls.push(['update', ...args]); return this; }, async maybeSingle() { return responses.shift(); } };
  return { calls, from(table) { calls.push(['from', table]); return fluent; } };
}
function row(revision, mutation = 'other') { return { revision, data: { ...emptyState(), revision }, last_mutation: mutation }; }
test('load reads only the current owner and returns a validated ledger', async () => {
  const c = client([{ data: row(3), error: null }]);
  const s = new LedgerStore(c, 'owner');
  assert.equal((await s.load()).revision, 3);
  assert.ok(c.calls.some(call => call[0] === 'eq' && call[1] === 'owner_id' && call[2] === 'owner'));
  assert.equal(s.revision, 0, 'The caller adopts a refreshed revision only when no form is open');
});
test('new owners start with an empty ledger without creating a row', async () => {
  const c = client([{ data: null, error: null }]);
  assert.deepEqual(await new LedgerStore(c, 'owner').load(), emptyState());
  assert.equal(c.calls.some(call => call[0] === 'insert'), false);
});
test('cloud read errors preserve caller state instead of returning an empty ledger', async () => {
  const c = client([{ data: null, error: { message: 'offline' } }]);
  await assert.rejects(new LedgerStore(c, 'owner').load(), /Could not load/);
});
test('first save starts revision one and retains caller data', async () => {
  const c = client([{ data: row(1), error: null }]);
  const store = new LedgerStore(c, 'owner'), original = emptyState();
  assert.equal((await store.save(original)).revision, 1);
  assert.equal(original.revision, 0);
  assert.equal(c.calls.find(call => call[0] === 'insert')[1].owner_id, 'owner');
});
test('updates compare expected server revision atomically', async () => {
  const c = client([{ data: row(5), error: null }]);
  const store = new LedgerStore(c, 'owner'); store.revision = 4;
  await store.save(emptyState());
  assert.ok(c.calls.some(call => call[0] === 'eq' && call[1] === 'revision' && call[2] === 4));
  assert.equal(store.revision, 5);
});
test('stale-device writes fail without adopting a newer revision behind the form', async () => {
  const c = client([{ data: null, error: null }, { data: row(8), error: null }]);
  const store = new LedgerStore(c, 'owner'); store.revision = 4;
  await assert.rejects(store.save(emptyState()), /Another device/);
  assert.equal(store.revision, 4);
});
test('uncertain saves require refresh rather than duplicating transactions', async () => {
  const c = client([{ data: null, error: { message: 'timeout' } }, { data: null, error: { message: 'offline' } }]);
  await assert.rejects(new LedgerStore(c, 'owner').save(emptyState()), /Could not confirm/);
});
test('invalid backups fail before any write request', async () => {
  const c = client([]), store = new LedgerStore(c, 'owner');
  await assert.rejects(store.save({ version: 99 }));
  assert.equal(c.calls.length, 0);
});
