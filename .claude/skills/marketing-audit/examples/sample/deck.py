"""Sample deck. Usage: python3 -I deck.py <audit_spec.json> <roi.json> <deck_root> <audit_pdf_drive_link>

A real deck has eleven slides (references/report-specs.md); this sample keeps the ones the summary links to.
The closing slide links only to the full audit PDF in Google Drive.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "scripts"))
from slidekit import K, ROI_COLS, finish, money, r10, roi_rows, theme_from_audit, write_deck  # noqa: E402

audit_spec, roi_path, root, audit_pdf = sys.argv[1:5]
if not audit_pdf.startswith("https://drive.google.com/"):
    sys.exit("the closing slide's link must be the audit PDF's Google Drive link")
GF = "https://fonts.googleapis.com/css2?family="
t = theme_from_audit(audit_spec, display_weight=800)
k = K(t)
rows, sc = roi_rows(roi_path)
b = sc["base"]["year"]
spec = {"company": "Harbor Auto Care", "prepared_by": "Prepared by New Wave: Social Engineering · October 20, 2026",
        "title": "Harbor Auto Care: Marketing Audit (sample)", "created_at": "2026-10-20T00:00:00Z", "report_url": audit_pdf,
        "faces": {"plus-jakarta-sans": {"family": "Plus Jakarta Sans", "href": GF + "Plus+Jakarta+Sans:wght@600;700;800&display=swap"},
                  "inter": {"family": "Inter", "href": GF + "Inter:wght@400;500;600;700&display=swap"}},
        "sections": {"s1": {"description": "Where the business stands", "start": "cover"},
                     "s2": {"description": "The plan and what it returns", "start": "plan"}}}
logo = {"src": "asset:logo.svg", "alt": "Harbor Auto Care", "cover_w": 320, "cover_h": 96}
C = lambda sid, kick, title, blocks, notes="", **kw: (lambda n, tot: {"id": sid, "html": k.content(sid, kick, title, blocks, n, tot, spec, notes, **kw)})
slides = [
    lambda n, tot: {"id": "cover", "html": k.cover("cover", spec, logo, "Marketing audit · Fort Lauderdale, FL · sample",
                                                   "Sample: a well-reviewed shop that search ads could fill.",
                                                   "Invented data that shows the layout of a real deck.")},
    C("glance", "At a glance", "Sample: earned reputation, uncaptured demand.", [
        k.kpis([{"label": "Google rating", "value": "4.7★", "note": "Sample."}, {"label": "Google ads", "value": "0", "tone": "bad", "note": "Sample."}]),
        k.cards([{"accent": True, "kicker": "Base case · 12 months", "title": f"{money(r10(b['net']), True)} net",
                  "body": f"On about {money(r10(b['spend']))} of Google Ads."}])]),
    C("plan", "The plan", "Measure first. Then buy the demand.", [
        k.cards([{"kicker": "Weeks 1–2", "title": "Measure", "body": ["Analytics", "Call tracking"]},
                 {"kicker": "Weeks 3–6", "title": "Launch", "body": ["Search campaign"]},
                 {"kicker": "Weeks 7–12", "title": "Expand", "body": ["New pages"]}], body_size=28)]),
    C("roi", "Return on investment", "A range, not a promise", [k.table(ROI_COLS, rows, size=28, highlight=(1,))]),
    lambda n, tot: {"id": "next", "html": k.closing("next", spec, "Next step", "Start with measurement.", [
        {"lead": "This week:", "text": "analytics and call tracking."}], [("Full audit (PDF)", spec["report_url"])], n, tot)},
]
order = write_deck(finish(spec, slides), root)
print("wrote", root, len(order), "slides:", " ".join(order))
