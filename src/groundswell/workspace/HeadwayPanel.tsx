import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, CheckCircle2, Eye, Loader2, Play, RotateCcw, Wand2, X } from 'lucide-react';
import { PartnerSignedOut } from '../../lib/groundswellPartner';
import { getHeadway, moveHeadwayActions, planHeadway, revealHeadwaySecret, saveHeadwaySetupItem, setHeadwayServices, type HeadwayData } from '../../lib/groundswellHeadway';
import type { WorkspaceViewer } from '../../lib/groundswellWorkspace';
import { ACTION_STATUS_LABELS, HEADWAY_DESCRIPTOR, HEADWAY_NAME, HEADWAY_SERVICES, HEADWAY_SERVICE_INFO, type ChecklistItem, type HeadwayAction, type HeadwayService, type SetupStatus } from '../../lib/headway';
import { HEADWAY_BRAND } from '../headwayBrand';

/**
 * Headway on a customer's page: the services the customer pays for (staff
 * switch them on), the setup checklist (what Headway still needs, and the
 * typed items a person fills in), and the plan: every action with its
 * approval. The same screen for the partner and for staff; the server
 * decides what each may do. While an action is approved or applying, the
 * panel asks again every POLL_MS.
 */

export const HEADWAY_POLL_MS = 20_000;

const SETUP_STATUS: Record<SetupStatus, { label: string; color: string }> = {
  needed: { label: 'Needed', color: 'var(--gs-bad)' },
  pending: { label: 'Sign-in pending', color: 'var(--gs-wait)' },
  linked: { label: 'Linked', color: 'var(--gs-ok)' },
  provided: { label: 'Given', color: 'var(--gs-ok)' },
  waived: { label: 'Not needed', color: 'var(--nw-slate)' },
};

const ACTION_COLOR: Record<HeadwayAction['status'], string> = {
  proposed: 'var(--gs-wait)',
  approved: 'var(--gs-accent-deep)',
  applying: 'var(--gs-accent-deep)',
  applied: 'var(--gs-ok)',
  done: 'var(--gs-ok)',
  failed: 'var(--gs-bad)',
  declined: 'var(--nw-slate)',
};

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null);

function SetupRow({ item, viewer, customerId, canManage, secrets, onSaved, onError }: { item: ChecklistItem; viewer: WorkspaceViewer; customerId: string; canManage: boolean; secrets: boolean; onSaved: (d: HeadwayData) => void; onError: (m: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const st = SETUP_STATUS[item.status];
  const typed = item.kind === 'id' || item.kind === 'secret';
  const save = async (status: 'provided' | 'waived' | 'needed', event?: FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    try {
      onSaved(await saveHeadwaySetupItem(viewer, customerId, { key: item.key, status, value: typed ? value : undefined, notes }));
      setEditing(false);
      setValue('');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  };
  const reveal = async () => {
    setBusy(true);
    try {
      setRevealed(await revealHeadwaySecret(customerId, item.key));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not read that.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="py-3" data-setup={item.key} data-status={item.status}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{item.label}</span>
            <span className="gs-chip" style={{ color: st.color }}>
              {st.label}
            </span>
            {!item.required ? <span className="text-xs gs-muted">optional</span> : null}
          </div>
          <p className="mt-0.5 text-sm gs-muted">{item.hint}</p>
          <p className="mt-0.5 text-xs gs-muted">
            For {item.for.map((s) => HEADWAY_SERVICE_INFO[s].label).join(', ')}
            {item.value_hint ? ` · ${item.kind === 'id' ? item.value_hint : `stored ${item.value_hint}`}` : ''}
            {item.provided_at ? ` · ${when(item.provided_at)}` : ''}
            {item.notes ? ` · ${item.notes}` : ''}
          </p>
          {revealed ? (
            <p className="mt-1 break-all rounded bg-[var(--gs-foam)] p-2 font-mono text-sm" data-role="revealed">
              {revealed}
            </p>
          ) : null}
        </div>
        {item.kind === 'link' ? (
          <span className="text-xs gs-muted">{item.status === 'linked' ? 'Signed in from the accounts card.' : 'Sign in from the accounts card.'}</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {item.kind === 'secret' && item.status === 'provided' && canManage && !revealed ? (
              <button type="button" className="gs-btn gs-btn-ghost" disabled={busy} onClick={() => void reveal()}>
                <Eye size={14} aria-hidden="true" /> Reveal
              </button>
            ) : null}
            {item.kind === 'access' && item.status !== 'provided' ? (
              <button type="button" className="gs-btn gs-btn-secondary" disabled={busy} onClick={() => void save('provided')}>
                <Check size={14} aria-hidden="true" /> Mark as given
              </button>
            ) : null}
            {typed ? (
              <button type="button" className="gs-btn gs-btn-secondary" disabled={busy || (item.kind === 'secret' && !secrets)} onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
                {item.status === 'provided' ? 'Replace' : 'Add'}
              </button>
            ) : null}
            {item.status !== 'waived' && !item.required ? (
              <button type="button" className="gs-btn gs-btn-ghost" disabled={busy} onClick={() => void save('waived')}>
                Not needed
              </button>
            ) : null}
            {item.status === 'waived' || item.status === 'provided' ? (
              <button type="button" className="gs-btn gs-btn-ghost" disabled={busy} onClick={() => void save('needed')} aria-label={`Clear ${item.label}`}>
                Clear
              </button>
            ) : null}
          </div>
        )}
      </div>
      {item.kind === 'secret' && !secrets ? <p className="mt-1 text-xs gs-muted">Logins can be stored once GROUNDSWELL_SECRETS_KEY is set.</p> : null}
      {editing && typed ? (
        <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(e) => void save('provided', e)} aria-label={`Add ${item.label}`}>
          <input className="input-light" type={item.kind === 'secret' ? 'password' : 'text'} value={value} onChange={(e) => setValue(e.target.value)} placeholder={item.kind === 'secret' ? 'Login, as the customer gave it' : item.label} aria-label={item.label} required />
          <input className="input-light" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (where it came from, who gave it)" aria-label={`${item.label} notes`} />
          <button type="submit" className="gs-btn gs-btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </form>
      ) : null}
    </li>
  );
}

function ActionRow({ action, viewer, busy, onMove }: { action: HeadwayAction; viewer: WorkspaceViewer; busy: boolean; onMove: (what: 'approve' | 'decline' | 'done' | 'retry', id: string) => void }) {
  const live = action.status === 'proposed' || action.status === 'approved' || action.status === 'failed';
  return (
    <li className="py-3" data-action={action.id} data-status={action.status}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{action.title}</span>
            <span className="gs-chip" style={{ color: ACTION_COLOR[action.status] }}>
              {ACTION_STATUS_LABELS[action.status]}
            </span>
            <span className="text-xs gs-muted">{action.kind === 'automatic' ? 'through the linked account' : 'for the team'}</span>
          </div>
          <p className="mt-0.5 text-xs gs-muted">
            {action.scheduled_for ? `Not before ${when(action.scheduled_for)}` : 'As soon as approved'}
            {action.blocked_by.length ? ` · waits on ${action.blocked_by.map((k) => k.replace(/^link:/, '').replace(/_/g, ' ')).join(', ')}` : ''}
            {action.applied_at ? ` · ${action.kind === 'automatic' ? 'applied' : 'done'} ${when(action.applied_at)}` : ''}
          </p>
          {action.error ? <p className="mt-1 text-xs text-red-700">{action.error}</p> : null}
          <details className="mt-1">
            <summary className="cursor-pointer text-xs font-semibold">What exactly</summary>
            <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-[var(--gs-foam)] p-2 text-xs">{action.detail}</pre>
            {action.result && viewer === 'admin' ? <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-[var(--gs-mist)] p-2 text-xs">{JSON.stringify(action.result, null, 1)}</pre> : null}
          </details>
        </div>
        {live ? (
          <div className="flex flex-wrap gap-2">
            {action.status === 'proposed' && action.kind === 'automatic' ? (
              <button type="button" className="gs-btn gs-btn-primary" disabled={busy} onClick={() => onMove('approve', action.id)}>
                <Play size={14} aria-hidden="true" /> Approve
              </button>
            ) : null}
            {action.kind === 'handoff' && action.status !== 'failed' ? (
              <button type="button" className="gs-btn gs-btn-secondary" disabled={busy} onClick={() => onMove('done', action.id)}>
                <CheckCircle2 size={14} aria-hidden="true" /> Mark done
              </button>
            ) : null}
            {action.status === 'failed' && action.kind === 'automatic' ? (
              <button type="button" className="gs-btn gs-btn-secondary" disabled={busy} onClick={() => onMove('retry', action.id)}>
                <RotateCcw size={14} aria-hidden="true" /> Try again
              </button>
            ) : null}
            <button type="button" className="gs-btn gs-btn-ghost" disabled={busy} onClick={() => onMove('decline', action.id)} aria-label={`Decline: ${action.title}`}>
              <X size={14} aria-hidden="true" /> Decline
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function HeadwayPanel({ viewer, customerId, onSignedOut, poll = HEADWAY_POLL_MS }: { viewer: WorkspaceViewer; customerId: string; onSignedOut?: () => void; poll?: number }) {
  const [data, setData] = useState<HeadwayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const fail = useCallback(
    (err: unknown) => {
      if (err instanceof PartnerSignedOut) onSignedOut?.();
      else setError(err instanceof Error ? err.message : 'Something went wrong.');
    },
    [onSignedOut]
  );
  const refresh = useCallback(async () => {
    try {
      setData(await getHeadway(viewer, customerId));
      setError(null);
    } catch (err) {
      if (err instanceof Error && /not set up|not available yet/i.test(err.message)) setUnavailable(true);
      else fail(err);
    }
  }, [viewer, customerId, fail]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const active = data?.actions.some((a) => a.status === 'approved' || a.status === 'applying') ?? false;
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void refresh(), poll);
    return () => window.clearInterval(timer);
  }, [active, refresh, poll]);

  const act = async (work: () => Promise<HeadwayData>, done?: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setData(await work());
      if (done) setNotice(done);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const openPlan = useMemo(() => data?.plans.find((p) => p.status === 'open') ?? null, [data]);
  const shown = useMemo(() => (data && openPlan ? data.actions.filter((a) => a.plan_id === openPlan.id) : []), [data, openPlan]);
  const byService = useMemo(() => HEADWAY_SERVICES.map((s) => ({ service: s, actions: shown.filter((a) => a.service === s) })).filter((g) => g.actions.length), [shown]);
  const enabled = data?.services.filter((s) => s.enabled) ?? [];
  const missing = data?.checklist.filter((i) => i.required && !i.satisfied) ?? [];

  return (
    <section aria-labelledby="gs-headway-heading" className="gs-card gs-headway mt-8 p-5 sm:p-6" data-role="headway">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <img src={HEADWAY_BRAND.mark} width={44} height={44} alt="" aria-hidden="true" />
          <div>
            <h2 id="gs-headway-heading" className="text-xl font-bold">
              {HEADWAY_NAME}
            </h2>
            <p className="text-sm gs-muted">{HEADWAY_DESCRIPTOR} The services this business pays for, what {HEADWAY_NAME} needs to run them, and every action before it happens.</p>
          </div>
        </div>
      </div>
      {unavailable ? (
        <p className="gs-notice mt-4" role="status">
          {HEADWAY_NAME} is not switched on in the database yet.
        </p>
      ) : null}
      {error ? (
        <p className="gs-alert mt-4" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="gs-notice mt-4" role="status">
          {notice}
        </p>
      ) : null}
      {!data && !error && !unavailable ? (
        <p className="mt-4 text-sm gs-muted" aria-busy="true">
          Loading…
        </p>
      ) : null}
      {data ? (
        <>
          <h3 className="gs-label mt-6">Services</h3>
          <ul className="mt-2 divide-y divide-[var(--nw-mist-gray)]" aria-label="Services">
            {data.services.map((s) => (
              <li key={s.service} className="flex flex-wrap items-center justify-between gap-3 py-2.5" data-service={s.service} data-enabled={s.enabled}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{s.label}</span>
                    <span className="gs-chip" style={{ color: s.enabled ? 'var(--gs-ok)' : 'var(--nw-slate)' }}>
                      {s.enabled ? 'Included' : 'Not included'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm gs-muted">{s.does}</p>
                </div>
                {data.can_manage ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={s.enabled} disabled={busy} onChange={(e) => void act(() => setHeadwayServices(customerId, { [s.service]: e.target.checked } as Partial<Record<HeadwayService, boolean>>))} aria-label={`${s.label} included`} />
                    Included
                  </label>
                ) : null}
              </li>
            ))}
          </ul>

          <h3 className="gs-label mt-6">Setup checklist</h3>
          {!enabled.length ? (
            <p className="mt-2 text-sm gs-muted">Switch a service on to see what it needs.</p>
          ) : (
            <>
              <p className="mt-1 text-sm gs-muted" data-role="checklist-summary">
                {missing.length ? `${missing.length} required item${missing.length === 1 ? '' : 's'} still needed.` : 'Everything required is in place.'}
              </p>
              <ul className="mt-2 divide-y divide-[var(--nw-mist-gray)]" aria-label="Setup checklist">
                {data.checklist.map((item) => (
                  <SetupRow key={item.key} item={item} viewer={viewer} customerId={customerId} canManage={data.can_manage} secrets={data.secrets_available} onSaved={(d) => setData(d)} onError={(m) => setError(m)} />
                ))}
              </ul>
            </>
          )}

          <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="gs-label">The plan</h3>
              <p className="mt-1 text-sm gs-muted" data-role="source-note">
                {data.source_note}
              </p>
            </div>
            <button type="button" className="gs-btn gs-btn-primary" disabled={busy || !data.source || !enabled.length} onClick={() => void act(() => planHeadway(viewer, customerId), 'The plan is ready: approve each action to carry it out.')}>
              <Wand2 size={14} aria-hidden="true" /> {openPlan ? 'Plan again' : 'Build the plan'}
            </button>
          </div>
          {openPlan ? (
            <div className="mt-3" data-plan={openPlan.id}>
              <p className="text-sm">{openPlan.summary}</p>
              <p className="mt-1 text-xs gs-muted">
                {openPlan.counts.proposed} waiting for approval · {openPlan.counts.approved + openPlan.counts.applying} approved · {openPlan.counts.applied + openPlan.counts.done} done · {openPlan.counts.failed} failed · {openPlan.counts.declined} declined
              </p>
              {busy ? <Loader2 size={14} aria-hidden="true" className="mt-2 animate-spin" /> : null}
              {byService.map((g) => (
                <div key={g.service} className="mt-4" data-group={g.service}>
                  <h4 className="font-semibold">{HEADWAY_SERVICE_INFO[g.service].label}</h4>
                  <ul className="divide-y divide-[var(--nw-mist-gray)]" aria-label={`${HEADWAY_SERVICE_INFO[g.service].label} actions`}>
                    {g.actions.map((a) => (
                      <ActionRow key={a.id} action={a} viewer={viewer} busy={busy} onMove={(what, id) => void act(() => moveHeadwayActions(viewer, customerId, what, [id]), what === 'approve' ? 'Approved. It is carried out within a minute of its time.' : undefined)} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
          {data.plans.length > 1 ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold">Earlier plans ({data.plans.length - 1})</summary>
              <ul className="mt-2 space-y-1 text-sm gs-muted">
                {data.plans
                  .filter((p) => p.id !== openPlan?.id)
                  .map((p) => (
                    <li key={p.id}>
                      {when(p.created_at)}: {p.summary}
                    </li>
                  ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
