"""ROI model for the NWSE prospect reports.

Usage: python3 -I roi_model.py <inputs.json> [out.json]

Models paid search, the one recommended change with a measurable cost-to-return path:
  clicks   = searches in the campaign area x impression share x CTR
  spend    = clicks x CPC
  leads    = clicks x conversion rate (calls + forms), scaled by the month's ramp factor
  jobs     = leads x incrementality x close rate  (incrementality: Chan et al., Google 2012 --
             50% of ad clicks are incremental at organic rank 1, 82% at ranks 2-4, 96% at 5+)
  revenue  = jobs x average ticket, plus repeat visits from customers won earlier in the year
  profit   = revenue x gross margin - spend

Management is fee-neutral: NWSE's fee replaces the fee the business already pays its current marketing
company, so the only new money is ad spend. Everything else in the plan is reported as unmodeled upside.
"""
import json
import sys


def run_scenario(demand, s, months=12, ramp=None):
    ramp = ramp or [1.0] * months
    clicks = demand * s["impression_share"] * s["ctr"]
    spend = clicks * s["cpc"]
    steady_leads = clicks * s["cvr"]
    rows, customers_by_month = [], []
    cum_net = 0.0
    payback = None
    for m in range(months):
        f = ramp[m] if m < len(ramp) else 1.0
        leads = steady_leads * f
        # Only incremental leads count: some ad clickers would have found the business anyway.
        jobs = leads * s.get("incrementality", 1.0) * s["close"]
        first_rev = jobs * s["ticket"]
        # Repeat visits: each customer won in an earlier month returns at repeat_per_year/12 per month.
        r = s.get("repeat_per_year", 0.0) / 12.0
        repeat_jobs = sum(customers_by_month) * r
        repeat_rev = repeat_jobs * s.get("repeat_ticket", 0.0)
        customers_by_month.append(jobs)
        revenue = first_rev + repeat_rev
        profit = revenue * s["gross_margin"]
        net = profit - spend
        cum_net += net
        if payback is None and cum_net >= 0:
            payback = m + 1
        rows.append({"month": m + 1, "ramp": f, "spend": spend, "leads": leads, "jobs": jobs,
                     "repeat_jobs": repeat_jobs, "revenue": revenue, "gross_profit": profit,
                     "net": net, "cum_net": cum_net})
    tot = {k: sum(r[k] for r in rows) for k in ["spend", "leads", "jobs", "repeat_jobs", "revenue", "gross_profit", "net"]}
    steady_jobs = steady_leads * s.get("incrementality", 1.0) * s["close"]
    steady_rev = steady_jobs * s["ticket"]
    steady_gp = steady_rev * s["gross_margin"]
    return {
        "steady_month": {
            "clicks": clicks, "spend": spend, "leads": steady_leads,
            "cpl": spend / steady_leads if steady_leads else None,
            "jobs": steady_jobs, "cost_per_job": spend / steady_jobs if steady_jobs else None,
            "revenue": steady_rev, "gross_profit": steady_gp, "net": steady_gp - spend,
            "roas": steady_rev / spend if spend else None,
            "roi": (steady_gp - spend) / spend if spend else None,
        },
        "year": dict(tot, roi=(tot["gross_profit"] - tot["spend"]) / tot["spend"] if tot["spend"] else None,
                     roas=tot["revenue"] / tot["spend"] if tot["spend"] else None, payback_month=payback),
        "months": rows,
    }


def main():
    inp = json.load(open(sys.argv[1]))
    out = {"company": inp["company"], "lever": inp["lever"], "demand_monthly": inp["demand_monthly"],
           "ramp": inp["ramp"], "scenarios": {}}
    for name, s in inp["scenarios"].items():
        out["scenarios"][name] = {"inputs": s, **run_scenario(inp["demand_monthly"], s, ramp=inp["ramp"])}
    if len(sys.argv) > 2:
        json.dump(out, open(sys.argv[2], "w"), indent=1)
    print(f"{inp['company']} | {inp['lever']} | campaign-area searches/mo: {inp['demand_monthly']}")
    hdr = f"{'':13}{'clicks':>7}{'spend':>8}{'leads':>7}{'CPL':>7}{'jobs':>6}{'rev/mo':>9}{'GP/mo':>8}{'net/mo':>8}{'ROAS':>6}{'ROI':>7} | {'12-mo spend':>11}{'12-mo GP':>10}{'12-mo net':>10}{'ROI':>7}{'payback':>8}"
    print(hdr)
    for name, r in out["scenarios"].items():
        m, y = r["steady_month"], r["year"]
        print(f"{name:13}{m['clicks']:7.1f}{m['spend']:8.0f}{m['leads']:7.1f}{m['cpl']:7.0f}{m['jobs']:6.2f}{m['revenue']:9.0f}{m['gross_profit']:8.0f}{m['net']:8.0f}{m['roas']:6.1f}{m['roi']*100:6.0f}% | {y['spend']:11.0f}{y['gross_profit']:10.0f}{y['net']:10.0f}{y['roi']*100:6.0f}%{str(y['payback_month']):>8}")


if __name__ == "__main__":
    main()
