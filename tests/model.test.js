import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, cents, validDate, validateState, createCharges, addPayment, paid, balance, metrics, status, csv } from '../src/model.js';
function fixture() {
  const s = emptyState();
  s.students.push({ id: 'student-1', name: 'Sample Student', school: 'Sample School', route: '', contact: '', fee: 150000, archived: false });
  let id = 0;
  return createCharges(s, { period: '2026-10', due: '2026-10-10', note: '', id: () => `invoice-${++id}` });
}
const payment = (overrides = {}) => ({ id: 'payment-1', invoiceId: 'invoice-1', amount: 50000, date: '2026-10-05', method: 'Cash', reference: '', ...overrides });
test('money uses exact centavos and rejects invalid or excessive amounts', () => {
  assert.equal(cents('1200.35'), 120035);
  assert.equal(cents('0.01'), 1);
  for (const value of ['0', '-1', '1.001', 'NaN', 'Infinity', '1e3', '1000000.01', '']) assert.throws(() => cents(value));
});
test('date-only validation handles real calendar boundaries', () => {
  assert.equal(validDate('2024-02-29'), true);
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '1899-01-01', '2026-1-1', '']) assert.equal(validDate(date), false);
});
test('monthly charge creation skips existing charges and archived students', () => {
  const s = fixture();
  s.students.push({ ...s.students[0], id: 'archived', archived: true });
  const next = createCharges(s, { period: '2026-10', due: '2026-10-12', note: '', id: () => 'another' });
  assert.equal(next.invoices.length, 1);
  assert.equal(next.invoices[0].due, '2026-10-10');
  assert.equal(s.invoices.length, 1);
});
test('partial payments update balance and classify overdue by Philippine date', () => {
  const s = addPayment(fixture(), payment(), '2026-10-20');
  assert.equal(paid(s, 'invoice-1'), 50000);
  assert.equal(balance(s, s.invoices[0]), 100000);
  assert.equal(status(s, s.invoices[0], '2026-10-10'), 'Partial');
  assert.equal(status(s, s.invoices[0], '2026-10-11'), 'Overdue');
});
test('a full settlement marks the charge paid even after its due date', () => {
  const s = addPayment(fixture(), payment({ amount: 150000 }), '2026-10-20');
  assert.equal(status(s, s.invoices[0], '2026-10-20'), 'Paid');
  assert.deepEqual(metrics(s, '2026-10'), { billed: 150000, collected: 150000, outstanding: 0, paidCount: 1, total: 1, overdue: 0 });
});
test('overpayments, future dates, unknown charges, and duplicate payment IDs are rejected', () => {
  for (const p of [payment({ amount: 150001 }), payment({ date: '2026-10-21' }), payment({ invoiceId: 'missing' })]) assert.throws(() => addPayment(fixture(), p, '2026-10-20'));
  const s = addPayment(fixture(), payment(), '2026-10-20');
  assert.throws(() => addPayment(s, payment(), '2026-10-20'));
});
test('voiding preserves history and restores the outstanding balance', () => {
  const s = addPayment(fixture(), payment(), '2026-10-20');
  s.payments[0].voided = true; s.payments[0].voidReason = 'Wrong amount recorded';
  validateState(s);
  assert.equal(paid(s, 'invoice-1'), 0);
  assert.equal(balance(s, s.invoices[0]), 150000);
  assert.equal(s.payments.length, 1);
});
test('changing a student fee never rewrites historical charges', () => {
  const s = fixture(); s.students[0].fee = 180000;
  const next = createCharges(s, { period: '2026-11', due: '2026-11-10', note: '', id: () => 'invoice-2' });
  assert.deepEqual(next.invoices.map(i => i.amount), [150000, 180000]);
});
test('monthly metrics use service month even when payment arrives in another month', () => {
  const s = addPayment(fixture(), payment({ date: '2026-11-02' }), '2026-11-02');
  assert.equal(metrics(s, '2026-10').collected, 50000);
  assert.equal(metrics(s, '2026-11').collected, 0);
});
test('backup validation rejects orphaned records, malformed values, duplicates and overpayments', () => {
  const mutations = [s => s.version = 2, s => s.students[0].name = '', s => s.invoices[0].studentId = 'missing', s => s.invoices[0].period = ['2026-10'], s => s.invoices.push({ ...s.invoices[0], id: 'invoice-2' }), s => s.payments.push({ ...payment({ amount: 150001 }), voided: false, voidReason: '' }), s => s.invoices[0].due = '2026-02-30'];
  for (const mutate of mutations) { const s = fixture(); mutate(s); assert.throws(() => validateState(s)); }
});
test('JSON backups round-trip complete records', () => {
  const s = addPayment(fixture(), payment(), '2026-10-20');
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))), s);
});
test('CSV quotes delimiters and neutralizes spreadsheet formula injection', () => {
  const output = csv([['=HYPERLINK("bad")', 'A, B', 'line\nnext', '@SUM(1)', 'Normal']]);
  assert.ok(output.startsWith('\ufeff"\'=HYPERLINK'));
  assert.ok(output.includes('"A, B"'));
  assert.ok(output.includes('"\'@SUM(1)"'));
  assert.ok(output.includes('"line\nnext"'));
});
