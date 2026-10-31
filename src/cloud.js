import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { emptyState, validateState } from './model.js';
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});
export class LedgerStore {
  constructor(client, ownerId) { this.client = client; this.ownerId = ownerId; this.revision = 0; }
  async load() {
    const { data, error } = await this.client.from('service_ledgers').select('revision,data,last_mutation').eq('owner_id', this.ownerId).maybeSingle();
    if (error) throw new Error('Could not load your cloud ledger. Check your connection and try Refresh.');
    const ledger = data ? validateState(data.data) : emptyState();
    return ledger;
  }
  async save(value) {
    const expected = this.revision;
    const next = structuredClone(value);
    next.revision = expected + 1;
    validateState(next);
    const mutation = crypto.randomUUID();
    const row = { owner_id: this.ownerId, revision: next.revision, data: next, last_mutation: mutation };
    const request = expected === 0
      ? this.client.from('service_ledgers').insert(row)
      : this.client.from('service_ledgers').update(row).eq('owner_id', this.ownerId).eq('revision', expected);
    const { data, error } = await request.select('revision,data,last_mutation').maybeSingle();
    if (!error && data) { this.revision = data.revision; return validateState(data.data); }
    // A lost response may still have committed. Reconcile using a unique operation ID.
    const { data: current, error: readError } = await this.client.from('service_ledgers').select('revision,data,last_mutation').eq('owner_id', this.ownerId).maybeSingle();
    if (!readError && current?.last_mutation === mutation) { this.revision = current.revision; return validateState(current.data); }
    if (!readError && (current?.revision || 0) !== expected) throw new Error('Another device saved newer changes. Your entry was not saved. Keep a note of it, close this form, choose Refresh, then enter it again.');
    throw new Error('Could not confirm this save. Your entry is still here. Close and Refresh to check whether it was recorded before trying again.');
  }
}
