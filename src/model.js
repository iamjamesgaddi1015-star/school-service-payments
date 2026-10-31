export const VERSION = 1;
export const emptyState = () => ({ version: VERSION, revision: 0, students: [], invoices: [], payments: [] });
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 9999 && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function cents(value) {
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Enter a positive amount with up to 2 decimal places.');
  const result = Math.round(Number(text) * 100);
  if (!Number.isSafeInteger(result) || result <= 0 || result > 100000000) throw new Error('Amount must be between ₱0.01 and ₱1,000,000.');
  return result;
}
export const money = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value / 100);
export const paid = (state, invoiceId) => state.payments.filter(p => p.invoiceId === invoiceId && !p.voided).reduce((sum, p) => sum + p.amount, 0);
export const balance = (state, invoice) => invoice.amount - paid(state, invoice.id);
export function status(state, invoice, date = today()) {
  const remaining = balance(state, invoice);
  if (remaining === 0) return 'Paid';
  if (invoice.due < date) return 'Overdue';
  return paid(state, invoice.id) > 0 ? 'Partial' : 'Unpaid';
}
const fail = message => { throw new Error(message); };
const text = (value, max) => typeof value === 'string' && value.length <= max;
const amount = value => Number.isSafeInteger(value) && value > 0 && value <= 100000000;
export function validateState(state) {
  if (!state || state.version !== VERSION || !Number.isSafeInteger(state.revision) || state.revision < 0 || !['students', 'invoices', 'payments'].every(key => Array.isArray(state[key]) && state[key].length <= 50000)) fail('Invalid or unsupported backup.');
  const ids = new Set();
  for (const entry of [...state.students, ...state.invoices, ...state.payments]) {
    if (!entry || !text(entry.id, 100) || !entry.id || ids.has(entry.id)) fail('Invalid or duplicate record ID.');
    ids.add(entry.id);
  }
  const students = new Set(state.students.map(s => s.id));
  for (const s of state.students) {
    if (!text(s.name, 120) || !s.name.trim() || !text(s.school, 120) || !text(s.route, 120) || !text(s.contact, 120) || !amount(s.fee) || typeof s.archived !== 'boolean') fail('Invalid student record.');
  }
  const invoiceIds = new Set(state.invoices.map(i => i.id));
  const periods = new Set();
  for (const i of state.invoices) {
    const key = `${i.studentId}:${i.period}`;
    if (!students.has(i.studentId) || !amount(i.amount) || !validDate(i.due) || !(typeof i.period === 'string' && /^\d{4}-\d{2}$/.test(i.period) && validDate(`${i.period}-01`)) || !text(i.note, 300) || periods.has(key)) fail('Invalid or duplicate monthly charge.');
    periods.add(key);
  }
  for (const p of state.payments) {
    if (!invoiceIds.has(p.invoiceId) || !amount(p.amount) || !validDate(p.date) || !['Cash', 'GCash', 'Bank transfer', 'Other'].includes(p.method) || !text(p.reference, 120) || typeof p.voided !== 'boolean' || !text(p.voidReason, 300) || (p.voided && !p.voidReason.trim())) fail('Invalid payment record.');
  }
  for (const i of state.invoices) if (paid(state, i.id) > i.amount) fail('Payments exceed the charge amount.');
  return state;
}
export function addPayment(state, payment, date = today()) {
  const invoice = state.invoices.find(i => i.id === payment.invoiceId);
  if (!invoice) fail('Choose a valid charge.');
  if (!validDate(payment.date) || payment.date > date) fail('Payment date cannot be in the future.');
  if (!amount(payment.amount) || payment.amount > balance(state, invoice)) fail('Payment must be positive and cannot exceed the remaining balance.');
  const next = structuredClone(state);
  next.payments.push({ ...payment, voided: false, voidReason: '' });
  return validateState(next);
}
export function createCharges(state, { period, due, note, id }) {
  if (!validDate(`${period}-01`) || !validDate(due)) fail('Enter a valid service month and due date.');
  const next = structuredClone(state);
  for (const s of next.students.filter(s => !s.archived)) {
    if (!next.invoices.some(i => i.studentId === s.id && i.period === period)) next.invoices.push({ id: id(), studentId: s.id, period, due, amount: s.fee, note });
  }
  return validateState(next);
}
export function metrics(state, period) {
  const invoices = state.invoices.filter(i => !period || i.period === period);
  const billed = invoices.reduce((sum, i) => sum + i.amount, 0);
  const collected = invoices.reduce((sum, i) => sum + paid(state, i.id), 0);
  return { billed, collected, outstanding: billed - collected, paidCount: invoices.filter(i => balance(state, i) === 0).length, total: invoices.length, overdue: invoices.filter(i => status(state, i) === 'Overdue').reduce((sum, i) => sum + balance(state, i), 0) };
}
export function csv(rows) {
  return '\ufeff' + rows.map(row => row.map(cell => {
    let value = String(cell ?? '');
    if (/^[\s]*[=+\-@\t\r]/.test(value)) value = `'${value}`;
    return `"${value.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
}
