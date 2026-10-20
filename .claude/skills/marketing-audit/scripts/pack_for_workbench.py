"""Pack an audit's built sources so Composio's workbench can print the PDFs there.

Usage: python3 -I pack_for_workbench.py <audit_dir> <deck_dir> <onepager.html> <out_dir>

The PDFs have to be uploaded from Composio's sandbox, and the only way in is text in a tool call. The
sources (HTML plus images) compress to a small fraction of the PDFs, so they go across instead and
workbench_render.py prints them there with the same settings as render_pdf.cjs.

Writes <out_dir>/bundle.tar.xz, <out_dir>/piece_NN (base64, at most PIECE characters each) and
<out_dir>/manifest.json with each piece's sha256 prefix and the whole archive's sha256. Images come from
the assets_map.json next to the audit, the deck and the onepager; the bundle's own maps point at img/<name>.
"""
import base64
import hashlib
import io
import json
import os
import sys
import tarfile

PIECE = 30000


def add_bytes(tar, name, data):
    info = tarfile.TarInfo(name)
    info.size = len(data)
    info.mtime = 0
    tar.addfile(info, io.BytesIO(data))


def bundle_map(root, images):
    f = os.path.join(root, "assets_map.json")
    if not os.path.exists(f):
        return {}
    out = {}
    for key, src in json.load(open(f)).items():
        name = os.path.basename(src)
        if images.setdefault(name, src) != src:
            sys.exit(f"two different images are both named {name}; rename one")
        out[key] = "img/" + name
    return out


def main():
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    audit, deck, onepager, out = sys.argv[1:]
    os.makedirs(out, exist_ok=True)
    images = {}
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:xz") as tar:
        project = os.path.join(audit, "project")
        for name in sorted(os.listdir(project)):
            add_bytes(tar, f"audit/project/{name}", open(os.path.join(project, name), "rb").read())
        add_bytes(tar, "audit/assets_map.json", json.dumps(bundle_map(audit, images)).encode())
        add_bytes(tar, "deck/preview.html", open(os.path.join(deck, "preview.html"), "rb").read())
        add_bytes(tar, "deck/assets_map.json", json.dumps(bundle_map(deck, images)).encode())
        add_bytes(tar, "onepager.html", open(onepager, "rb").read())
        # render_pdf.cjs inlines the summary's images from the map in the onepager's own folder.
        add_bytes(tar, "assets_map.json", json.dumps(bundle_map(os.path.dirname(os.path.abspath(onepager)), images)).encode())
        for name, src in sorted(images.items()):
            add_bytes(tar, "img/" + name, open(src, "rb").read())
    raw = buf.getvalue()
    open(os.path.join(out, "bundle.tar.xz"), "wb").write(raw)
    text = base64.b64encode(raw).decode()
    pieces = []
    for i in range(0, len(text), PIECE):
        p = text[i:i + PIECE]
        name = f"piece_{len(pieces):02d}"
        open(os.path.join(out, name), "w").write(p)
        pieces.append({"name": name, "chars": len(p), "sha16": hashlib.sha256(p.encode()).hexdigest()[:16]})
    manifest = {"sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw), "pieces": pieces}
    json.dump(manifest, open(os.path.join(out, "manifest.json"), "w"), indent=1)
    print(f"{len(raw)} bytes, {len(pieces)} piece(s), sha256 {manifest['sha256']}")


if __name__ == "__main__":
    main()
