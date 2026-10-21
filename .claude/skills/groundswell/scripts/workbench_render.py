"""Print an audit's three PDFs inside Composio's workbench (COMPOSIO_REMOTE_WORKBENCH).

Not run on this machine: paste this file's text into a workbench cell, then call
    assemble(PIECES_DIR, MANIFEST)      # after writing each piece_NN into PIECES_DIR, see drive-publishing.md
    render_all(BUNDLE_DIR, OUT_DIR)     # -> {"audit": {...}, "deck": {...}, "summary": {...}}
render_all runs Playwright in a worker thread (the notebook's own event loop refuses the sync API) and
prints with the same page sizes and options as render_pdf.cjs. Compare each result's pages and links
with the local PDFs before uploading; they must match.
"""
import base64
import hashlib
import json
import os
import re
import tarfile
from concurrent.futures import ThreadPoolExecutor

MIME = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp", "svg": "image/svg+xml"}


def assemble(pieces_dir, manifest, bundle_dir=None):
    text = ""
    for p in manifest["pieces"]:
        s = open(os.path.join(pieces_dir, p["name"])).read()
        if len(s) != p["chars"] or hashlib.sha256(s.encode()).hexdigest()[:16] != p["sha16"]:
            raise ValueError(f"{p['name']} does not match the manifest; send it again")
        text += s
    raw = base64.b64decode(text)
    if hashlib.sha256(raw).hexdigest() != manifest["sha256"]:
        raise ValueError("the joined bundle does not match the manifest")
    bundle_dir = bundle_dir or os.path.join(pieces_dir, "bundle")
    os.makedirs(bundle_dir, exist_ok=True)
    with open(os.path.join(pieces_dir, "bundle.tar.xz"), "wb") as f:
        f.write(raw)
    with tarfile.open(os.path.join(pieces_dir, "bundle.tar.xz")) as t:
        t.extractall(bundle_dir, filter="data")
    return bundle_dir


def inline_assets(src, root, bundle):
    f = os.path.join(root, "assets_map.json")
    if not os.path.exists(f):
        return src
    m = json.load(open(f))
    for key in sorted(m, key=len, reverse=True):
        ext = m[key].rsplit(".", 1)[-1].lower()
        data = base64.b64encode(open(os.path.join(bundle, m[key]), "rb").read()).decode()
        src = src.replace(key, f"data:{MIME.get(ext, 'image/' + ext)};base64,{data}")
    return src


def audit_html(root):
    idx = json.load(open(os.path.join(root, "project", "canvas.json")))
    links, css, body = [], "", ""
    for i, name in enumerate(idx["order"]):
        h = idx["boards"][name]["h"]
        html = open(os.path.join(root, "project", name)).read()
        for link in re.findall(r'<link rel="stylesheet" href="([^"]+)">', html):
            if link not in links:
                links.append(link)
        x = re.sub(r"<helmet>[\s\S]*?</helmet>", "", html.split("<x-dc>")[1].split("</x-dc>")[0], count=1)
        css += (f"@page b{i} {{ size: 1440px {h}px; margin: 0 }} .b{i} {{ page: b{i}; width: 1440px; "
                f"height: {h}px; overflow: hidden; break-after: page }}\n")
        body += f'<div class="b{i}">{x}</div>'
    return ('<!doctype html><html><head><meta charset="utf-8">'
            + "".join(f'<link rel="stylesheet" href="{l}">' for l in links)
            + f"\n<style>body{{margin:0}} a{{color:inherit}} {css}</style></head><body>{body}</body></html>")


def pdf_info(path):
    b = open(path, "rb").read().decode("latin1")
    return {"pages": len(re.findall(r"/Type\s*/Page[^s]", b)), "kb": round(os.path.getsize(path) / 1024),
            "links": sorted(set(re.findall(r"/URI\s*\(([^)]*)\)", b)))}


def _render(bundle, out):
    from playwright.sync_api import sync_playwright
    os.makedirs(out, exist_ok=True)
    jobs = {
        "audit": (inline_assets(audit_html(f"{bundle}/audit"), f"{bundle}/audit", bundle),
                  {"print_background": True, "prefer_css_page_size": True}),
        "deck": (inline_assets(open(f"{bundle}/deck/preview.html").read(), f"{bundle}/deck", bundle).replace(
                     "<style>", "<style>@page{size:1920px 1080px;margin:0}body{background:none!important}"
                     "section{margin:0!important;break-after:page}", 1),
                 {"width": "1920px", "height": "1080px", "print_background": True, "prefer_css_page_size": True}),
        "summary": (inline_assets(open(f"{bundle}/onepager.html").read(), bundle, bundle),
                    {"format": "Letter", "print_background": True,
                     "margin": {"top": "0", "bottom": "0", "left": "0", "right": "0"}}),
    }
    result = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for mode, (html, opts) in jobs.items():
            vp = {"width": 816, "height": 1056} if mode == "summary" else {"width": 1920, "height": 1080}
            page = browser.new_page(viewport=vp)
            page.set_content(html, wait_until="networkidle", timeout=90000)
            page.evaluate("document.fonts.ready")
            broken = page.evaluate("[...document.images].filter(i => !i.complete || i.naturalWidth === 0).length")
            path = os.path.join(out, f"{mode}.pdf")
            page.pdf(path=path, **opts)
            page.close()
            result[mode] = dict(pdf_info(path), path=path, broken_images=broken)
        browser.close()
    if result["summary"]["pages"] != 1:
        raise ValueError("the summary printed on more than one page")
    return result


def render_all(bundle, out):
    with ThreadPoolExecutor(1) as ex:
        return ex.submit(_render, bundle, out).result(timeout=170)
