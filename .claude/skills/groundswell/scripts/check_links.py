"""Fail unless every link in the given PDFs is a Google Drive link.

Usage: python3 -I check_links.py <file.pdf> [...]

Checks the PDF's link annotations (Chromium writes them uncompressed) and, when pdftotext is installed,
the visible text: a claude.ai address anywhere is an error, and any other printed web address that is not
on drive.google.com is reported as a warning. Exit 1 on any error.
"""
import re
import shutil
import subprocess
import sys

DRIVE = "https://drive.google.com/"


def main():
    errors = 0
    for f in sys.argv[1:]:
        raw = open(f, "rb").read().decode("latin1")
        links = sorted(set(re.findall(r"/URI\s*\(([^)]*)\)", raw)))
        bad = [u for u in links if not u.startswith(DRIVE)]
        text = ""
        if shutil.which("pdftotext"):
            text = subprocess.run(["pdftotext", "-layout", f, "-"], capture_output=True, text=True).stdout
        printed = set(re.findall(r"https?://[^\s<>()\"']+", text))
        claude = sorted({m for m in re.findall(r"\S*claude\.ai\S*", text)})
        warn = sorted(u for u in printed if not u.startswith(DRIVE))
        status = "FAIL" if bad or claude else "ok"
        print(f"{status:4} {f}: {len(links)} link(s){'' if text else ' (pdftotext missing: text not checked)'}")
        for u in bad:
            print(f"     non-Drive link: {u}")
        for u in claude:
            print(f"     claude.ai text: {u}")
        for u in warn:
            print(f"     warning, printed non-Drive address: {u}")
        errors += bool(bad or claude)
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
