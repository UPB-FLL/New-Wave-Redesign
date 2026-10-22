import { waitUntil } from '@vercel/functions';
import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { autoStartEnabled, runWorker, startWithinCapacity } from './engine.js';
import { ALL_STEPS, PHASE_STEPS } from './steps.js';

/**
 * Runs the worker after the response is sent (Vercel keeps the function alive
 * for promises passed to waitUntil, up to its maxDuration). FUNCTION_SECONDS
 * must equal maxDuration for api/groundswell/run.ts and api/groundswell/worker.ts in
 * vercel.json (a test holds them in step).
 */
export const FUNCTION_SECONDS = 300;

/**
 * Full auto (the owner's choice, 2026-10-22): the heartbeat also starts queued
 * runs, up to MAX_RUNNING at once, so a partner's new customer and the phase
 * a delivery queued go on without anyone pressing a button.
 * GROUNDSWELL_AUTO_START=off leaves queued runs for the admin button.
 */
export function runWorkerInBackground(startedAt: number): void {
  const deadline = startedAt + FUNCTION_SECONDS * 1000 - 10_000;
  const db = getSupabaseAdmin();
  const startQueued = autoStartEnabled() ? () => startWithinCapacity(db, PHASE_STEPS) : undefined;
  waitUntil(
    runWorker(db, ALL_STEPS, { deadline, startQueued })
      .then((report) => {
        if (report.ran.length) console.log('Groundswell worker:', JSON.stringify(report));
      })
      .catch((err) => console.error('Groundswell worker failed:', err))
  );
}
