/**
 * Shared shapes for Groundswell, the engine that runs marketing audits on the
 * site (see api/_lib/groundswell/engine.ts and the migration
 * 20261021120000_groundswell_engine.sql).
 */

import type { Phase } from '../../../src/lib/groundswellValidation.js';
import type { AuditBranding } from './branding.js';

export interface AuditCompetitor {
  name: string;
  website: string | null;
  instagram: string | null;
  facebook?: string | null;
}

export interface AuditRow {
  id: string;
  business_name: string;
  city: string | null;
  website: string | null;
  instagram: string | null;
  facebook?: string | null;
  competitors: AuditCompetitor[];
  notes: string | null;
  /** Who the reports are from and any override of the business's look; absent means New Wave's, as before. */
  branding?: AuditBranding;
  /** The run's phase (migration 20261029120000); absent before it, which reads as phase 1. */
  phase?: Phase;
  /** The run this phase builds on: its step outputs are where this run starts. */
  source_audit_id?: string | null;
  customer_id?: string | null;
  partner_id?: string | null;
  kind?: 'audit' | 'benchmark';
}

/** The public "Current" each step belongs to (content/croissance.ts names them). */
export type CurrentName = 'Site' | 'Maps' | 'Search' | 'Social' | 'Ads' | 'Accounts' | 'Model' | 'Delivery';

export interface StepContext {
  audit: AuditRow;
  /**
   * Outputs of the audit's earlier finished steps, by step name, laid over
   * the outputs of the runs it builds on (an earlier phase's).
   */
  outputs: Record<string, unknown>;
  /** The outputs that came from an earlier phase's run, by step name: that run's id. */
  inherited?: Record<string, string>;
  /** The names of all the audit's steps in order (the engine sets it; absent in older callers). */
  steps?: string[];
  /** Epoch ms by which the step must return, so the function call is not cut off. */
  deadline: number;
  /** Attempt number for this step, starting at 1. */
  attempt: number;
}

export interface StepDefinition {
  name: string;
  current: CurrentName;
  /** Plain label shown on the admin page. */
  label: string;
  /** An optional step that keeps failing is skipped; the audit goes on without it. */
  optional: boolean;
  run(ctx: StepContext): Promise<unknown>;
  /** Fields of the audit row a finished step changes (the engine writes them before the next step reads the row). */
  persist?(output: unknown, audit: AuditRow): Partial<Pick<AuditRow, 'competitors'>> | null;
}

/** Thrown when a step cannot succeed by retrying (bad input, missing setup). */
export class PermanentStepError extends Error {
  readonly permanent = true;
}

/** A source and date for every number Groundswell reports. */
export interface Sourced<T> {
  value: T;
  source: string;
  fetched_at: string;
}

export const sourced = <T>(value: T, source: string): Sourced<T> => ({
  value,
  source,
  fetched_at: new Date().toISOString(),
});
