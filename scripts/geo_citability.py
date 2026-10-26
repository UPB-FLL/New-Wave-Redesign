#!/usr/bin/env python3
"""
GEO citability scorer — how quotable each page's passages are for AI answers.

Usage:
  python3 scripts/geo_citability.py --sitemap https://www.newwaveitfl.com/sitemap.xml [--json out.json]
  python3 scripts/geo_citability.py --dir dist [--json out.json]          # a local prerender
  python3 scripts/geo_citability.py --html-file post.html                 # one body fragment

Each page is split into heading-bounded blocks and every block is scored 0-100 on
answer-block quality (30), self-containment (25), structural readability (20),
statistical density (15) and uniqueness signals (10). A page's score is the mean of
its top five blocks (geo-seo-claude's page-level rule). Deterministic: the same HTML
always gets the same score, so week-over-week deltas are real.

Needs beautifulsoup4 (lxml optional). Used by the weekly GEO follow-up
(docs/GEO_WEEKLY_RUNBOOK.md).

This file is the MIT-noticed port kept in UPB-FLL/UPB-LIVESITE (scripts/geo_citability.py),
copied here unchanged apart from the user agent and the example URL.
The rubric in score_passage() is ported 1:1 from geo-seo-claude
(https://github.com/zubair-trabzada/geo-seo-claude, scripts/citability_scorer.py
@ 989cae0), used under its license:

  MIT License

  Copyright (c) 2026 Zubair Trabzada

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
"""
import argparse
import json
import os
import re
import statistics
import sys
import urllib.request

from bs4 import BeautifulSoup

try:
    import lxml  # noqa: F401
    PARSER = "lxml"
except ImportError:
    PARSER = "html.parser"

UA = "Mozilla/5.0 (compatible; NewWaveIT-GEO-audit/1.0; +https://www.newwaveitfl.com)"


def score_passage(text, heading=None):
    words = text.split()
    wc = len(words)
    s = dict(answer_block_quality=0, self_containment=0, structural_readability=0,
             statistical_density=0, uniqueness_signals=0)

    abq = 0
    for p in [r"\b\w+\s+is\s+(?:a|an|the)\s", r"\b\w+\s+refers?\s+to\s", r"\b\w+\s+means?\s",
              r"\b\w+\s+(?:can be |are )?defined\s+as\s", r"\bin\s+(?:simple|other)\s+(?:terms|words)\s*,"]:
        if re.search(p, text, re.I):
            abq += 15
            break
    f60 = " ".join(words[:60])
    if any(re.search(p, f60, re.I) for p in [r"\b(?:is|are|was|were|means?|refers?)\b", r"\d+%",
                                             r"\$[\d,]+", r"\d+\s+(?:million|billion|thousand)"]):
        abq += 15
    if heading and heading.endswith("?"):
        abq += 10
    sents = re.split(r"[.!?]+", text)
    if sents:
        abq += int(sum(1 for x in sents if 5 <= len(x.split()) <= 25) / len(sents) * 10)
    if re.search(r"(?:according to|research shows|studies? (?:show|indicate|suggest|found)|data (?:shows|indicates|suggests))", text, re.I):
        abq += 10
    s["answer_block_quality"] = min(abq, 30)

    sc = 0
    if 134 <= wc <= 167:
        sc += 10
    elif 100 <= wc <= 200:
        sc += 7
    elif 80 <= wc <= 250:
        sc += 4
    elif wc < 30 or wc > 400:
        sc += 0
    else:
        sc += 2
    pr = len(re.findall(r"\b(?:it|they|them|their|this|that|these|those|he|she|his|her)\b", text, re.I))
    if wc:
        r = pr / wc
        sc += 8 if r < 0.02 else 5 if r < 0.04 else 3 if r < 0.06 else 0
    pn = len(re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b", text))
    sc += 7 if pn >= 3 else 4 if pn >= 1 else 0
    s["self_containment"] = min(sc, 25)

    sr = 0
    if sents:
        a = wc / len(sents)
        sr += 8 if 10 <= a <= 20 else 5 if 8 <= a <= 25 else 2
    if re.search(r"(?:first|second|third|finally|additionally|moreover|furthermore)", text, re.I):
        sr += 4
    if re.search(r"(?:\d+[\.\)]\s|\b(?:step|tip|point)\s+\d+)", text, re.I):
        sr += 4
    if "\n" in text:
        sr += 4
    s["structural_readability"] = min(sr, 20)

    sd = min(len(re.findall(r"\d+(?:\.\d+)?%", text)) * 3, 6)
    sd += min(len(re.findall(r"\$[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|M|B|K))?", text)) * 3, 5)
    sd += min(len(re.findall(r"\b\d+(?:,\d{3})*(?:\.\d+)?\s+(?:users|customers|pages|sites|companies|businesses|people|percent|times|x\b)", text, re.I)) * 2, 4)
    if re.search(r"\b20(?:2[3-6]|1\d)\b", text):
        sd += 2
    for p in [r"(?:according to|per|from|by)\s+[A-Z]",
              r"(?:Gartner|Forrester|McKinsey|Harvard|Stanford|MIT|Google|Microsoft|OpenAI|Anthropic)",
              r"\([A-Z][a-z]+(?:\s+\d{4})?\)"]:
        if re.search(p, text):
            sd += 2
    s["statistical_density"] = min(sd, 15)

    us = 0
    if re.search(r"(?:our (?:research|study|data|analysis|survey|findings)|we (?:found|discovered|analyzed|surveyed|measured))", text, re.I):
        us += 5
    if re.search(r"(?:case study|for example|for instance|in practice|real-world|hands-on)", text, re.I):
        us += 3
    if re.search(r"(?:using|with|via|through)\s+[A-Z][a-z]+", text):
        us += 2
    s["uniqueness_signals"] = min(us, 10)

    return dict(heading=heading, word_count=wc, total_score=sum(s.values()), breakdown=s,
                preview=" ".join(words[:25]))


def score_html(html):
    """Blocks + page score for one HTML document or fragment (upstream extraction rules)."""
    soup = BeautifulSoup(html, PARSER)
    for el in soup.find_all(["script", "style", "nav", "footer", "header", "aside", "form"]):
        el.decompose()
    blocks, head, paras = [], "Introduction", []
    for el in soup.find_all(["h1", "h2", "h3", "h4", "p", "ul", "ol", "table"]):
        if el.name.startswith("h"):
            if paras:
                c = " ".join(paras)
                if len(c.split()) >= 20:
                    blocks.append((head, c))
            head, paras = el.get_text(strip=True), []
        else:
            t = el.get_text(strip=True)
            if t and len(t.split()) >= 5:
                paras.append(t)
    if paras:
        c = " ".join(paras)
        if len(c.split()) >= 20:
            blocks.append((head, c))
    scored = [score_passage(c, h) for h, c in blocks]
    tops = sorted((b["total_score"] for b in scored), reverse=True)
    return {
        "score": round(sum(tops[:5]) / len(tops[:5]), 1) if tops else 0,
        "avg_all_blocks": round(sum(tops) / len(tops), 1) if tops else 0,
        "blocks": len(scored),
        "optimal_length_blocks": sum(1 for b in scored if 134 <= b["word_count"] <= 167),
        "question_headings": sum(1 for h, _ in blocks if h.endswith("?")),
        "weakest": sorted(scored, key=lambda b: b["total_score"])[:3],
    }


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--sitemap", help="sitemap.xml URL; scores every <loc> live")
    g.add_argument("--dir", help="directory of prerendered */index.html")
    g.add_argument("--html-file", help="score one HTML file or body fragment")
    ap.add_argument("--json", help="write full results here")
    a = ap.parse_args()

    pages = {}
    if a.html_file:
        pages[a.html_file] = score_html(open(a.html_file, encoding="utf-8").read())
    elif a.dir:
        for root, _, files in os.walk(a.dir):
            if "index.html" in files:
                key = "/" + os.path.relpath(root, a.dir).replace(os.sep, "/").lstrip(".")
                pages[key.rstrip("/") or "/"] = score_html(open(os.path.join(root, "index.html"), encoding="utf-8").read())
    else:
        locs = re.findall(r"<loc>([^<]+)</loc>", fetch(a.sitemap))
        for u in locs:
            try:
                pages[u] = score_html(fetch(u))
            except Exception as e:  # keep going; report the miss
                pages[u] = {"error": str(e)}

    ok = {k: v for k, v in pages.items() if "score" in v}
    for k, v in sorted(ok.items(), key=lambda kv: kv[1]["score"]):
        print(f"{v['score']:5.1f}  blocks={v['blocks']:3}  q-headings={v['question_headings']:2}  {k}")
    if ok:
        vals = [v["score"] for v in ok.values()]
        print(f"\npages={len(ok)}  mean={statistics.mean(vals):.1f}  median={statistics.median(vals):.1f}"
              f"  errors={len(pages) - len(ok)}")
    if a.json:
        with open(a.json, "w", encoding="utf-8") as f:
            json.dump(pages, f, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
