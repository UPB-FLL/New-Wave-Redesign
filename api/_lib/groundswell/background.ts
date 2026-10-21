import { waitUntil } from '@vercel/functions';
import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { runWorker } from './engine.js';
import { ALL_STEPS } from './steps.js';

/**
 * Runs the worker after the response is sent (Vercel keeps the function alive
 * for promises passed to waitUntil, up to its maxDuration). FUNCTION_SECONDS
 * must equal maxDuration for api/groundswell/run.ts and api/groundswell/worker.ts in
 * vercel.json (a test holds them in step).
 */
export const FUNCTION_SECONDS = 300;

export function runWorkerInBackground(startedAt: number): void {
  const deadline = startedAt + FUNCTION_SECONDS * 1000 - 10_000;
  waitUntil(
    runWorker(getSupabaseAdmin(), ALL_STEPS, { deadline })
      .then((report) => {
        if (report.ran.length) console.log('Groundswell worker:', JSON.stringify(report));
      })
      .catch((err) => console.error('Groundswell worker failed:', err))
  );
}
