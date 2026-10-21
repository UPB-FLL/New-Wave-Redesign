"""Render a client-branded audit deck (Slides artifact type) from a Python deck spec.

write_deck(spec, root) writes root/project/deck.json, root/project/slides/<id>.html and root/preview.html
(a local-only page that stacks every slide for the overflow check and screenshots).
Every slide is one <section> on a 1920x1080 canvas, inline styles only, in the Slides subset.
"""
import html
import json
import os
import re


def esc(s):
    return html.escape(str(s), quote=True)


def inline(s):
    t = esc(s)
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)


class K:
    """Slide kit bound to one theme."""

    def __init__(self, t):
        self.t = t
        self.c = t["colors"]
        self.disp = t["fonts"]["display"]
        self.body = t["fonts"]["body"]
        self.label = t["fonts"].get("label", self.body)
        self.dw = t.get("display_weight", 700)

    def tone(self, tone, dark=False):
        c = self.c
        return {"good": c["good"], "bad": c["bad"], "warn": c["warn"], "accent": c["accent_text"],
                "muted": c["muted"]}.get(tone, c["ink"])

    # ---------- atoms ----------
    def kicker(self, text, color=None, size=24):
        return (f'<p style="font-family:{self.label};font-size:{size}px;font-weight:600;letter-spacing:3px;'
                f'text-transform:uppercase;color:{color or self.c["accent_text"]}">{inline(text)}</p>')

    def heading(self, kicker, title, size=60, dark=False):
        ink = self.c["dark_ink"] if dark else self.c["ink"]
        return ('<div style="display:flex;flex-direction:column;gap:16px">'
                + (self.kicker(kicker, self.c["dark_accent"] if dark else None) if kicker else "")
                + f'<h2 style="font-family:{self.disp};font-size:{size}px;font-weight:{self.dw};line-height:1.1;color:{ink}">{inline(title)}</h2></div>')

    def p(self, text, size=28, color=None, extra=""):
        return f'<p style="font-size:{size}px;line-height:1.4;color:{color or self.c["body_muted"]}{";" + extra if extra else ""}">{inline(text)}</p>'

    # ---------- blocks ----------
    def kpis(self, items, value_size=72):
        n = len(items)
        out = []
        for it in items:
            vcol = self.tone(it.get("tone")) if it.get("tone") else self.c["ink"]
            out.append(
                f'<div style="display:flex;flex-direction:column;gap:10px;background:{self.c["panel_bg"]};border:1px solid {self.c["line"]};border-radius:{self.t["radius"]}px;padding:32px">'
                f'<p style="font-family:{self.label};font-size:24px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:{self.c["muted"]}">{inline(it["label"])}</p>'
                f'<p style="font-family:{self.disp};font-size:{it.get("size", value_size)}px;font-weight:{self.dw};line-height:1.05;color:{vcol}">{inline(it["value"])}</p>'
                + (f'<p style="font-size:24px;line-height:1.35;color:{self.c["muted"]}">{inline(it["note"])}</p>' if it.get("note") else "")
                + '</div>')
        return f'<div style="display:grid;grid-template-columns:repeat({n}, 1fr);gap:24px">' + "".join(out) + '</div>'

    def cards(self, items, body_size=26):
        out = []
        for it in items:
            bg, ink, muted, kcol, border = self.c["panel_bg"], self.c["ink"], self.c["body_muted"], self.c["accent_text"], f'1px solid {self.c["line"]}'
            if it.get("accent"):
                bg, ink, muted, kcol, border = self.c["accent"], self.c["on_accent"], self.c["on_accent"], self.c["on_accent"], "none"
            if it.get("dark"):
                bg, ink, muted, kcol, border = self.c["dark_bg"], self.c["dark_ink"], self.c["dark_muted"], self.c["dark_accent"], "none"
            body = it.get("body", "")
            if isinstance(body, list):
                body_html = '<ul style="font-size:%dpx;line-height:1.4;color:%s">' % (body_size, muted) + "".join(f"<li>{inline(x)}</li>" for x in body) + "</ul>"
            else:
                body_html = f'<p style="font-size:{body_size}px;line-height:1.4;color:{muted}">{inline(body)}</p>'
            out.append(
                f'<div style="flex:1;display:flex;flex-direction:column;gap:14px;background:{bg};border:{border};border-radius:{self.t["radius"]}px;padding:36px">'
                + (self.kicker(it["kicker"], kcol) if it.get("kicker") else "")
                + (f'<h3 style="font-family:{self.disp};font-size:{it.get("title_size", 38)}px;font-weight:{self.dw};line-height:1.15;color:{ink}">{inline(it["title"])}</h3>' if it.get("title") else "")
                + body_html + '</div>')
        return '<div style="display:flex;gap:24px">' + "".join(out) + '</div>'

    def table(self, columns, rows, size=26, highlight=()):
        c = self.c
        head = "".join(
            f'<th style="width:{col.get("w", "auto")};text-align:{col.get("align", "left")};font-family:{self.label};font-size:{size - 2}px;font-weight:600;color:{c["muted"]}">{inline(col["label"])}</th>'
            for col in columns)
        body = []
        for i, r in enumerate(rows):
            bg = f' style="background:{c["highlight_bg"]}"' if i in highlight else ""
            cells = []
            for j, v in enumerate(r):
                tone = None
                if isinstance(v, dict):
                    tone, v = v.get("tone"), v.get("v")
                col = self.tone(tone) if tone else c["ink"]
                cells.append(f'<td style="text-align:{columns[j].get("align", "left")};color:{col}">{inline(v)}</td>')
            body.append(f"<tr{bg}>" + "".join(cells) + "</tr>")
        return (f'<table style="font-family:{self.body};font-size:{size}px;color:{c["ink"]};font-variant-numeric:tabular-nums">'
                f"<tr>{head}</tr>" + "".join(body) + "</table>")

    def bars(self, series, label_w=420, bar_w=620, value_w=200, bar_h=30, size=26, mx=None):
        mx = mx or max(abs(s["value"]) for s in series) or 1
        rows = []
        for s in series:
            w = max(6, round(abs(s["value"]) / mx * bar_w))
            tone = s.get("tone")
            col = self.c["line_strong"] if tone == "muted" else (self.c["bad"] if tone == "bad" else self.c["accent"])
            rows.append(
                '<div style="display:flex;align-items:center;gap:24px">'
                f'<p style="width:{label_w}px;font-size:{size}px;line-height:1.25;color:{self.c["ink"]}">{inline(s["label"])}</p>'
                f'<div style="width:{bar_w}px;height:{bar_h}px;background:{self.c["track"]};border-radius:4px;display:flex">'
                f'<div style="width:{w}px;height:{bar_h}px;background:{col};border-radius:4px"></div></div>'
                f'<p style="width:{value_w}px;font-size:{size}px;font-weight:600;text-align:right;color:{self.c["ink"]}">{inline(s.get("display", s["value"]))}</p>'
                '</div>')
        return '<div style="display:flex;flex-direction:column;gap:18px">' + "".join(rows) + '</div>'

    def items(self, items, numbered=False, size=28, gap=18, dark=False):
        ink = self.c["dark_ink"] if dark else self.c["ink"]
        muted = self.c["dark_muted"] if dark else self.c["body_muted"]
        out = []
        for i, it in enumerate(items):
            if numbered:
                marker = (f'<div style="width:52px;height:52px;flex:none;background:{self.c["accent"]};border-radius:{max(self.t["radius"], 6)}px;display:flex;align-items:center;justify-content:center">'
                          f'<p style="font-family:{self.disp};font-size:28px;font-weight:{self.dw};color:{self.c["on_accent"]};text-align:center">{i + 1}</p></div>')
            else:
                marker = f'<div style="width:14px;height:14px;flex:none;background:{self.c["accent"]};border-radius:3px"></div>'
            lead = f'<span style="color:{ink}"><b>{inline(it["lead"])}</b></span> ' if it.get("lead") else ""
            out.append(f'<div style="display:flex;gap:22px;align-items:{"center" if numbered else "baseline"}">{marker}'
                       f'<p style="flex:1;font-size:{size}px;line-height:1.38;color:{muted}">{lead}{inline(it.get("text", ""))}</p></div>')
        return f'<div style="display:flex;flex-direction:column;gap:{gap}px">' + "".join(out) + '</div>'

    def callout(self, kicker, title, text, title_size=40):
        c = self.c
        return (f'<div style="display:flex;flex-direction:column;gap:16px;background:{c["dark_bg"]};border-radius:{self.t["radius"]}px;padding:44px">'
                + self.kicker(kicker, c["dark_accent"])
                + f'<h3 style="font-family:{self.disp};font-size:{title_size}px;font-weight:{self.dw};line-height:1.2;color:{c["dark_ink"]}">{inline(title)}</h3>'
                + (f'<p style="font-size:26px;line-height:1.4;color:{c["dark_muted"]}">{inline(text)}</p>' if text else "")
                + '</div>')

    def sub(self, kicker, title):
        return ('<div style="display:flex;flex-direction:column;gap:10px">' + self.kicker(kicker)
                + f'<h3 style="font-family:{self.disp};font-size:36px;font-weight:{self.dw};line-height:1.15;color:{self.c["ink"]}">{inline(title)}</h3></div>')

    def row(self, cols, flex=None, gap=56, align="start"):
        flex = flex or [1] * len(cols)
        return (f'<div style="display:flex;gap:{gap}px;align-items:{align}">'
                + "".join(f'<div style="flex:{f};display:flex;flex-direction:column;gap:24px">{"".join(c)}</div>' for f, c in zip(flex, cols))
                + '</div>')

    # ---------- slides ----------
    def footer(self, spec, n, total, dark=False):
        col = self.c["dark_muted"] if dark else self.c["muted"]
        return (f'<p style="position:absolute;left:128px;bottom:64px;width:1664px;font-family:{self.label};font-size:24px;'
                f'letter-spacing:2px;text-transform:uppercase;color:{col}">{esc(spec["company"])} · Marketing audit · {n:02d} / {total:02d}</p>')

    def content(self, sid, kicker, title, blocks, n, total, spec, notes="", title_size=60, section=None, gap=44):
        c = self.c
        sec = f' data-section="{esc(section)}"' if section else ""
        return (f'<section id="{sid}"{sec} data-transition="fade" style="background:{c["page_bg"]};color:{c["ink"]};font-family:{self.body};'
                f'padding:112px 128px 160px;display:flex;flex-direction:column;gap:{gap}px">'
                + self.heading(kicker, title, title_size) + "".join(blocks) + self.footer(spec, n, total)
                + (f"<aside>{esc(notes)}</aside>" if notes else "") + "</section>")

    def cover(self, sid, spec, logo, kicker, title, dek, notes="", section=None):
        c = self.c
        sec = f' data-section="{esc(section)}"' if section else ""
        return (f'<section id="{sid}"{sec} data-transition="fade" style="background:{c["cover_bg"]};color:{c["cover_ink"]};font-family:{self.body};'
                f'padding:112px 128px 128px;display:flex;flex-direction:column;justify-content:space-between;gap:40px">'
                f'<img src="{logo["src"]}" alt="{esc(logo["alt"])}" style="width:{logo["cover_w"]}px;height:{logo["cover_h"]}px;object-fit:contain">'
                '<div style="display:flex;flex-direction:column;gap:28px">'
                + self.kicker(kicker, c["cover_accent"], 28)
                + f'<h1 style="font-family:{self.disp};font-size:{spec.get("cover_title_size", 88)}px;font-weight:{self.dw};line-height:1.05;color:{c["cover_ink"]}">{inline(title)}</h1>'
                + f'<p style="font-size:34px;line-height:1.4;color:{c["cover_muted"]}">{inline(dek)}</p></div>'
                + f'<p style="font-family:{self.label};font-size:26px;letter-spacing:2px;text-transform:uppercase;color:{c["cover_muted"]}">{esc(spec["prepared_by"])}</p>'
                + (f"<aside>{esc(notes)}</aside>" if notes else "") + "</section>")

    def closing(self, sid, spec, kicker, title, steps, links, n, total, notes="", section=None):
        c = self.c
        sec = f' data-section="{esc(section)}"' if section else ""
        link_html = "".join(f'<p style="font-size:26px;line-height:1.4;color:{c["cover_muted"]}">{esc(lbl)}: <a href="{esc(url)}" style="color:{c["dark_accent"]}">{esc(url)}</a></p>' for lbl, url in links)
        return (f'<section id="{sid}"{sec} data-transition="fade" style="background:{c["cover_bg"]};color:{c["cover_ink"]};font-family:{self.body};'
                f'padding:112px 128px 160px;display:flex;flex-direction:column;gap:48px">'
                + self.heading(kicker, title, 72, dark=True)
                + self.items(steps, numbered=True, size=32, gap=26, dark=True)
                + '<div style="flex:1"></div>'
                + f'<div style="display:flex;flex-direction:column;gap:8px">{link_html}</div>'
                + self.footer(spec, n, total, dark=True)
                + (f"<aside>{esc(notes)}</aside>" if notes else "") + "</section>")


def write_deck(spec, root):
    os.makedirs(f"{root}/project/slides", exist_ok=True)
    order = [s["id"] for s in spec["slides"]]
    deck = {"v": 4, "createdOnFiles": {"v": 1, "at": spec["created_at"]}, "lists": "css", "title": spec["title"],
            "order": order, "sections": spec["sections"], "faces": spec["faces"], "designSystems": []}
    json.dump(deck, open(f"{root}/project/deck.json", "w"), indent=1, ensure_ascii=False)
    for s in spec["slides"]:
        open(f"{root}/project/slides/{s['id']}.html", "w").write(s["html"] + "\n")
    hrefs = [f["href"] for f in spec["faces"].values() if f.get("href")]
    links = "".join(f'<link rel="stylesheet" href="{esc(h)}">' for h in hrefs)
    prev = ("<!doctype html><html><head><meta charset='utf-8'>" + links +
            "<style>body{margin:0;background:#777}section{width:1920px;height:1080px;box-sizing:border-box;position:relative;overflow:hidden;margin:0 0 20px 0}"
            "section *{margin:0;box-sizing:border-box}section ul{padding-left:1.2em}aside{display:none}"
            "table{border-collapse:collapse;width:100%}th,td{padding:.35em .6em;border-bottom:1px solid rgba(127,127,127,.35);vertical-align:top}</style></head><body>"
            + "".join(s["html"] for s in spec["slides"]) + "</body></html>")
    open(f"{root}/preview.html", "w").write(prev)
    return order


# ---------- helpers shared by deck scripts ----------

def money(v, sign=False):
    s = f"${abs(v):,.0f}"
    return ("−" + s) if v < 0 else (("+" + s) if sign else s)


def r10(v):
    return round(v / 10) * 10


ROI_COLS = [{"label": "Scenario", "w": "17%"}, {"label": "Ads / mo", "align": "right", "w": "11%"}, {"label": "Leads / mo", "align": "right", "w": "11%"},
            {"label": "New jobs / mo", "align": "right", "w": "13%"}, {"label": "Revenue / mo", "align": "right", "w": "13%"},
            {"label": "Net / mo", "align": "right", "w": "11%"}, {"label": "12-month net", "align": "right", "w": "13%"}, {"label": "ROI", "align": "right", "w": "11%"}]


def roi_rows(roi_path):
    """Table rows for ROI_COLS from roi_model.py output, plus the raw scenarios."""
    sc = json.load(open(roi_path))["scenarios"]
    rows = []
    for name, label in [("conservative", "Conservative"), ("base", "Base"), ("upside", "Upside")]:
        m, y = sc[name]["steady_month"], sc[name]["year"]
        t = "bad" if y["net"] < 0 else "good"
        rows.append([f"**{label}**", money(r10(m["spend"])), f'{m["leads"]:.0f}', f'{m["jobs"]:.1f}', money(r10(m["revenue"])),
                     {"v": money(r10(m["net"]), True), "tone": "bad" if m["net"] < 0 else "good"},
                     {"v": money(r10(y["net"]), True), "tone": t}, {"v": f'{y["roi"] * 100:,.0f}%', "tone": t}])
    return rows, sc


def theme_from_audit(audit_spec_path, **over):
    """Reuse the full audit's theme (colors, fonts, logo) so the deck matches it."""
    t = dict(json.load(open(audit_spec_path))["theme"])
    t.update(over)
    return t


def finish(spec, slide_fns):
    """Number the slides: each entry is fn(n, total) -> {"id", "html"}."""
    total = len(slide_fns)
    spec["slides"] = [f(i, total) for i, f in enumerate(slide_fns, 1)]
    return spec
