#!/usr/bin/env node
/**
 * Playwright + in-page audits for Driftara Video UI (dev:web).
 * Output: reports/video-ui-review/
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'reports', 'video-ui-review');
const BASE = process.env.VIDEO_REVIEW_URL || 'http://localhost:5174/';

const VIEWPORTS = [
  { name: '01-desktop-1440x900', width: 1440, height: 900 },
  { name: '02-laptop-1280x800', width: 1280, height: 800 },
  { name: '03-tablet-1024x768', width: 1024, height: 768 },
  { name: '04-narrow-900x700', width: 900, height: 700 },
];

function relLuminance([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(fg, bg) {
  const l1 = relLuminance(fg);
  const l2 = relLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseRgb(str) {
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

async function collectLayoutMetrics(page) {
  return page.evaluate(() => {
    const sidebar = document.querySelector('aside.sidebar');
    const topBar = document.querySelector('.top-bar');
    const grid = document.querySelector('[class*="grid"]');
    const primary = document.querySelector('button.primary');
    const body = document.body;
    const csBody = getComputedStyle(body);
    const csRoot = getComputedStyle(document.documentElement);
    const cards = document.querySelectorAll('[class*="card"]');
    return {
      sidebarWidth: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
      topBarHeight: topBar ? Math.round(topBar.getBoundingClientRect().height) : null,
      mainWidth: grid?.parentElement
        ? Math.round(grid.parentElement.getBoundingClientRect().width)
        : null,
      bodyFontFamily: csBody.fontFamily,
      accentToken: csRoot.getPropertyValue('--color-accent').trim(),
      primaryBtnBg: primary ? getComputedStyle(primary).backgroundColor : null,
      cardCount: cards.length,
      hasBreadcrumbs: !!document.querySelector('.breadcrumbs-bar'),
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      dbFooterText: document.body.innerText.includes('SQLite Connected'),
      titleText: document.querySelector('.top-bar-title')?.textContent?.trim(),
    };
  });
}

async function collectContrastSamples(page) {
  return page.evaluate(() => {
    const samples = [];
    const activeRating = document.querySelector('[class*="ratingButtonActive"]');
    if (activeRating) {
      const cs = getComputedStyle(activeRating);
      samples.push({
        el: 'ratingButtonActive',
        color: cs.color,
        background: cs.backgroundColor,
        fontSize: cs.fontSize,
      });
    }
    const searchInput = document.querySelector('input[placeholder*="Titles"]');
    if (searchInput) {
      const cs = getComputedStyle(searchInput);
      samples.push({
        el: 'searchInput',
        color: cs.color,
        background: cs.backgroundColor,
        placeholder: searchInput.getAttribute('placeholder'),
      });
    }
    const clearBtn = [...document.querySelectorAll('button')].find((b) =>
      /clear/i.test(b.textContent || ''),
    );
    if (clearBtn) {
      const cs = getComputedStyle(clearBtn);
      samples.push({ el: 'clearFilters', color: cs.color, background: cs.backgroundColor });
    }
    return samples;
  });
}

async function collectA11y(page) {
  return page.evaluate(() => {
    const issues = [];
    for (const btn of document.querySelectorAll('button')) {
      const label = btn.getAttribute('aria-label') || btn.textContent?.trim();
      const iconOnly =
        !label && btn.querySelector('svg') && !btn.getAttribute('title');
      if (iconOnly) {
        issues.push({ kind: 'icon-button-no-label', tag: btn.className.slice(0, 60) });
      }
    }
    return {
      h1: document.querySelectorAll('h1').length,
      h2: document.querySelectorAll('h2').length,
      issues: issues.slice(0, 15),
    };
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = {
    url: BASE,
    capturedAt: new Date().toISOString(),
    viewports: [],
    consoleErrors: [],
    interactions: [],
    contrast: [],
    a11y: null,
  };

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));

    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForSelector('.app-container', { timeout: 15_000 });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: join(OUT, `${vp.name}.png`) });

    const metrics = await collectLayoutMetrics(page);
    const contrastSamples = await collectContrastSamples(page);
    const contrast = contrastSamples
      .map((s) => {
        const fg = parseRgb(s.color);
        const bg = parseRgb(s.background);
        if (!fg || !bg) return { ...s, ratio: null };
        return { ...s, ratio: Math.round(contrastRatio(fg, bg) * 100) / 100 };
      })
      .filter((c) => c.ratio != null);

    report.viewports.push({ name: vp.name, ...metrics, contrast, consoleErrors: [...errors] });
    report.consoleErrors.push(...errors.map((e) => ({ viewport: vp.name, message: e })));

    await page.close();
  }

  // Interaction pass at 1280
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: /Ingest/i }).click();
  await page.waitForSelector('.modal-panel', { timeout: 5000 });
  await page.screenshot({ path: join(OUT, '05-ingest-modal.png') });
  report.interactions.push({ action: 'ingest-modal', consoleErrors: [...errors] });

  await page.keyboard.press('Escape');
  const escapeClosed = await page
    .waitForSelector('.modal-panel', { state: 'detached', timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  report.interactions.push({ action: 'ingest-escape', closed: escapeClosed });
  if (!escapeClosed) {
    await page.locator('.modal-close').first().click();
    await page.waitForSelector('.modal-panel', { state: 'detached', timeout: 5000 }).catch(() => {});
  }

  const logsBtn = page.getByRole('button', { name: /Logs/i });
  await logsBtn.click();
  await page.waitForSelector('.modal-panel', { timeout: 5000 });
  await page.screenshot({ path: join(OUT, '06-ingest-logs-modal.png') });
  report.interactions.push({ action: 'logs-modal' });

  await page.keyboard.press('Escape');
  await page.waitForSelector('.modal-panel', { state: 'detached', timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);

  const card = page.locator('[role="button"][aria-label^="Open"]').first();
  if ((await card.count()) > 0) {
    await card.click();
    await page.waitForTimeout(500);
    const theaterVisible = await page.locator('[aria-label="Video player"]').count();
    report.interactions.push({ action: 'card-open', theaterVisible: theaterVisible > 0 });
    if (theaterVisible > 0) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      const theaterGone = (await page.locator('[aria-label="Video player"]').count()) === 0;
      report.interactions.push({ action: 'theater-escape', closed: theaterGone });
    }
  }

  const selectsNamed = await page.evaluate(() => {
    const selects = [...document.querySelectorAll('select')];
    return selects.map((s) => ({
      id: s.id,
      hasLabel: !!(s.labels && s.labels.length) || !!s.getAttribute('aria-label'),
    }));
  });
  report.interactions.push({ action: 'select-names', selects: selectsNamed });

  const folderRows = page.locator('[class*="row"]').filter({ hasText: /2026|Videos|ActionCam/i });
  if ((await folderRows.count()) > 0) {
    await folderRows.first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(OUT, '07-folder-selected.png') });
    report.interactions.push({ action: 'folder-select', breadcrumbs: true });
  }

  report.a11y = await collectA11y(page);
  report.contrast = await collectContrastSamples(page).then((samples) =>
    samples
      .map((s) => {
        const fg = parseRgb(s.color);
        const bg = parseRgb(s.background);
        if (!fg || !bg) return { ...s, ratio: null };
        return { ...s, ratio: Math.round(contrastRatio(fg, bg) * 100) / 100 };
      })
      .filter((c) => c.ratio != null),
  );

  await browser.close();

  writeFileSync(join(OUT, 'review-data.json'), JSON.stringify(report, null, 2));
  console.log(`UI review artifacts: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
