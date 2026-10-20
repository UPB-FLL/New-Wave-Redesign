# ROI method

One recommended change gets a modeled return: Google Search ads, because it is the only lever with a
measurable cost-to-return path from public data. Everything else in the plan (profile fixes, website,
Instagram, reviews) is reported as unmodeled upside, never added to the numbers.

## Fee-neutral framing

NWSE's management fee replaces the fee the business already pays its current marketing company, so the
only new money is ad spend. Say so on the ROI board, the ROI slide and the summary. If the business has no
current marketer (the notes or research say so), say that the fee is not included and the numbers are
before it.

## Model (`scripts/roi_model.py`)

```
clicks   = demand_monthly × impression_share × ctr
spend    = clicks × cpc
leads    = clicks × cvr × ramp[month]
jobs     = leads × incrementality × close
revenue  = jobs × ticket + repeat visits from customers won earlier (repeat_per_year / 12 × repeat_ticket)
net      = revenue × gross_margin − spend
```

12 months; ramp `[0.5, 0.75, 1, …]` (a learning period at full spend). Outputs a steady-state month and
the 12-month totals with ROI and payback month for three scenarios.

## Inputs (`$W/roi_inputs.json`, shape as in `examples/sample/roi_inputs.json`)

| Input | Where it comes from |
|---|---|
| `demand_monthly` | Keyword Planner monthly searches for the core keywords in the campaign area only (not the whole metro), duplicates removed. Save the planner output under `$W/raw/`. |
| `impression_share` | 0.50 / 0.65 / 0.75: what a new, modest-budget account wins. |
| `ctr`, `cvr`, `cpc` | The newest LocaliQ (WordStream) search-ad benchmarks for the closest industry; discount CVR for a new account in the base case. CPC must sit inside the planner's top-of-page bid range for the area. |
| `close` | Lead-to-job rate: industry survey or derived estimate, cited. |
| `ticket` | Published prices first (the business's, then competitors' price pages), then industry price data; show the job-mix arithmetic in `sources`. |
| `gross_margin` | Industry survey, cited. |
| `incrementality` | Chan, Kumar, Ma, Koehler (Google, 2012), 390 search-ad pause studies: 50% of ad clicks are incremental when the business already ranks first organically, 82% at ranks 2–4, 96% at 5+. Use Maps position near the shop as the proxy for rank, weighted by area. |
| `repeat_per_year`, `repeat_ticket` | Only where the business has a real repeat pattern (detailing, maintenance); otherwise omit. |

Every input carries its source in `sources`. Conservative must be genuinely conservative: when it loses
money, say so and pair it with a stop-loss (e.g. "if cost per lead is above $X after 60 days, pull back").

## Presenting the numbers

- Round money to the nearest $10 (`r10`) everywhere; show the same figure on every output.
- Show the steady-state month and the 12-month net and ROI for all three scenarios; highlight the base.
- State the demand, ticket, margin and benchmark sources in plain words under the table.
- "Ranges, not promises": the business's own tracked calls and jobs replace the estimates after 90 days.
