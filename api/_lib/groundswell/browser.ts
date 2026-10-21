import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Browser } from 'puppeteer-core';

/**
 * Headless Chromium for Groundswell (Maps Current and PDF printing).
 * On Vercel it is @sparticuz/chromium; elsewhere CHROMIUM_PATH (e.g. the
 * container's /opt/pw-browsers/chromium) so the same code runs in tests.
 * Each launch gets its own profile directory, removed on close, so warm
 * function instances do not fill /tmp.
 */

export async function withBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  const puppeteer = (await import('puppeteer-core')).default;
  const profile = await mkdtemp(path.join(tmpdir(), 'groundswell-'));
  let executablePath = process.env.CHROMIUM_PATH;
  let args = ['--no-sandbox', '--disable-dev-shm-usage', '--lang=en-US'];
  if (!executablePath) {
    const chromium = (await import('@sparticuz/chromium')).default;
    executablePath = await chromium.executablePath();
    args = [...chromium.args, '--lang=en-US'];
  }
  const browser = await puppeteer.launch({
    executablePath,
    args: [...args, `--user-data-dir=${profile}`],
    headless: true,
  });
  try {
    return await fn(browser);
  } finally {
    await browser.close().catch(() => {});
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}
