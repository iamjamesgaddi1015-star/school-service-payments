import { supabase, LedgerStore } from './cloud.js';
import { emptyState, today, validDate, cents, money, paid, balance, status, validateState, addPayment, createCharges, metrics, csv } from './model.js';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const uid = () => crypto.randomUUID();
const dateLabel = value => new Intl.DateTimeFormat('en-PH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(`${value}T00:00:00+08:00`));
const monthLabel = value => new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T12:00:00`));
const initials = name => name.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
let state = emptyState();
let blocked = false;
let period = today().slice(0, 7);
let page = 1;
let query = '';
let filter = 'All';
let sort = 'due';
let view = 'dashboard';
let opener = null;
let draft = null;
let closing = false;
let toastTimer;
const names = { dashboard: 'Overview', students: 'Students', charges: 'Monthly charges', payments: 'Payment history', backup: 'Backups & exports' };
function warning(message) { const el = $('#storage-warning'); el.textContent = message; el.hidden = false; }
function notify(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  toastTimer = setTimeout(() => { $('#toast').textContent = ''; }, 6500);
}
let store = null;
let currentUser = null;
let loaded = false;
let saving = false;
let refreshing = false;
let accountGeneration = 0;
async function commit(next) {
  if (!loaded || !store || saving || refreshing) throw new Error('Wait for your ledger to load before saving.');
  if (!navigator.onLine) throw new Error('You are offline. Reconnect before saving; your entry is still in this form.');
  saving = true;
  syncLabel('Saving…');
  try {
    const generation = accountGeneration;
    const saved = await store.save(next);
    if (generation !== accountGeneration) throw new Error('Your account changed during this save. Sign in and Refresh to check the ledger.');
    state = saved;
    $('#storage-warning').hidden = true;
    syncLabel('Saved to cloud');
  } catch (error) { syncLabel('Save needs attention'); throw error; }
  finally { saving = false; }
}
function syncLabel(message) { $('#sync-label').textContent = message; }
async function refreshLedger(manual = false) {
  if (!store || saving || refreshing || ($('#modal').open && !manual)) return;
  refreshing = true;
  const generation = accountGeneration;
  syncLabel('Syncing…');
  try {
    const next = await store.load();
    if (generation !== accountGeneration) return;
    const changed = state.revision !== next.revision || !loaded;
    if ($('#modal').open && loaded) return;
    store.revision = next.revision;
    state = next; loaded = true; blocked = false;
    $('#storage-warning').hidden = true;
    syncLabel('Synced to cloud');
    if (changed || manual) render();
    if (manual) notify('Latest ledger loaded.');
  } catch (error) {
    if (generation === accountGeneration) { warning(error.message); syncLabel('Sync unavailable'); if (!loaded) render(); }
  } finally { refreshing = false; }
}
function authScreen(message = '') {
  $('#main').innerHTML = `<section class="auth-layout"><div class="auth-story"><div class="auth-story-copy"><span class="auth-wordmark">Service ledger</span><h2>A little less paperwork.<br>A clearer school run.</h2><p>Your students, monthly charges and collections, together in one private ledger.</p></div><img src="/assets/school-route.png" alt="" width="1672" height="941" fetchpriority="high"><p class="auth-story-note">Made for the everyday school run.</p></div><div class="auth-panel"><h1>Sign in to your ledger</h1><p class="subtitle">Keep every collection accounted for.</p><form id="auth-form" novalidate><p class="form-error" id="auth-error" role="alert" tabindex="-1">${esc(message)}</p><div class="form-grid">${field('email', 'Email address', 'email', '', 'required autocomplete="email"', true)}${field('password', 'Password', 'password', '', 'required autocomplete="current-password"', true)}<div class="field full"><button type="button" class="button small" id="show-password" aria-pressed="false">Show password</button></div></div><div class="form-actions"><button type="submit" class="button primary" name="intent" value="login">Sign in</button><button type="submit" class="button" name="intent" value="signup">Create account</button></div><p class="muted"><small>New account? Use at least 12 characters. Confirm your email before signing in. Each account has a separate private ledger.</small></p></form></div></section>`;
  $('#auth-form').querySelectorAll('input').forEach(el => el.setAttribute('aria-describedby', 'auth-error'));
  $('#show-password').onclick = () => { const input = $('[name=password]'); const show = input.type === 'password'; input.type = show ? 'text' : 'password'; $('#show-password').textContent = show ? 'Hide password' : 'Show password'; $('#show-password').setAttribute('aria-pressed', String(show)); };
  $('#auth-form').onsubmit = async event => {
    event.preventDefault();
    const entry = event.currentTarget;
    const email = entry.elements.email.value.trim(), password = entry.elements.password.value;
    const signup = event.submitter?.value === 'signup';
    const errorEl = $('#auth-error'); errorEl.textContent = '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || (signup && password.length < 12)) { errorEl.textContent = 'Enter a valid email and password. New passwords must have at least 12 characters.'; errorEl.focus(); return; }
    entry.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try {
      const result = signup ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.origin } }) : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw new Error(result.error.message);
      if (signup && !result.data.session) { errorEl.textContent = 'Check your email to confirm your account, then return here and sign in. If delivery fails, contact the app owner to configure Supabase email delivery.'; entry.elements.password.value = ''; }
    } catch (error) { errorEl.textContent = error.message || 'Sign-in failed. Check your connection and try again.'; errorEl.focus(); }
    finally { entry.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
  };
}
async function setAccount(user) {
  if (user?.id === currentUser?.id && user) return;
  accountGeneration++;
  currentUser = user || null;
  document.body.classList.toggle('signed-out', !user);
  store = user ? new LedgerStore(supabase, user.id) : null;
  state = emptyState(); loaded = false; saving = false;
  $('#account-actions').hidden = !user;
  $('#account-email').textContent = user?.email || 'Sign in to your ledger';
  $('#print-receipt').innerHTML = '';
  $('#toast').textContent = '';
  if ($('#modal').open) close();
  render();
  if (user) await refreshLedger();
  else syncLabel('Sign-in required');
}
setInterval(() => { if (document.visibilityState === 'visible') refreshLedger(); }, 15000);
window.addEventListener('focus', () => refreshLedger());
window.addEventListener('online', () => refreshLedger());
window.addEventListener('offline', () => { syncLabel('Offline · changes require internet'); });
const student = id => state.students.find(s => s.id === id);
const invoice = id => state.invoices.find(i => i.id === id);
const badge = text => `<span class="status ${text.toLowerCase()}">${esc(text)}</span>`;
const button = (label, action, id = '', classes = '') => `<button type="button" class="button ${classes}" data-action="${action}" data-id="${esc(id)}">${label}</button>`;
const studentCell = s => `<div class="student-cell"><span class="avatar" aria-hidden="true">${esc(initials(s.name))}</span><div><strong>${esc(s.name)}</strong><span class="detail">${esc(s.school || 'School not set')}${s.archived ? ' · Archived' : ''}</span></div></div>`;
const empty = (title, description, action = '') => `<div class="empty"><div class="empty-symbol" aria-hidden="true">▤</div><h3>${title}</h3><p>${description}</p>${action}</div>`;
function heading(title, subtitle, actions = '') { return `<div class="page-heading"><div><h1>${title}</h1><p class="subtitle">${subtitle}</p></div><div class="actions">${actions}</div></div>`; }
function periodBar() { return `<div class="period-bar"><div><label for="period">Service month</label><input type="month" id="period" value="${period}" min="1900-01" max="9999-12"></div><div class="period-caption">Charges and collections for this service month</div></div>`; }
function kpi(label, value, foot, featured = false) { return `<article class="kpi ${featured ? 'featured' : ''}"><div class="kpi-title">${label}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></article>`; }
function pagination(total) {
  const pages = Math.max(1, Math.ceil(total / 10));
  return `<div class="pagination"><span>${total ? (page - 1) * 10 + 1 : 0}–${Math.min(page * 10, total)} of ${total} records</span><div class="actions"><button class="button small" data-action="previous" ${page === 1 ? 'disabled' : ''} aria-label="Previous page">←</button><span>Page ${page} of ${pages}</span><button class="button small" data-action="next" ${page === pages ? 'disabled' : ''} aria-label="Next page">→</button></div></div>`;
}
function searchBar(options, placeholder) {
  return `<div class="toolbar"><div class="search-wrap"><input type="search" id="search" aria-label="${placeholder}" placeholder="${placeholder}" value="${esc(query)}">${query ? '<button type="button" data-action="clear-search" aria-label="Clear search">×</button>' : ''}</div><label class="muted" for="filter">Show</label><select id="filter">${options.map(o => `<option ${o === filter ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
}
function paginate(list) { page = Math.min(page, Math.max(1, Math.ceil(list.length / 10))); return list.slice((page - 1) * 10, page * 10); }
function trend() {
  const dates = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(`${today().slice(0, 7)}-01T12:00:00`);
    date.setMonth(date.getMonth() - 5 + index);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
  const values = dates.map(d => state.payments.filter(p => !p.voided && p.date.startsWith(d)).reduce((sum, p) => sum + p.amount, 0));
  const max = Math.max(...values, 1);
  return `<div class="chart" role="img" aria-label="Cash received by payment date over the last six months: ${dates.map((d, n) => `${monthLabel(d)} ${money(values[n])}`).join('; ')}">${dates.map((d, n) => `<div class="chart-column"><div class="bar-track"><div class="bar-fill" data-height="${Math.round(values[n] / max * 100)}"></div></div><small>${new Date(`${d}-01T12:00:00`).toLocaleDateString('en-PH', { month: 'short' })}</small></div>`).join('')}</div><div class="chart-summary"><div>Cash received this month<strong>${money(values[5])}</strong></div><div>All-time cash received<strong>${money(state.payments.filter(p => !p.voided).reduce((sum, p) => sum + p.amount, 0))}</strong></div></div>`;
}
function dashboard() {
  const m = metrics(state, period);
  const active = state.students.filter(s => !s.archived).length;
  const pending = state.invoices.filter(i => i.period === period && balance(state, i) > 0).sort((a, b) => a.due.localeCompare(b.due));
  const unpaid = state.invoices.filter(i => i.period === period && status(state, i) === 'Unpaid').length;
  const partial = state.invoices.filter(i => i.period === period && status(state, i) === 'Partial').length;
  const overdue = state.invoices.filter(i => i.period === period && status(state, i) === 'Overdue').length;
  return heading('Collections overview', 'Monthly charges, received payments and balances to follow up.', button('＋ Record payment', 'payment', '', 'primary')) + periodBar() +
    (!active ? `<div class="welcome"><div><h3>Your collection book starts here.</h3><p>Add your students, create monthly charges, then record payments as they arrive.</p></div>${button('＋ Add first student', 'student', '', 'primary')}</div>` : '') +
    `<section class="kpis" aria-label="Service month totals">${kpi('Collected', money(m.collected), 'Received against this month’s charges', true)}${kpi('Outstanding', money(m.outstanding), `${money(m.overdue)} overdue`)}${kpi('Total billed', money(m.billed), `${m.total} student charges this month`)}${kpi('Active students', active, `${m.paidCount} fully paid this service month`)}</section>
    <div class="dashboard-row"><section class="panel"><div class="panel-head"><div><h2>Collection activity</h2><p>Cash received by payment date · Last 6 months</p></div><span class="status paid">PHP</span></div><div class="panel-body">${trend()}</div></section>
    <section class="panel"><div class="panel-head"><div><h2>This month’s progress</h2><p>${monthLabel(period)} · Payment status</p></div></div><div class="panel-body"><div class="collection-number">${m.total ? Math.round(m.collected / m.billed * 100) : 0}<span>% collected</span></div><div class="progress" role="progressbar" aria-label="Billed amount collected" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${m.total ? Math.round(m.collected / m.billed * 100) : 0}"><div class="progress-fill" data-width="${m.total ? m.collected / m.billed * 100 : 0}"></div></div><p class="muted"><small>${m.paidCount} of ${m.total} students fully paid</small></p><div class="legend"><div><span><span class="dot"></span>Paid</span><strong>${m.paidCount}</strong></div><div><span><span class="dot warning"></span>Partial / unpaid</span><strong>${partial + unpaid}</strong></div><div><span><span class="dot danger"></span>Overdue</span><strong>${overdue}</strong></div></div></div></section></div>
    <section class="panel"><div class="panel-head"><div><h2>Payments to follow up</h2><p>Open balances, ordered by due date</p></div><a class="button small" href="#charges">All charges →</a></div>${pending.length ? `<div class="table-scroll"><table><caption class="sr-only">Outstanding charges for ${monthLabel(period)}</caption><thead><tr><th>Student</th><th>Due date</th><th class="amount">Balance</th><th>Status</th><th>Action</th></tr></thead><tbody>${pending.slice(0, 5).map(i => chargeRow(i, true)).join('')}</tbody></table></div>` : empty(m.total ? 'All caught up for this month.' : 'No monthly charges yet.', m.total ? 'Every charge for this service month has been paid.' : 'Create charges using the monthly fees you set for each student.', m.total ? '' : button('Create monthly charges', 'charges', '', 'primary'))}</section>`;
}
function chargeRow(i, short = false) {
  const remaining = balance(state, i);
  return `<tr><td>${studentCell(student(i.studentId))}${!short && i.note ? `<span class="detail">${esc(i.note)}</span>` : ''}</td>${!short ? `<td class="amount">${money(i.amount)}<span class="detail">Paid ${money(paid(state, i.id))}</span></td>` : ''}<td>${dateLabel(i.due)}</td><td class="amount">${money(remaining)}</td><td>${badge(status(state, i))}</td><td><div class="row-actions">${remaining ? button('Record payment', 'payment', i.id, 'small') : button('View payments', 'invoice-history', i.id, 'small')}${!short ? button('Edit', 'edit-charge', i.id, 'small ghost') : ''}</div></td></tr>`;
}
function chargesView() {
  let list = state.invoices.filter(i => i.period === period && (filter === 'All' || status(state, i) === filter) && `${student(i.studentId).name} ${student(i.studentId).school} ${student(i.studentId).route}`.toLowerCase().includes(query.toLowerCase()));
  list.sort(sort === 'name' ? (a, b) => student(a.studentId).name.localeCompare(student(b.studentId).name) : (a, b) => a.due.localeCompare(b.due));
  const rows = paginate(list);
  return heading('Monthly charges', 'See who has paid, who is due, and what needs a follow-up.', button('＋ Create monthly charges', 'charges', '', 'primary')) + periodBar() + `<section class="panel"><div class="panel-head"><div><h2>${monthLabel(period)}</h2><p>One charge per student per service month</p></div>${button('Export CSV', 'export-charges', '', 'small')}</div>${searchBar(['All', 'Paid', 'Partial', 'Unpaid', 'Overdue'], 'Search student, school or route')}<div class="table-scroll"><table><caption class="sr-only">Monthly charges</caption><thead><tr><th aria-sort="${sort === 'name' ? 'ascending' : 'none'}"><button class="sort-button" data-action="sort-name">Student ↕</button></th><th class="amount">Charge / paid</th><th aria-sort="${sort === 'due' ? 'ascending' : 'none'}"><button class="sort-button" data-action="sort-due">Due date ↕</button></th><th class="amount">Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(i => chargeRow(i)).join('')}</tbody></table></div>${!list.length ? empty('No matching charges.', state.invoices.some(i => i.period === period) ? 'Clear your search or choose another status.' : 'Create this month’s charges to start tracking payments.', button('Create monthly charges', 'charges', '', 'primary')) : ''}${pagination(list.length)}</section>`;
}
function studentsView() {
  const list = state.students.filter(s => (filter === 'All' || (filter === 'Archived' ? s.archived : !s.archived)) && `${s.name} ${s.school} ${s.route}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  const rows = paginate(list);
  return heading('Your students', 'Manage your roster, monthly fees, and school routes.', button('＋ Add student', 'student', '', 'primary')) + `<section class="panel"><div class="panel-head"><div><h2>Student roster</h2><p>Archive a student to remove them from future billing.</p></div><span class="status">${state.students.filter(s => !s.archived).length} active</span></div>${searchBar(['Active', 'Archived', 'All'], 'Search student, school or route')}<div class="table-scroll"><table><caption class="sr-only">Student roster</caption><thead><tr><th>Student</th><th>Route / contact</th><th class="amount">Monthly fee</th><th class="amount">All-time balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(s => `<tr><td>${studentCell(s)}</td><td>${esc(s.route || 'Not set')}<span class="detail">${esc(s.contact || 'No contact added')}</span></td><td class="amount">${money(s.fee)}</td><td class="amount">${money(state.invoices.filter(i => i.studentId === s.id).reduce((sum, i) => sum + balance(state, i), 0))}</td><td>${badge(s.archived ? 'Archived' : 'Active')}</td><td><div class="row-actions">${button('Edit', 'student', s.id, 'small')}${button(s.archived ? 'Restore' : 'Archive', 'archive', s.id, 'small ghost')}</div></td></tr>`).join('')}</tbody></table></div>${!list.length ? empty('Your roster is ready for a name.', query || filter === 'Archived' ? 'Try a different search or roster filter.' : 'Add a student and their monthly fee. You can change the fee later.', button('＋ Add student', 'student', '', 'primary')) : ''}${pagination(list.length)}</section>`;
}
function paymentsView() {
  const list = state.payments.filter(p => {
    const i = invoice(p.invoiceId);
    return (filter === 'All' || (filter === 'Voided' ? p.voided : !p.voided)) && `${student(i.studentId).name} ${p.reference} ${i.period} ${p.date} ${p.method}`.toLowerCase().includes(query.toLowerCase());
  }).sort((a, b) => b.date.localeCompare(a.date));
  const rows = paginate(list);
  return heading('Payment history', 'Payment dates, methods, references, and receipts in one place.', button('＋ Record payment', 'payment', '', 'primary')) + `<section class="panel"><div class="panel-head"><div><h2>Payment history</h2><p>All service months · Search a date or month using YYYY-MM</p></div>${button('Export CSV', 'export-payments', '', 'small')}</div>${searchBar(['Active', 'Voided', 'All'], 'Search name, date or reference')}<div class="table-scroll"><table><caption class="sr-only">Payment history</caption><thead><tr><th>Student / service month</th><th>Payment date</th><th class="amount">Amount</th><th>Method / reference</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(p => { const i = invoice(p.invoiceId); return `<tr><td>${studentCell(student(i.studentId))}<span class="detail">${monthLabel(i.period)}</span></td><td>${dateLabel(p.date)}</td><td class="amount">${money(p.amount)}</td><td>${esc(p.method)}<span class="detail">${esc(p.reference || 'No reference')}</span></td><td>${badge(p.voided ? 'Voided' : 'Paid')}${p.voided ? `<span class="detail">${esc(p.voidReason)}</span>` : ''}</td><td><div class="row-actions">${button('Receipt', 'receipt', p.id, 'small')}${!p.voided ? button('Void', 'void', p.id, 'small ghost') : ''}</div></td></tr>`; }).join('')}</tbody></table></div>${!list.length ? empty('No payments to show.', query ? 'Try a different search or payment filter.' : 'Record your first collection against a monthly charge.', button('Record payment', 'payment', '', 'primary')) : ''}${pagination(list.length)}</section>`;
}
function backupView() {
  return heading('Backups & exports', 'Your ledger syncs securely across devices. A backup gives you another copy.') + `<div class="backup-grid"><section class="panel"><h2>Download backup</h2><p>Includes students, charges, payment history, and voided records. Keep the JSON file somewhere private.</p><p><strong>${state.students.length}</strong> students · <strong>${state.invoices.length}</strong> charges · <strong>${state.payments.length}</strong> payments</p>${button('⇩ Download backup', 'backup', '', 'primary')}</section><section class="panel"><h2>Restore backup</h2><p>Restore a Service ledger JSON backup to your cloud account. Restoring replaces the ledger on every device after a confirmation. Download your current backup first.</p><label for="restore-file" class="button">Choose backup file<input type="file" id="restore-file" accept=".json,application/json" class="sr-only"></label><p id="import-error" role="alert" class="text-danger"></p></section><section class="panel"><h2>Spreadsheet exports</h2><p>Download charges for the selected service month or your full payment history. Open the CSV files in Excel or Google Sheets.</p><div class="actions">${button('Charges CSV', 'export-charges')}${button('Payments CSV', 'export-payments')}</div></section><section class="panel"><h2>One account, one collection book</h2><p>Records are stored in your Supabase account ledger. Sign in with the same email on every device. Updates appear within about 15 seconds, or choose Refresh.</p><p>This app records payments you receive; it does not move money or connect to a payment provider. Sign out on shared devices, and back up after each collection day. To migrate your old local ledger, download a JSON backup from the old app and restore it here once.</p></section></div>`;
}
function render() {
  document.title = `${names[view]} · Service ledger`;
  $('#breadcrumb').textContent = names[view];
  document.querySelectorAll('nav a').forEach(a => a.dataset.view === view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  if (!currentUser) return authScreen();
  if (!loaded) { $('#main').innerHTML = empty('Loading your cloud ledger', 'Connect to the internet and choose Refresh if loading does not complete.', button('Refresh', 'refresh', '', 'primary')); return; }
  $('#main').innerHTML = ({ dashboard, students: studentsView, charges: chargesView, payments: paymentsView, backup: backupView })[view]();
  document.querySelectorAll('[data-height]').forEach(el => { el.style.height = `${el.dataset.height}%`; });
  document.querySelectorAll('[data-width]').forEach(el => { el.style.width = `${el.dataset.width}%`; });
}
function navigate() {
  const next = location.hash.slice(1) || 'dashboard';
  view = Object.hasOwn(names, next) ? next : 'dashboard';
  page = 1; query = ''; filter = ['students', 'payments'].includes(view) ? 'Active' : 'All';
  render();
}
window.addEventListener('hashchange', navigate);
$('#today-label').textContent = new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date());
function field(name, label, type = 'text', value = '', extra = '', full = false) { return `<div class="field ${full ? 'full' : ''}"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra} aria-describedby="form-error"></div>`; }
function form(content, submit = 'Save changes', hint = '') { return `${hint ? `<div class="form-hint">${hint}</div>` : ''}<form id="entry-form" novalidate><p id="form-error" class="form-error" role="alert" tabindex="-1"></p><div class="form-grid">${content}</div><div class="form-actions"><button class="button" type="button" data-action="cancel">Cancel</button><button class="button primary" type="submit">${submit}</button></div></form>`; }
function modal(title, html, handler) {
  opener = document.activeElement;
  $('#dialog-title').textContent = title;
  $('#dialog-body').innerHTML = html;
  const el = $('#modal');
  if (!el.open) el.showModal();
  const entry = $('#entry-form');
  draft = entry ? new FormData(entry) : null;
  if (entry) entry.onsubmit = async event => {
    event.preventDefault();
    const errorEl = $('#form-error');
    errorEl.textContent = '';
    entry.querySelectorAll('[aria-invalid]').forEach(n => n.removeAttribute('aria-invalid'));
    const submit = entry.querySelector('[type=submit]');
    entry.querySelectorAll('button').forEach(button => { button.disabled = true; });
    submit.setAttribute('aria-busy', 'true');
    try {
      for (const input of entry.querySelectorAll('input')) {
        let message = '';
        if (input.required && !input.value.trim()) message = 'Complete this required field.';
        else if (input.type === 'date' && (!validDate(input.value) || (input.max && input.value > input.max) || (input.min && input.value < input.min))) message = 'Choose a valid date within the allowed range.';
        else if (input.type === 'month' && !validDate(`${input.value}-01`)) message = 'Choose a valid service month.';
        else if (input.maxLength > 0 && input.value.length > input.maxLength) message = `Use ${input.maxLength} characters or fewer.`;
        if (message) { input.setAttribute('aria-invalid', 'true'); throw new Error(message); }
      }
      await handler(new FormData(entry));
    }
    catch (error) { errorEl.textContent = error.message; entry.querySelectorAll('button').forEach(button => { button.disabled = false; }); submit.removeAttribute('aria-busy'); (entry.querySelector('[aria-invalid=true]') || errorEl).focus(); }
  };
}
function close() {
  if (saving) return;
  closing = true;
  $('#modal').close();
  $('#dialog-body').innerHTML = '';
  draft = null;
  closing = false;
  if (opener?.isConnected) opener.focus();
  else $('#main').focus();
}
function dirty() {
  const f = $('#entry-form');
  return f && draft && JSON.stringify([...new FormData(f)]) !== JSON.stringify([...draft]);
}
function requestClose() {
  if (saving) return;
  if (!dirty()) return close();
  const original = $('#dialog-body');
  if ($('#discard-question')) return;
  const question = document.createElement('div');
  question.id = 'discard-question';
  question.innerHTML = `<div class="form-hint"><strong>Discard unsaved changes?</strong><p>Your changes in this form have not been saved.</p><div class="actions">${button('Keep editing', 'keep-editing')}${button('Discard changes', 'discard', '', 'danger')}</div></div>`;
  original.prepend(question);
  question.querySelector('button').focus();
}
$('#close-modal').onclick = requestClose;
$('#modal').addEventListener('cancel', event => { event.preventDefault(); requestClose(); });
window.addEventListener('beforeunload', event => { if (!closing && dirty()) { event.preventDefault(); event.returnValue = ''; } });
function required(data, key, label, max = 120) {
  const value = String(data.get(key) || '').trim();
  if (!value || value.length > max) {
    const el = $(`[name="${key}"]`); el?.setAttribute('aria-invalid', 'true');
    throw new Error(`${label} is required and must be ${max} characters or fewer.`);
  }
  return value;
}
function amountValue(data, key) {
  try { return cents(data.get(key)); }
  catch (error) { $(`[name="${key}"]`)?.setAttribute('aria-invalid', 'true'); throw error; }
}
function studentForm(id) {
  const s = student(id);
  modal(s ? 'Edit student' : 'Add a student', form(field('name', 'Student name', 'text', s?.name, 'required maxlength="120" autocomplete="off"', true) + field('school', 'School / grade (optional)', 'text', s?.school, 'maxlength="120"') + field('route', 'Route (optional)', 'text', s?.route, 'maxlength="120"') + field('contact', 'Guardian contact (optional)', 'text', s?.contact, 'maxlength="120"', true) + field('fee', 'Monthly fee (PHP)', 'text', s ? s.fee / 100 : '', 'required inputmode="decimal"', true), s ? 'Save changes' : 'Add student', 'Set the fee you agreed with the student. Fee changes apply only to charges you create later.'), async data => {
    const next = structuredClone(state);
    const values = { id: s?.id || uid(), name: required(data, 'name', 'Student name'), school: data.get('school').trim(), route: data.get('route').trim(), contact: data.get('contact').trim(), fee: amountValue(data, 'fee'), archived: s?.archived || false };
    if (s) next.students[next.students.findIndex(n => n.id === s.id)] = values;
    else next.students.push(values);
    await commit(next); close(); render(); notify(s ? 'Student updated.' : 'Student added. Create their monthly charge when ready.');
  });
}
function chargesForm() {
  const active = state.students.filter(s => !s.archived);
  if (!active.length) return modal('Add students first', empty('No active students yet.', 'Add a student with their agreed monthly fee before creating charges.', button('Add student', 'switch-student', '', 'primary')));
  modal('Create monthly charges', form(field('period', 'Service month', 'month', period, 'required min="1900-01" max="9999-12"') + field('due', 'Due date', 'date', `${period}-10`, 'required min="1900-01-01" max="9999-12-31"') + field('note', 'Description (optional)', 'text', '', 'maxlength="300"', true) + '<div class="field full"><div class="form-hint" id="charge-preview" role="status"></div></div>', 'Create charges', 'Creates one charge per active student using their monthly fee. Existing charges for the service month are skipped. Nothing is sent to students.'), async data => {
    const selected = data.get('period');
    const next = createCharges(state, { period: selected, due: data.get('due'), note: data.get('note').trim(), id: uid });
    const count = next.invoices.length - state.invoices.length;
    if (!count) throw new Error('All active students already have a charge for that service month.');
    await commit(next); period = selected; close(); render(); notify(`${count} monthly charges created.`);
  });
  const preview = () => {
    const selected = $('[name=period]').value;
    const students = active.filter(s => !state.invoices.some(i => i.studentId === s.id && i.period === selected));
    $('#charge-preview').textContent = `${students.length} new charges · ${money(students.reduce((sum, s) => sum + s.fee, 0))} total. ${active.length - students.length} existing charges skipped.`;
  };
  $('[name=period]').onchange = preview; preview();
}
function paymentForm(id) {
  const open = state.invoices.filter(i => balance(state, i) > 0).sort((a, b) => a.due.localeCompare(b.due));
  if (!open.length) return modal('Record payment', empty('No open charges.', 'Create a monthly charge before recording a payment.', button('Create monthly charges', 'switch-charges', '', 'primary')));
  const selected = open.find(i => i.id === id) || open[0];
  modal('Record a payment', form(`<div class="field full"><label for="f-invoiceId">Student / service month</label><select id="f-invoiceId" name="invoiceId">${open.map(i => `<option value="${esc(i.id)}" ${i.id === selected.id ? 'selected' : ''}>${esc(student(i.studentId).name)} · ${monthLabel(i.period)} · ${money(balance(state, i))} due</option>`).join('')}</select></div>` + field('amount', 'Amount received (PHP)', 'text', balance(state, selected) / 100, 'required inputmode="decimal"') + field('date', 'Payment date', 'date', today(), `required min="1900-01-01" max="${today()}"`) + `<div class="field"><label for="f-method">Payment method</label><select id="f-method" name="method"><option>Cash</option><option>GCash</option><option>Bank transfer</option><option>Other</option></select></div>` + field('reference', 'Reference / note (optional)', 'text', '', 'maxlength="120"'), 'Save payment', 'Record money you have already received. Partial payments are welcome; overpayments are blocked.'), async data => {
    const next = addPayment(state, { id: uid(), invoiceId: data.get('invoiceId'), amount: amountValue(data, 'amount'), date: data.get('date'), method: data.get('method'), reference: data.get('reference').trim() });
    await commit(next); close(); render(); notify('Payment saved. Your totals are up to date.');
  });
  $('[name=invoiceId]').onchange = () => { $('[name=amount]').value = balance(state, invoice($('[name=invoiceId]').value)) / 100; };
}
function editCharge(id) {
  const i = invoice(id);
  modal('Edit monthly charge', form(field('amount', 'Charge amount (PHP)', 'text', i.amount / 100, 'inputmode="decimal" required') + field('due', 'Due date', 'date', i.due, 'required min="1900-01-01" max="9999-12-31"') + field('note', 'Description (optional)', 'text', i.note, 'maxlength="300"', true), 'Save changes', `${esc(student(i.studentId).name)} · ${monthLabel(i.period)}. Already paid: ${money(paid(state, i.id))}. The charge cannot be reduced below that amount.`), async data => {
    const amount = amountValue(data, 'amount');
    if (amount < paid(state, i.id)) throw new Error('The charge cannot be lower than payments already received.');
    if (!validDate(data.get('due'))) throw new Error('Enter a valid due date.');
    const next = structuredClone(state);
    Object.assign(next.invoices.find(n => n.id === id), { amount, due: data.get('due'), note: data.get('note').trim() });
    await commit(next); close(); render(); notify('Monthly charge updated.');
  });
}
function archiveStudent(id) {
  const s = student(id);
  const verb = s.archived ? 'Restore' : 'Archive';
  modal(`${verb} ${s.name}?`, form('', `${verb} student`, s.archived ? 'This student will appear in the active roster again and be included in future charge creation.' : 'This student will be removed from the active roster and future charge creation. Existing charges and payments stay in your ledger. You can restore the student later.'), async () => {
    const next = structuredClone(state); next.students.find(n => n.id === id).archived = !s.archived;
    await commit(next); close(); render(); notify(`Student ${s.archived ? 'restored' : 'archived'}.`);
  });
  $('#entry-form button[type=button]').focus();
}
function voidPayment(id) {
  const p = state.payments.find(p => p.id === id);
  modal('Void this payment?', form(field('reason', 'Reason for correction', 'text', '', 'required maxlength="300"', true), 'Void payment', `This removes ${money(p.amount)} from collected totals and reopens the balance for ${esc(student(invoice(p.invoiceId).studentId).name)}. The original payment and your reason remain in history.`), async data => {
    const reason = required(data, 'reason', 'A correction reason', 300);
    const next = structuredClone(state); Object.assign(next.payments.find(p => p.id === id), { voided: true, voidReason: reason });
    await commit(next); close(); render(); notify('Payment voided. The balance has been updated.');
  });
  $('#entry-form [type=submit]').className = 'button danger';
  $('#entry-form button[type=button]').focus();
}
function receipt(id) {
  const p = state.payments.find(p => p.id === id), i = invoice(p.invoiceId), s = student(i.studentId);
  const html = `<h2>${esc(s.name)}</h2>${badge(p.voided ? 'Voided' : 'Paid')}<div class="receipt-info"><div><small>Payment date</small>${dateLabel(p.date)}</div><div><small>Service month</small>${monthLabel(i.period)}</div><div><small>Payment method</small>${esc(p.method)}</div><div><small>Reference</small>${esc(p.reference || '—')}</div></div><div class="receipt-total">${money(p.amount)}</div><p><small>Payment ID: ${esc(p.id)}</small></p>${p.voided ? `<p class="text-danger">Voided: ${esc(p.voidReason)}</p>` : ''}<p class="muted"><small>Payment acknowledgment for your records. This is not a tax invoice.</small></p>`;
  $('#print-receipt').innerHTML = html;
  modal('Payment receipt', html + `<div class="form-actions">${button('Print / save PDF', 'print', '', 'primary')}</div>`);
}
function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCharges() {
  const rows = [['Student', 'School', 'Route', 'Service month', 'Due date', 'Charge PHP', 'Paid PHP', 'Balance PHP', 'Status']];
  state.invoices.filter(i => i.period === period).forEach(i => { const s = student(i.studentId); rows.push([s.name, s.school, s.route, i.period, i.due, (i.amount / 100).toFixed(2), (paid(state, i.id) / 100).toFixed(2), (balance(state, i) / 100).toFixed(2), status(state, i)]); });
  download(`school-service-charges-${period}.csv`, csv(rows), 'text/csv;charset=utf-8'); notify('Charges CSV downloaded.');
}
function exportPayments() {
  const rows = [['Payment ID', 'Student', 'Service month', 'Payment date', 'Amount PHP', 'Method', 'Reference', 'Status', 'Void reason']];
  state.payments.forEach(p => { const i = invoice(p.invoiceId); rows.push([p.id, student(i.studentId).name, i.period, p.date, (p.amount / 100).toFixed(2), p.method, p.reference, p.voided ? 'Voided' : 'Active', p.voidReason]); });
  download(`school-service-payments-${today()}.csv`, csv(rows), 'text/csv;charset=utf-8'); notify('Payment history CSV downloaded.');
}
document.addEventListener('click', async event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const id = target.dataset.id;
  const actions = {
    refresh: () => refreshLedger(true),
    logout: async () => { if (saving) return; const { error } = await supabase.auth.signOut({ scope: 'local' }); if (error) notify('Sign out failed. Check your connection and try again.'); else await setAccount(null); },
    student: () => studentForm(id), charges: chargesForm, payment: () => paymentForm(id), 'edit-charge': () => editCharge(id), archive: () => archiveStudent(id), void: () => voidPayment(id), receipt: () => receipt(id), print: () => window.print(),
    cancel: requestClose, discard: close, 'keep-editing': () => { $('#discard-question')?.remove(); $('#entry-form input')?.focus(); },
    'switch-student': () => { close(); studentForm(); }, 'switch-charges': () => { close(); chargesForm(); },
    previous: () => { page--; render(); }, next: () => { page++; render(); },
    'clear-search': () => { query = ''; page = 1; render(); $('#search').focus(); },
    'sort-name': () => { sort = 'name'; render(); }, 'sort-due': () => { sort = 'due'; render(); },
    'invoice-history': () => { location.hash = 'payments'; setTimeout(() => { query = student(invoice(id).studentId).name; filter = 'All'; render(); }, 0); },
    backup: () => { download(`school-service-backup-${today()}.json`, JSON.stringify(state, null, 2), 'application/json'); notify('Backup downloaded. Keep it in a private location.'); },
    'export-charges': exportCharges, 'export-payments': exportPayments,
  };
  try { await actions[target.dataset.action]?.(); }
  catch (error) { notify(error.message); }
});
document.addEventListener('input', event => {
  if (event.target.id !== 'search' || event.isComposing) return;
  query = event.target.value; page = 1;
  const position = event.target.selectionStart;
  render(); $('#search').focus(); $('#search').setSelectionRange(position, position);
});
document.addEventListener('compositionend', event => { if (event.target.id === 'search') { query = event.target.value; page = 1; render(); $('#search').focus(); } });
document.addEventListener('change', async event => {
  if (event.target.id === 'period') {
    if (validDate(`${event.target.value}-01`)) { period = event.target.value; page = 1; render(); }
    else { event.target.value = period; notify('Choose a valid service month.'); }
  }
  if (event.target.id === 'filter') { filter = event.target.value; page = 1; render(); }
  if (event.target.id !== 'restore-file') return;
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 10000000) throw new Error('Choose a JSON backup smaller than 10 MB.');
    const imported = validateState(JSON.parse(await file.text()));
    if (view !== 'backup') return;
    modal('Replace your current ledger?', form('', 'Restore backup', `This backup contains ${imported.students.length} students, ${imported.invoices.length} charges, and ${imported.payments.length} payments. It will replace the cloud ledger on every device signed into this account. Download your current backup before proceeding.`), async () => {
      await commit(structuredClone(imported), { recovery: true }); close(); render(); notify('Backup restored. Your ledger is ready.');
    });
    $('#entry-form [type=submit]').className = 'button danger';
    $('#entry-form button[type=button]').focus();
  } catch (error) { const errorTarget = $('#import-error'); if (errorTarget) errorTarget.textContent = error instanceof SyntaxError ? 'This file is not a valid JSON backup. Choose an exported Service ledger backup.' : error.message; }
  event.target.value = '';
});
navigate();
supabase.auth.onAuthStateChange((_event, session) => { setTimeout(() => setAccount(session?.user).catch(error => warning(error.message)), 0); });
const initial = await supabase.auth.getSession();
await setAccount(initial.data.session?.user);
