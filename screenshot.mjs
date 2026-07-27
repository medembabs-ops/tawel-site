import puppeteer from 'puppeteer-core';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, 'temporary screenshots');

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

async function findChrome() {
  const { existsSync } = await import('node:fs');
  const found = CHROME_PATHS.find(existsSync);
  if (!found) {
    throw new Error('No local Chrome/Chromium install found. Update CHROME_PATHS in screenshot.mjs.');
  }
  return found;
}

async function nextIndex() {
  await mkdir(outDir, { recursive: true });
  const files = await readdir(outDir);
  const nums = files
    .map((f) => f.match(/^screenshot-(\d+)/))
    .filter(Boolean)
    .map((m) => parseInt(m[1], 10));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

async function main() {
  const [, , url, label] = process.argv;
  if (!url) {
    console.error('Usage: node screenshot.mjs <url> [label]');
    process.exit(1);
  }

  const executablePath = await findChrome();
  const n = await nextIndex();
  const filename = label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`;
  const outPath = path.join(outDir, filename);

  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Saved ${path.relative(root, outPath)}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
