"""Sample full-audit spec. Usage: python3 -I audit_spec.py <roi.json> <out audit_spec.json>

A real audit writes ten boards (references/report-specs.md); this sample keeps the cover and ROI boards.
"""
import json
import sys

roi_path, out = sys.argv[1:3]
sc = json.load(open(roi_path))["scenarios"]


def money(v, sign=False):
    s = f"${abs(v):,.0f}"
    return ("−" + s) if v < 0 else (("+" + s) if sign else s)


def r10(v):
    return round(v / 10) * 10


rows = []
for name, label in [("conservative", "Conservative"), ("base", "Base"), ("upside", "Upside")]:
    m, y = sc[name]["steady_month"], sc[name]["year"]
    tone = "bad" if y["net"] < 0 else "good"
    rows.append([f"**{label}**", money(r10(m["spend"])), f'{m["leads"]:.0f}', f'{m["jobs"]:.1f}', money(r10(m["revenue"])),
                 {"v": money(r10(m["net"]), True), "tone": tone}, {"v": money(r10(y["net"]), True), "tone": tone},
                 {"v": f'{y["roi"] * 100:,.0f}%', "tone": tone}])

theme = {
    "fonts": {"display": "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", "body": "'Inter', system-ui, sans-serif",
              "href": "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap"},
    "radius": 8,
    "logo": {"src": "asset:logo.svg", "alt": "Harbor Auto Care", "h_small": 56, "h_cover": 88},
    "colors": {
        "page_bg": "#ffffff", "panel_bg": "#f4f7fb", "ink": "#0b1320", "muted": "#4a5568", "body_muted": "#1f2937",
        "line": "#e2e8f0", "line_strong": "#cbd5e1", "track": "#edf2f7", "accent": "#1f6feb", "accent_text": "#1a56c4",
        "on_accent": "#ffffff", "highlight_bg": "#e8f0fe", "chip_bg": "#f4f7fb",
        "dark_bg": "#0b1320", "dark_ink": "#ffffff", "dark_muted": "#cbd5e1", "dark_accent": "#79a8ff",
        "cover_bg": "#0b1320", "cover_ink": "#ffffff", "cover_muted": "#cbd5e1", "cover_accent": "#79a8ff", "cover_line": "#1f2937",
        "good": "#1e7b34", "warn": "#8a5a00", "bad": "#b42318", "link": "#1a56c4", "link_hover": "#0b1320",
    },
}

boards = [
    {"file": "Main", "name": "Overview", "cover": True, "kicker": "Marketing audit · Fort Lauderdale, FL · sample",
     "title": "Sample: a well-reviewed shop that search ads could fill.",
     "dek": "Invented data that shows the layout of a full audit.",
     "blocks": [{"type": "kpis", "items": [{"label": "Google rating", "value": "4.7★", "note": "Sample."},
                                           {"label": "Google ads", "value": "0", "tone": "bad", "note": "Sample."},
                                           {"label": "Base case, 12 months", "value": money(r10(sc["base"]["year"]["net"]), True), "dark": True,
                                            "note": f'On about {money(r10(sc["base"]["year"]["spend"]))} of ad spend.'}]}]},
    {"file": "ROI", "name": "Return on investment", "kicker": "Return on investment",
     "title": "What paid search returns: a range, not a promise",
     "blocks": [{"type": "table", "highlight": [1], "columns": [
         {"label": "Scenario"}, {"label": "Ads / mo", "align": "right"}, {"label": "Leads / mo", "align": "right"},
         {"label": "New jobs / mo", "align": "right"}, {"label": "Revenue / mo", "align": "right"}, {"label": "Net / mo", "align": "right"},
         {"label": "12-month net", "align": "right"}, {"label": "ROI", "align": "right"}], "rows": rows,
         "caption": "Steady-state month; the 12-month columns include a slower first two months."},
         {"type": "note", "text": "Management is fee-neutral: it replaces the business's current marketing fee, so the new money is ad spend."}]},
]

spec = {"company": "Harbor Auto Care", "canvas_title": "Harbor Auto Care Marketing Audit (sample)",
        "report_label": "Marketing audit · October 2026", "footer_label": "Marketing audit",
        "prepared_by": "Prepared by New Wave: Social Engineering · October 20, 2026",
        "created_at": "2026-10-20T00:00:00Z", "per_row": 3, "theme": theme, "boards": boards}
json.dump(spec, open(out, "w"), indent=1, ensure_ascii=False)
print("wrote", out, len(boards), "boards")
