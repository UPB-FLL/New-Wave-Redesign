"""Render the full marketing audit (one 1440px-wide board per topic) from a spec.

Usage: python3 -I build_audit.py <spec.json> <out_root> [--heights <out_root>/heights.json]

Writes <out_root>/project/canvas.json and one <out_root>/project/<Board>.dc.html per board, in the
claude.ai Design canvas format, so the same output can be published as a canvas or printed to PDF.
Every style is inline; every element is closed. Board heights come from heights.json (measured by
measure_audit.cjs) or the spec's default. Spec format: references/report-specs.md.
"""
import html
import json
import re
import sys

W = 1440


def esc(s):
    return html.escape(str(s), quote=True)


def inline(s):
    """Escape, then allow **bold** and *italic* markers."""
    t = esc(s)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", t)
    return t


class Theme:
    def __init__(self, t):
        self.t = t
        c = t["colors"]
        self.c = c
        self.display = t["fonts"]["display"]
        self.body = t["fonts"]["body"]
        self.mono = t["fonts"].get("mono", self.body)
        self.label = t["fonts"].get("label", self.body)
        self.dw = t.get("display_weight", 800)
        self.dw2 = t.get("display_weight_2", 700)
        self.radius = t.get("radius", 12)
        self.kicker_case = t.get("kicker_case", "uppercase")

    def kicker(self, text, color=None, size=13):
        return (f'<div style="font-family: {self.label}; font-size: {size}px; font-weight: 600; letter-spacing: 0.12em; '
                f'text-transform: {self.kicker_case}; color: {color or self.c["accent_text"]}">{inline(text)}</div>')


def tone_color(th, tone, dark=False):
    c = th.c
    m = {"good": c["good"], "warn": c["warn"], "bad": c["bad"], "accent": c["dark_accent"] if dark else c["accent_text"],
         "muted": c["dark_muted"] if dark else c["muted"], None: c["dark_ink"] if dark else c["ink"]}
    return m.get(tone, m[None])


# ---------- blocks ----------

def b_kpis(th, b):
    items = b["items"]
    n = b.get("columns", len(items))
    cells = []
    for it in items:
        dark = it.get("dark", False)
        bg = th.c["dark_bg"] if dark else th.c["panel_bg"]
        ink = th.c["dark_ink"] if dark else th.c["ink"]
        muted = th.c["dark_muted"] if dark else th.c["muted"]
        border = "none" if dark else f'1px solid {th.c["line"]}'
        vcol = tone_color(th, it.get("tone"), dark) if it.get("tone") else ink
        cells.append(
            f'<div style="background: {bg}; border: {border}; border-radius: {th.radius}px; padding: 22px 24px; display: flex; flex-direction: column; gap: 8px; min-width: 0">'
            f'<div style="font-family: {th.label}; font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: {muted}">{inline(it["label"])}</div>'
            f'<div style="font-family: {th.display}; font-size: {it.get("size", 40)}px; font-weight: {th.dw2}; line-height: 1.05; letter-spacing: -0.02em; color: {vcol}">{inline(it["value"])}</div>'
            + (f'<div style="font-family: {th.body}; font-size: 14px; line-height: 1.45; color: {muted}">{inline(it["note"])}</div>' if it.get("note") else "")
            + '</div>')
    return (f'<div style="display: grid; grid-template-columns: repeat({n}, minmax(0, 1fr)); gap: 16px">' + "".join(cells) + '</div>')


def b_table(th, b):
    cols = b["columns"]
    hl = set(b.get("highlight", []))
    fs = b.get("font_size", 15)
    pad = b.get("pad", "11px 14px")
    head = "".join(
        f'<th style="padding: {pad}; text-align: {c.get("align", "left")}; font-family: {th.label}; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: {th.c["muted"]}; border-bottom: 2px solid {th.c["ink"]}; width: {c.get("w", "auto")}">{inline(c["label"])}</th>'
        for c in cols)
    rows = []
    for i, r in enumerate(b["rows"]):
        bg = th.c["highlight_bg"] if i in hl else "transparent"
        weight = "600" if i in hl else "400"
        cells = []
        for j, v in enumerate(r):
            c = cols[j]
            tone = None
            if isinstance(v, dict):
                tone, v = v.get("tone"), v.get("v")
            color = tone_color(th, tone) if tone else th.c["ink"]
            cells.append(f'<td style="padding: {pad}; text-align: {c.get("align", "left")}; border-bottom: 1px solid {th.c["line"]}; color: {color}; font-weight: {weight}; vertical-align: top">{inline(v)}</td>')
        rows.append(f'<tr style="background: {bg}">' + "".join(cells) + '</tr>')
    cap = (f'<div style="font-family: {th.body}; font-size: 13px; line-height: 1.5; color: {th.c["muted"]}; margin-top: 10px">{inline(b["caption"])}</div>' if b.get("caption") else "")
    return (f'<div style="min-width: 0"><table style="width: 100%; border-collapse: collapse; font-family: {th.body}; font-size: {fs}px; line-height: 1.4; font-variant-numeric: tabular-nums">'
            f'<thead><tr>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table>{cap}</div>')


def b_cards(th, b):
    items = b["items"]
    n = b.get("columns", len(items))
    out = []
    for it in items:
        dark = it.get("dark", False)
        bg = th.c["dark_bg"] if dark else th.c["panel_bg"]
        ink = th.c["dark_ink"] if dark else th.c["ink"]
        muted = th.c["dark_muted"] if dark else th.c["body_muted"]
        kcol = th.c["dark_accent"] if dark else th.c["accent_text"]
        border = "none" if dark else f'1px solid {th.c["line"]}'
        if it.get("accent"):
            bg, ink, muted, kcol, border = th.c["accent"], th.c["on_accent"], th.c["on_accent"], th.c["on_accent"], "none"
        body = it.get("body", "")
        if isinstance(body, list):
            body_html = ('<ul style="margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px">'
                         + "".join(f'<li>{inline(x)}</li>' for x in body) + '</ul>')
        else:
            body_html = f'<div>{inline(body)}</div>'
        out.append(
            f'<div style="background: {bg}; border: {border}; border-radius: {th.radius}px; padding: 24px 26px; display: flex; flex-direction: column; gap: 10px; min-width: 0">'
            + (th.kicker(it["kicker"], kcol, 12) if it.get("kicker") else "")
            + (f'<div style="font-family: {th.display}; font-size: {it.get("title_size", 22)}px; font-weight: {th.dw2}; line-height: 1.2; letter-spacing: -0.01em; color: {ink}">{inline(it["title"])}</div>' if it.get("title") else "")
            + f'<div style="font-family: {th.body}; font-size: 15px; line-height: 1.55; color: {muted}">{body_html}</div>'
            + '</div>')
    return f'<div style="display: grid; grid-template-columns: repeat({n}, minmax(0, 1fr)); gap: 18px">' + "".join(out) + '</div>'


def b_list(th, b):
    items = b["items"]
    numbered = b.get("numbered", False)
    out = []
    for i, it in enumerate(items):
        marker = (f'<div style="flex: 0 0 34px; height: 34px; border-radius: {max(th.radius, 6)}px; background: {th.c["accent"]}; color: {th.c["on_accent"]}; font-family: {th.display}; font-weight: {th.dw2}; font-size: 16px; display: flex; align-items: center; justify-content: center">{i + 1}</div>'
                  if numbered else f'<div style="flex: 0 0 10px; height: 10px; margin-top: 7px; border-radius: 2px; background: {th.c["accent"]}"></div>')
        tag = (f'<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; background: {th.c["chip_bg"]}; color: {th.c["ink"]}">{inline(it["tag"])}</span>' if it.get("tag") else "")
        out.append(
            f'<div style="display: flex; gap: 14px; align-items: flex-start">{marker}'
            f'<div style="font-family: {th.body}; font-size: {b.get("font_size", 16)}px; line-height: 1.5; color: {th.c["body_muted"]}; min-width: 0">'
            + (f'<strong style="color: {th.c["ink"]}">{inline(it["lead"])}</strong>{tag} ' if it.get("lead") else "")
            + f'{inline(it.get("text", ""))}</div></div>')
    return f'<div style="display: flex; flex-direction: column; gap: {b.get("gap", 14)}px">' + "".join(out) + '</div>'


def b_timeline(th, b):
    items = b["items"]
    out = []
    for it in items:
        dot = tone_color(th, it.get("tone", "accent"))
        out.append(
            f'<div style="display: grid; grid-template-columns: 150px 18px minmax(0, 1fr); gap: 16px; align-items: start">'
            f'<div style="font-family: {th.mono}; font-size: 14px; font-weight: 600; color: {th.c["muted"]}; text-align: right; padding-top: 2px">{inline(it["date"])}</div>'
            f'<div style="position: relative; width: 14px; height: 14px; border-radius: 999px; background: {dot}; margin-top: 4px; box-shadow: 0 0 0 4px {th.c["page_bg"]}"></div>'
            f'<div style="font-family: {th.body}; font-size: 15px; line-height: 1.5; color: {th.c["body_muted"]}"><strong style="color: {th.c["ink"]}">{inline(it["title"])}</strong>'
            + (f' {inline(it["text"])}' if it.get("text") else "") + '</div></div>')
    return (f'<div style="position: relative; display: flex; flex-direction: column; gap: 14px">'
            f'<div style="position: absolute; left: 172px; top: 8px; bottom: 8px; width: 2px; background: {th.c["line"]}"></div>'
            + "".join(out) + '</div>')


def b_bars(th, b):
    mx = b.get("max") or max(abs(s["value"]) for s in b["series"]) or 1
    rows = []
    for s in b["series"]:
        pct = max(0.5, abs(s["value"]) / mx * 100)
        col = tone_color(th, s.get("tone", "accent")) if s.get("tone") != "muted" else th.c["line_strong"]
        rows.append(
            f'<div style="display: grid; grid-template-columns: {b.get("label_w", 260)}px minmax(0, 1fr) {b.get("value_w", 120)}px; gap: 14px; align-items: center">'
            f'<div style="font-family: {th.body}; font-size: 14px; line-height: 1.3; color: {th.c["ink"]}">{inline(s["label"])}</div>'
            f'<div style="height: {b.get("bar_h", 18)}px; background: {th.c["track"]}; border-radius: 3px"><div style="width: {pct:.1f}%; height: 100%; background: {col}; border-radius: 3px"></div></div>'
            f'<div style="font-family: {th.body}; font-size: 14px; font-weight: 600; color: {th.c["ink"]}; text-align: right; font-variant-numeric: tabular-nums">{inline(s.get("display", s["value"]))}</div></div>')
    title = f'<div style="font-family: {th.label}; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: {th.c["muted"]}">{inline(b["title"])}</div>' if b.get("title") else ""
    return f'<div style="display: flex; flex-direction: column; gap: 10px">{title}' + "".join(rows) + '</div>'


def b_note(th, b):
    return f'<div style="font-family: {th.body}; font-size: {b.get("font_size", 13)}px; line-height: 1.55; color: {th.c["muted"]}">{inline(b["text"])}</div>'


def b_heading(th, b):
    return (f'<div style="display: flex; flex-direction: column; gap: 6px">' + (th.kicker(b["kicker"], None, 12) if b.get("kicker") else "")
            + f'<div style="font-family: {th.display}; font-size: {b.get("size", 26)}px; font-weight: {th.dw2}; line-height: 1.2; letter-spacing: -0.01em; color: {th.c["ink"]}">{inline(b["text"])}</div></div>')


def b_callout(th, b):
    dark = b.get("dark", True)
    bg = th.c["dark_bg"] if dark else th.c["highlight_bg"]
    ink = th.c["dark_ink"] if dark else th.c["ink"]
    muted = th.c["dark_muted"] if dark else th.c["body_muted"]
    return (f'<div style="background: {bg}; border-radius: {th.radius}px; padding: 26px 30px; display: flex; flex-direction: column; gap: 8px">'
            + (th.kicker(b["kicker"], th.c["dark_accent"] if dark else th.c["accent_text"], 12) if b.get("kicker") else "")
            + f'<div style="font-family: {th.display}; font-size: {b.get("size", 26)}px; font-weight: {th.dw2}; line-height: 1.25; color: {ink}">{inline(b["title"])}</div>'
            + (f'<div style="font-family: {th.body}; font-size: 15px; line-height: 1.55; color: {muted}">{inline(b["text"])}</div>' if b.get("text") else "")
            + '</div>')


def b_row(th, b):
    widths = b.get("widths") or ["minmax(0, 1fr)"] * len(b["cols"])
    cols = "".join(f'<div style="display: flex; flex-direction: column; gap: {b.get("inner_gap", 18)}px; min-width: 0">' + "".join(render_block(th, x) for x in col) + '</div>' for col in b["cols"])
    return f'<div style="display: grid; grid-template-columns: {" ".join(widths)}; gap: {b.get("gap", 32)}px; align-items: {b.get("align", "start")}">{cols}</div>'


def b_image(th, b):
    cap = (f'<div style="font-family: {th.body}; font-size: 14px; line-height: 1.5; color: {th.c["muted"]}">{inline(b["caption"])}</div>' if b.get("caption") else "")
    frame = f'border: 1px solid {th.c["line_strong"]}; border-radius: {th.radius}px; ' if b.get("frame", True) else ""
    return (f'<div style="display: flex; flex-direction: column; gap: 10px; width: {b["width"]}px">'
            f'<img src="{esc(b["src"])}" alt="{esc(b["alt"])}" style="width: {b["width"]}px; height: auto; display: block; {frame}">{cap}</div>')


BLOCKS = {"image": b_image, "kpis": b_kpis, "table": b_table, "cards": b_cards, "list": b_list, "timeline": b_timeline,
          "bars": b_bars, "note": b_note, "heading": b_heading, "callout": b_callout, "row": b_row}


def render_block(th, b):
    return BLOCKS[b["type"]](th, b)


# ---------- boards ----------

def board_html(th, spec, board, idx, total, height):
    c = th.c
    logo = spec["theme"]["logo"]
    is_cover = board.get("cover", False)
    bg = c["cover_bg"] if is_cover else c["page_bg"]
    ink = c["cover_ink"] if is_cover else c["ink"]
    muted = c["cover_muted"] if is_cover else c["muted"]
    header = (
        f'<div style="display: flex; justify-content: space-between; align-items: center; gap: 24px">'
        f'<div style="display: flex; align-items: center; gap: 18px">'
        f'<img src="{esc(logo["src"])}" alt="{esc(logo["alt"])}" style="height: {logo.get("h_cover", 96) if is_cover else logo.get("h_small", 56)}px; width: auto; display: block">'
        f'<div style="font-family: {th.label}; font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: {muted}">{inline(spec["report_label"])}</div></div>'
        f'<div style="font-family: {th.body}; font-size: 13px; color: {muted}; text-align: right">{inline(spec["prepared_by"])}</div></div>')
    title = (
        f'<div style="display: flex; flex-direction: column; gap: 14px; max-width: {board.get("title_max", 1120)}px">'
        + (th.kicker(board["kicker"], c["cover_accent"] if is_cover else c["accent_text"], 14) if board.get("kicker") else "")
        + f'<h1 style="margin: 0; font-family: {th.display}; font-weight: {th.dw}; font-size: {board.get("title_size", 52)}px; line-height: 1.05; letter-spacing: -0.02em; color: {ink}">{inline(board["title"])}</h1>'
        + (f'<p style="margin: 0; font-family: {th.body}; font-size: 19px; line-height: 1.55; color: {muted}; max-width: 980px">{inline(board["dek"])}</p>' if board.get("dek") else "")
        + '</div>')
    blocks = "".join(render_block(th, b) for b in board.get("blocks", []))
    footer = (
        f'<div style="margin-top: auto; padding-top: 18px; border-top: 1px solid {c["cover_line"] if is_cover else c["line"]}; display: flex; justify-content: space-between; '
        f'font-family: {th.label}; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: {muted}">'
        f'<div>{inline(spec["company"])} · {inline(spec["footer_label"])}</div><div>{idx:02d} / {total:02d}</div></div>')
    root = (f'<div style="width: {W}px; height: {height}px; box-sizing: border-box; padding: 56px 72px 40px; background: {bg}; color: {ink}; '
            f'font-family: {th.body}; display: flex; flex-direction: column; gap: {board.get("gap", 34)}px; overflow: hidden">'
            + header + title + blocks + footer + '</div>')
    acol, ahov = c["link"], c["link_hover"]
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{esc(spec["company"])}: {esc(board["name"])}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="{esc(spec["theme"]["fonts"]["href"])}">
<style>
body{{margin:0}}
a{{color:{acol}}}a:hover{{color:{ahov}}}
</style>
</helmet>
{root}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{W},"height":{height}}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
"""


def main():
    spec = json.load(open(sys.argv[1]))
    out_root = sys.argv[2]
    heights = {}
    if "--heights" in sys.argv:
        heights = json.load(open(sys.argv[sys.argv.index("--heights") + 1]))
    th = Theme(spec["theme"])
    import os
    os.makedirs(f"{out_root}/project", exist_ok=True)
    boards = spec["boards"]
    total = len(boards)
    entries, order = {}, []
    per_row = spec.get("per_row", 3)
    x = y = 0
    row_h = 0
    for i, b in enumerate(boards):
        fname = f'{b["file"]}.dc.html'
        h = int(heights.get(fname, b.get("height", 1180)))
        open(f"{out_root}/project/{fname}", "w").write(board_html(th, spec, b, i + 1, total, h))
        col = i % per_row
        if col == 0 and i > 0:
            y += row_h + 120
            row_h = 0
        x = col * (W + 80)
        row_h = max(row_h, h)
        entries[fname] = {"x": x, "y": y, "w": W, "h": h, "title": b["name"]}
        order.append(fname)
    canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": spec["created_at"]}, "title": spec["canvas_title"],
              "launch": {"view": "canvas"}, "pages": [], "boards": entries, "order": order, "notes": {}, "designSystems": []}
    json.dump(canvas, open(f"{out_root}/project/canvas.json", "w"), indent=1)
    print(f"wrote {total} boards + canvas.json to {out_root}/project")


if __name__ == "__main__":
    main()
