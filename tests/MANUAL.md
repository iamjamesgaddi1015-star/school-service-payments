# Browser acceptance checklist

Run `npm start` and open http://localhost:5173 on your local machine. Browser execution was unavailable in the creation environment; these are acceptance steps, not claimed completed tests.

- Empty ledger: follow Overview → Add first student. Check all zero totals and empty-history guidance.
- Add two fictional students with different fees. Submit blank/invalid fields, verify visible error text, field association and focus. Edit a name and fee.
- Create charges for a month, inspect exact preview count/amount, change due date, save. Repeat for the same month: duplicates must be skipped. Change a roster fee: old charge must remain unchanged.
- Record a partial payment, then settle the remainder. Verify collected/outstanding, Paid/Partial/Overdue, payment date, and cash-history totals. Reject future date, zero, three decimal places, and overpayment without losing form input.
- Edit a charge below payments received: reject. Edit due date and description: save.
- View receipt, print/save PDF, ensure app navigation is absent from print. Void with required reason; verify totals reverse and void history remains. Record corrected payment.
- Archive a student: retain charges/history and remove from next month's new charges. Restore from Archived filter.
- Search by name/route/reference/date, clear with keyboard, filter statuses, sort charges, and test more than ten rows with pagination.
- Back up JSON, export CSV with names containing commas/quotes and formula prefixes, inspect results. Restore backup after confirmation. Reject malformed/oversized JSON and orphaned/duplicate records. Verify canceled restore makes no changes.
- Reload: ledger must remain. Open another tab; modify there while a form is open here, ensure stale form cannot overwrite the ledger. Close and reload to recover.
- Simulate blocked/quota-exceeded localStorage: retain unsaved input and show error. Invalid stored JSON must not be overwritten; verify raw-data download and restore recovery.
- Keyboard: skip link, navigation, input labels, visible focus, modal trap, Escape, unsaved-discard confirmation, close focus restoration, select/date picker operation.
- Narrow 390px and tablet 820px: navigation remains accessible, controls do not clip, tables scroll horizontally, dialogs scroll, bottom actions reachable. Test Android Chrome and Windows Edge, 200% zoom, reduced motion, and forced colors.
- Accessibility: inspect accessible names, status announcements, errors, contrast and chart descriptions. Run your preferred automated accessibility checker and a screen-reader spot check.

## Cloud version acceptance

- Configure Supabase Auth Site URL/redirects to the deployed origin; create/confirm the owner's account in the app.
- Sign in on computer and tablet using that same account. Verify roster/payment changes appear after Refresh or within about 15 seconds.
- Open an edit dialog on device A, save a change on device B, then attempt A's save: reject stale write and preserve form input. Close, Refresh and re-enter.
- Disconnect internet while recording payment: reject save without showing a success toast. Reconnect and check history before retrying an uncertain save.
- Sign out: hide roster, metrics and receipt content. Another account starts empty and cannot read the owner's records.
- Restore a version-1 backup once; confirm all devices show the replaced ledger. Canceling restore must leave the ledger unchanged.
