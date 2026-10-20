// Shared Chromium launcher for the marketing-audit scripts.
// Uses playwright-core from this folder (npm ci --prefix .claude/skills/marketing-audit/scripts)
// and the container's Chromium (CHROMIUM_PATH, default /opt/pw-browsers/chromium). Routes through
// HTTPS_PROXY when it is set, so Google Fonts load the same way they do for a visitor.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

async function launch() {
  const opts = { executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', headless: true };
  const proxy = process.env.HTTPS_PROXY;
  if (proxy) {
    const u = new URL(proxy);
    opts.proxy = { server: `${u.protocol}//${u.host}`, username: decodeURIComponent(u.username || ''), password: decodeURIComponent(u.password || '') };
  }
  return chromium.launch(opts);
}

const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml', gif: 'image/gif' };

// Replace each image reference listed in <root>/assets_map.json ({"asset:logo.png": "/abs/brand/logo.png"})
// with a data: URI, so the rendered page and the PDF carry the image without any link.
function inlineAssets(src, root) {
  const f = path.join(root, 'assets_map.json');
  if (!fs.existsSync(f)) return src;
  const map = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const key of Object.keys(map).sort((a, b) => b.length - a.length)) {
    const ext = map[key].split('.').pop().toLowerCase();
    src = src.split(key).join(`data:${MIME[ext] || 'image/' + ext};base64,` + fs.readFileSync(map[key]).toString('base64'));
  }
  return src;
}

// Page count, size and link targets of a PDF Chromium wrote (its link annotations are uncompressed).
function pdfInfo(file) {
  const buf = fs.readFileSync(file).toString('latin1');
  return {
    pages: (buf.match(/\/Type\s*\/Page[^s]/g) || []).length,
    kb: Math.round(fs.statSync(file).size / 1024),
    links: [...new Set([...buf.matchAll(/\/URI\s*\(([^)]*)\)/g)].map((m) => m[1]))],
  };
}

module.exports = { launch, inlineAssets, pdfInfo };
