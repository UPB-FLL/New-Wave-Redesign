"""Build the one-page summary (US Letter) whose sections link to the slide deck in Google Drive.

Usage: python3 -I build_onepager.py <onepager.json> <audit_spec.json> <roi.json> <deck_root> <out.html>

onepager.json: company, place, logo (path relative to onepager.json), logo_h, prepared ("October 20, 2026"),
as_of ("October 2026"), headline, kpis [[value, label] x4], findings [[slide_id, text] x5], actions [x3],
links {deck_pdf, audit_pdf, folder}. Every link must be a Google Drive link; anything else is refused.
Slide numbers come from <deck_root>/project/deck.json, so "Slide 4" always names the right page.
Print it with: node render_pdf.cjs summary <out.html> <out.pdf>
"""
import base64
import html
import json
import os
import sys

DRIVE = "https://drive.google.com/"
MIME = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "svg": "image/svg+xml", "webp": "image/webp"}


def esc(s):
    return html.escape(str(s), quote=True)


def r10(v):
    return round(v / 10) * 10


def money(v, sign=False):
    s = f"${abs(v):,.0f}"
    return ("−" + s) if v < 0 else (("+" + s) if sign else s)


def main():
    spec_path, audit_path, roi_path, deck_root, out = sys.argv[1:6]
    c = json.load(open(spec_path))
    t = json.load(open(audit_path))["theme"]
    sc = json.load(open(roi_path))["scenarios"]
    order = json.load(open(os.path.join(deck_root, "project", "deck.json")))["order"]
    slide_no = {sid: i for i, sid in enumerate(order, 1)}
    links = c["links"]
    for k in ("deck_pdf", "audit_pdf", "folder"):
        if not str(links.get(k, "")).startswith(DRIVE):
            sys.exit(f"links.{k} must be a Google Drive link ({DRIVE}...), got: {links.get(k)!r}")
    col = t["colors"]
    fonts = t["fonts"]
    label_font = fonts.get("label", fonts["body"])
    dw = t.get("display_weight", 800)
    r = {k: (r10(v["year"]["net"]), r10(v["year"]["spend"]), round(v["year"]["roi"] * 100)) for k, v in sc.items()}
    logo_file = os.path.join(os.path.dirname(os.path.abspath(spec_path)), c["logo"])
    ext = logo_file.rsplit(".", 1)[-1].lower()
    logo = f"data:{MIME.get(ext, 'image/' + ext)};base64," + base64.b64encode(open(logo_file, "rb").read()).decode()

    def slide(sid):
        if sid not in slide_no:
            sys.exit(f"unknown slide id {sid!r}; the deck has {order}")
        return f'<a class="go" href="{esc(links["deck_pdf"])}">Slide {slide_no[sid]} →</a>'

    kpis = "".join(f'<div class="kpi"><div class="v">{esc(v)}</div><div class="l">{esc(lbl)}</div></div>' for v, lbl in c["kpis"])
    finds = "".join(f'<li><span>{esc(txt)}</span> {slide(sid)}</li>' for sid, txt in c["findings"])
    acts = "".join(f"<li>{esc(a)}</li>" for a in c["actions"])
    base, cons, up = r["base"], r["conservative"], r["upside"]
    css = f"""
    @page {{ size: Letter; margin: 0 }}
    * {{ box-sizing: border-box; margin: 0; padding: 0 }}
    body {{ font-family: {fonts['body']}; color: {col['ink']}; background: {col['page_bg']}; width: 8.5in; height: 11in; }}
    .top {{ background: {col['cover_bg']}; color: {col['cover_ink']}; padding: 0.42in 0.55in 0.36in; }}
    .brand {{ display: flex; justify-content: space-between; align-items: center; }}
    .brand img {{ height: {c.get('logo_h', 64)}px; width: auto; }}
    .brand .by {{ font-family: {label_font}; font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: {col['cover_muted']}; text-align: right; line-height: 1.5 }}
    .kick {{ font-family: {label_font}; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: {col['cover_accent']}; margin-top: 18px }}
    h1 {{ font-family: {fonts['display']}; font-weight: {dw}; font-size: 25px; line-height: 1.15; margin-top: 6px }}
    .body {{ padding: 0.3in 0.55in 0; }}
    .kpis {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }}
    .kpi {{ background: {col['panel_bg']}; border: 1px solid {col['line']}; border-radius: {t['radius']}px; padding: 11px 12px; }}
    .kpi .v {{ font-family: {fonts['display']}; font-weight: {dw}; font-size: 22px; line-height: 1.1 }}
    .kpi .l {{ font-size: 10px; line-height: 1.35; color: {col['muted']}; margin-top: 4px }}
    h2 {{ font-family: {label_font}; font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: {col['accent_text']}; margin: 20px 0 8px }}
    ul.f {{ list-style: none; }}
    ul.f li {{ display: flex; justify-content: space-between; gap: 18px; align-items: baseline; padding: 7px 0; border-bottom: 1px solid {col['line']}; font-size: 11.5px; line-height: 1.42; color: {col['body_muted']} }}
    a {{ color: {col['link']}; }}
    a.go {{ white-space: nowrap; font-weight: 600; font-size: 10.5px; text-decoration: none; color: {col['accent_text']} }}
    .roi {{ display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 10px; }}
    .roi > div {{ border-radius: {t['radius']}px; padding: 11px 13px; border: 1px solid {col['line']}; background: {col['panel_bg']} }}
    .roi .main {{ background: {col['accent']}; color: {col['on_accent']}; border: none }}
    .roi .n {{ font-family: {fonts['display']}; font-weight: {dw}; font-size: 20px; }}
    .roi .t {{ font-size: 10px; line-height: 1.4; margin-top: 3px }}
    .roi .main .t {{ color: {col['on_accent']} }}
    .roi .s .t {{ color: {col['muted']} }}
    .row {{ display: flex; justify-content: space-between; align-items: baseline }}
    ol {{ padding-left: 16px; font-size: 11.5px; line-height: 1.5; color: {col['body_muted']} }}
    .note {{ font-size: 9.5px; line-height: 1.45; color: {col['muted']}; margin-top: 8px }}
    .foot {{ position: absolute; left: 0.55in; right: 0.55in; bottom: 0.34in; border-top: 1px solid {col['line']}; padding-top: 8px; font-size: 9.5px; line-height: 1.55; color: {col['muted']} }}
    .foot a {{ word-break: break-all }}
    """
    cons_text = "Conservative case; a 60-day stop-loss caps it" if cons[0] < 0 else "Conservative case"
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{esc(c['company'])}: marketing audit, the high level</title>
<link rel="stylesheet" href="{esc(fonts['href'])}"><style>{css}</style></head><body>
<div class="top"><div class="brand"><img src="{logo}" alt="{esc(c['company'])}"><div class="by">Marketing audit · the high level<br>Prepared by New Wave: Social Engineering · {esc(c['prepared'])}</div></div>
<div class="kick">{esc(c['place'])} · public data, {esc(c['as_of'])}</div><h1>{esc(c['headline'])}</h1></div>
<div class="body">
<div class="row"><h2>At a glance</h2>{slide('glance')}</div>
<div class="kpis">{kpis}</div>
<h2>What we found</h2><ul class="f">{finds}</ul>
<div class="row"><h2>What the changes return · 12 months of Google Search ads</h2>{slide('roi')}</div>
<div class="roi"><div class="main"><div class="n">{money(base[0], True)} net</div><div class="t">Base case, on about {money(base[1])} of ad spend ({base[2]}% ROI)</div></div>
<div class="s"><div class="n">{money(cons[0], True)}</div><div class="t">{cons_text}</div></div>
<div class="s"><div class="n">{money(up[0], True)}</div><div class="t">Upside case</div></div></div>
<p class="note">Management replaces the fee you already pay your current marketing company, so the new money is ad spend. Ranges, not promises: your tracked calls and jobs replace our estimates after 90 days.</p>
<div class="row"><h2>The first 90 days</h2>{slide('plan')}</div><ol>{acts}</ol>
</div>
<div class="foot">Slide deck (PDF): <a href="{esc(links['deck_pdf'])}">{esc(links['deck_pdf'])}</a><br>Full audit (PDF): <a href="{esc(links['audit_pdf'])}">{esc(links['audit_pdf'])}</a><br>All files: <a href="{esc(links['folder'])}">{esc(links['folder'])}</a></div>
</body></html>"""
    open(out, "w").write(page)
    print("wrote", out)


if __name__ == "__main__":
    main()
