import { PermanentStepError } from './types.js';

const CREDIT_FAILURE = /wallet.{0,80}(?:credit|empty|paused)|(?:out of|insufficient|not enough) credits?|insufficient balance|credit balance.{0,40}(?:empty|zero|insufficient|depleted)|payment required/i;
let pausedUntil = 0;

export class ProviderCreditError extends PermanentStepError {
  constructor() { super('Composio public-data reads are paused because the credit balance is empty. Add credits in Composio, then retry the research.'); }
}
export function isProviderCreditFailure(value: string): boolean { return CREDIT_FAILURE.test(value); }
export function pausePublicReadsForCredits(): never { pausedUntil = Date.now() + 30_000; throw new ProviderCreditError(); }
export function assertPublicReadBudget(): void { if (Date.now() < pausedUntil) throw new ProviderCreditError(); }
export function resetPublicReadBudget(): void { pausedUntil = 0; }
