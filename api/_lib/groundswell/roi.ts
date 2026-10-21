/**
 * Groundswell's ROI model: a TypeScript port of
 * .claude/skills/marketing-audit/scripts/roi_model.py (kept in parity by
 * src/test/api/groundswell-roi.test.ts).
 *
 * Models paid search, the one recommended change with a measurable cost-to-return path:
 *   clicks   = searches in the campaign area × impression share × CTR
 *   spend    = clicks × CPC
 *   leads    = clicks × conversion rate, scaled by the month's ramp factor
 *   jobs     = leads × incrementality × close rate
 *   revenue  = jobs × average ticket, plus repeat visits from earlier customers
 *   profit   = revenue × gross margin − spend
 * Management is fee-neutral: the only new money is ad spend.
 */

export interface RoiScenarioInputs {
  impression_share: number;
  ctr: number;
  cpc: number;
  cvr: number;
  close: number;
  ticket: number;
  gross_margin: number;
  incrementality?: number;
  repeat_per_year?: number;
  repeat_ticket?: number;
}

export interface RoiInputs {
  company: string;
  lever: string;
  demand_monthly: number;
  ramp: number[];
  scenarios: Record<string, RoiScenarioInputs>;
}

export interface RoiMonth {
  month: number;
  ramp: number;
  spend: number;
  leads: number;
  jobs: number;
  repeat_jobs: number;
  revenue: number;
  gross_profit: number;
  net: number;
  cum_net: number;
}

export interface RoiScenarioResult {
  inputs: RoiScenarioInputs;
  steady_month: {
    clicks: number;
    spend: number;
    leads: number;
    cpl: number | null;
    jobs: number;
    cost_per_job: number | null;
    revenue: number;
    gross_profit: number;
    net: number;
    roas: number | null;
    roi: number | null;
  };
  year: {
    spend: number;
    leads: number;
    jobs: number;
    repeat_jobs: number;
    revenue: number;
    gross_profit: number;
    net: number;
    roi: number | null;
    roas: number | null;
    payback_month: number | null;
  };
  months: RoiMonth[];
}

export interface RoiResult {
  company: string;
  lever: string;
  demand_monthly: number;
  ramp: number[];
  scenarios: Record<string, RoiScenarioResult>;
}

const TOTAL_KEYS = ['spend', 'leads', 'jobs', 'repeat_jobs', 'revenue', 'gross_profit', 'net'] as const;

export function runScenario(demand: number, s: RoiScenarioInputs, ramp: number[] = [], months = 12): Omit<RoiScenarioResult, 'inputs'> {
  const incrementality = s.incrementality ?? 1;
  const clicks = demand * s.impression_share * s.ctr;
  const spend = clicks * s.cpc;
  const steadyLeads = clicks * s.cvr;
  const rows: RoiMonth[] = [];
  const customersByMonth: number[] = [];
  let cumNet = 0;
  let payback: number | null = null;

  for (let m = 0; m < months; m++) {
    const f = m < ramp.length ? ramp[m] : 1;
    const leads = steadyLeads * f;
    // Only incremental leads count: some ad clickers would have found the business anyway.
    const jobs = leads * incrementality * s.close;
    const firstRev = jobs * s.ticket;
    // Repeat visits: each customer won in an earlier month returns at repeat_per_year/12 per month.
    const r = (s.repeat_per_year ?? 0) / 12;
    const repeatJobs = customersByMonth.reduce((a, b) => a + b, 0) * r;
    const repeatRev = repeatJobs * (s.repeat_ticket ?? 0);
    customersByMonth.push(jobs);
    const revenue = firstRev + repeatRev;
    const profit = revenue * s.gross_margin;
    const net = profit - spend;
    cumNet += net;
    if (payback === null && cumNet >= 0) payback = m + 1;
    rows.push({ month: m + 1, ramp: f, spend, leads, jobs, repeat_jobs: repeatJobs, revenue, gross_profit: profit, net, cum_net: cumNet });
  }

  const tot = Object.fromEntries(TOTAL_KEYS.map((k) => [k, rows.reduce((a, row) => a + row[k], 0)])) as Record<
    (typeof TOTAL_KEYS)[number],
    number
  >;
  const steadyJobs = steadyLeads * incrementality * s.close;
  const steadyRev = steadyJobs * s.ticket;
  const steadyGp = steadyRev * s.gross_margin;
  return {
    steady_month: {
      clicks,
      spend,
      leads: steadyLeads,
      cpl: steadyLeads ? spend / steadyLeads : null,
      jobs: steadyJobs,
      cost_per_job: steadyJobs ? spend / steadyJobs : null,
      revenue: steadyRev,
      gross_profit: steadyGp,
      net: steadyGp - spend,
      roas: spend ? steadyRev / spend : null,
      roi: spend ? (steadyGp - spend) / spend : null,
    },
    year: {
      ...tot,
      roi: tot.spend ? (tot.gross_profit - tot.spend) / tot.spend : null,
      roas: tot.spend ? tot.revenue / tot.spend : null,
      payback_month: payback,
    },
    months: rows,
  };
}

export function runRoiModel(inp: RoiInputs): RoiResult {
  const scenarios: Record<string, RoiScenarioResult> = {};
  for (const [name, s] of Object.entries(inp.scenarios)) {
    scenarios[name] = { inputs: s, ...runScenario(inp.demand_monthly, s, inp.ramp) };
  }
  return { company: inp.company, lever: inp.lever, demand_monthly: inp.demand_monthly, ramp: inp.ramp, scenarios };
}
