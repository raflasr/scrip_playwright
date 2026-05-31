import { test, expect, Page } from '@playwright/test';

// ======================================================
// CONSTANTS
// ======================================================

const BASE_URL = 'https://hakuhodo-dev.devnstg.com/';

const OBJ1 = { x: 450, y: 320 };

const DIFF_THRESHOLD = 0.02;

// ======================================================
// PERFORMANCE THRESHOLD
// ======================================================

const SIMPLE_THRESHOLD = 25000;

const COMPLEX_THRESHOLD = 15000;

// ======================================================
// PERFORMANCE ASSERTION
// ======================================================

function assertPerformance(
  duration: number,
  threshold: number,
  testName: string
) {
  console.log(
    `[${testName}] duration: ${duration} ms`
  );

  expect(duration)
    .toBeLessThan(threshold);
}

// ======================================================
// HELPERS
// ======================================================

async function openElementPanel(page: Page) {
  const elementButton = page.getByRole('button', {
    name: /element/i
  });

  await expect(elementButton).toBeVisible({
    timeout: 10000
  });

  await elementButton.click({ force: true });

  await page.waitForTimeout(1500);

  const grid = page.locator('.grid');

  if (!(await grid.isVisible().catch(() => false))) {
    await elementButton.click({ force: true });

    await page.waitForTimeout(1500);
  }

  await expect(grid).toBeVisible({
    timeout: 10000
  });
}

// ======================================================
// LOCK BUTTON
// ======================================================

async function getLockButton(page: Page) {
  const toolbarButtons = page.locator(
    '.flex.h-7.w-7.items-center.justify-center.rounded'
  );

  // berdasarkan hasil debug:
  // index 4 = tombol lock
  return toolbarButtons.nth(4);
}

async function dragInCanvas(
  page: Page,
  canvas: ReturnType<Page['locator']>,
  from: { x: number; y: number },
  to: { x: number; y: number }
) {
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error('Canvas boundingBox null');
  }

  const absFrom = {
    x: box.x + from.x,
    y: box.y + from.y
  };

  const absTo = {
    x: box.x + to.x,
    y: box.y + to.y
  };

  await page.mouse.move(absFrom.x, absFrom.y);

  await page.waitForTimeout(200);

  await page.mouse.down();

  const steps = 20;

  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      absFrom.x + ((absTo.x - absFrom.x) * i) / steps,
      absFrom.y + ((absTo.y - absFrom.y) * i) / steps,
      { steps: 1 }
    );
  }

  await page.mouse.up();

  await page.waitForTimeout(1000);
}

async function getCanvasSnapshot(
  page: Page,
  canvas: ReturnType<Page['locator']>
): Promise<Buffer> {
  await page.mouse.move(0, 0);

  await page.waitForTimeout(300);

  await canvas.waitFor({
    state: 'visible'
  });

  return canvas.screenshot();
}

function diffRatio(a: Buffer, b: Buffer): number {
  if (Math.abs(a.length - b.length) > a.length * 0.05) {
    return 1.0;
  }

  const len = Math.min(a.length, b.length);

  let diffBytes = 0;

  const tolerance = 5;

  for (let i = 0; i < len; i++) {
    if (Math.abs(a[i] - b[i]) > tolerance) {
      diffBytes++;
    }
  }

  return diffBytes / len;
}

function screenshotsAreEqual(
  a: Buffer,
  b: Buffer,
  threshold = DIFF_THRESHOLD
): boolean {
  return diffRatio(a, b) <= threshold;
}

function screenshotsAreDifferent(
  a: Buffer,
  b: Buffer,
  threshold = DIFF_THRESHOLD
): boolean {
  return diffRatio(a, b) > threshold;
}

async function deselectAll(
  page: Page,
  canvas: ReturnType<Page['locator']>
) {
  const box = await canvas.boundingBox();

  if (box) {
    await page.mouse.click(
      box.x + box.width - 40,
      box.y + 40
    );
  }

  await page.waitForTimeout(500);
}

async function setup(page: Page) {
  await page.goto(BASE_URL);

  await page.waitForLoadState('networkidle');

  await page.getByRole('button', {
    name: /create/i
  }).click();

  await page.waitForTimeout(2000);

  await openElementPanel(page);

  const shape = page.locator('.grid button').first();

  await expect(shape).toBeVisible({
    timeout: 10000
  });

  await shape.click();

  await page.waitForTimeout(1500);

  const canvas = page.locator('canvas').nth(1);

  await expect(canvas).toBeVisible({
    timeout: 10000
  });

  await canvas.click({
    position: OBJ1,
    force: true
  });

  await page.waitForTimeout(1000);

  await canvas.click({
    position: OBJ1,
    force: true
  });

  await page.waitForTimeout(1000);

  return canvas;
}

async function selectAndLock(
  page: Page,
  canvas: ReturnType<Page['locator']>
) {

  let success = false;

  for (let i = 0; i < 8; i++) {

    await page.keyboard.press('Escape');

    await page.waitForTimeout(500);

    // double click supaya object benar-benar selected
    await canvas.click({
      position: OBJ1,
      force: true
    });

    await page.waitForTimeout(500);

    await canvas.dblclick({
      position: OBJ1,
      force: true
    });

    await page.waitForTimeout(1500);

    const lockBtn = await getLockButton(page);

    const visible =
      await lockBtn.isVisible()
        .catch(() => false);

    if (visible) {

      await lockBtn.click({
        force: true
      });

      await page.waitForTimeout(1500);

      success = true;
      break;
    }

    await page.waitForTimeout(1000);
  }

  expect(success).toBe(true);
}

async function unlockObject(
  page: Page,
  canvas: ReturnType<Page['locator']>,
  pos: { x: number; y: number }
) {
  await canvas.click({
    position: pos,
    force: true
  });

  await page.waitForTimeout(1200);

  const lockBtn = await getLockButton(page);

  await lockBtn.waitFor({
    state: 'visible',
    timeout: 10000
  });

  await lockBtn.click({
    force: true
  });

  await page.waitForTimeout(1500);
}

// ======================================================
// BG.T1
// ======================================================

test('BG.T1 — Element dapat dikunci', async ({ page }) => {

  const start = Date.now();

  const canvas = await setup(page);

  await selectAndLock(page, canvas);

  const duration = Date.now() - start;

  assertPerformance(
    duration,
    SIMPLE_THRESHOLD,
    'BG.T1'
  );

  await expect(canvas).toBeVisible();
});

// ======================================================
// BG.T2
// ======================================================

test('BG.T2 — Shape lock tidak bisa dipindahkan', async ({ page }) => {

  const canvas = await setup(page);

  await selectAndLock(page, canvas);

  const start = Date.now();

  await deselectAll(page, canvas);

  const before = await getCanvasSnapshot(page, canvas);

  await dragInCanvas(
    page,
    canvas,
    OBJ1,
    { x: 700, y: 450 }
  );

  await deselectAll(page, canvas);

  await page.waitForTimeout(1500);

  const after = await getCanvasSnapshot(page, canvas);

  const duration = Date.now() - start;

  assertPerformance(
    duration,
    SIMPLE_THRESHOLD,
    'BG.T2'
  );

  expect(
    screenshotsAreEqual(before, after)
  ).toBe(true);
});

// ======================================================
// BG.T3
// ======================================================

test('BG.T3 — Shape lock tidak bisa diresize', async ({ page }) => {

  const canvas = await setup(page);

  await selectAndLock(page, canvas);

  const start = Date.now();

  await deselectAll(page, canvas);

  const before = await getCanvasSnapshot(page, canvas);

  await dragInCanvas(
    page,
    canvas,
    { x: 520, y: 370 },
    { x: 760, y: 560 }
  );

  await deselectAll(page, canvas);

  await page.waitForTimeout(1500);

  const after = await getCanvasSnapshot(page, canvas);

  const duration = Date.now() - start;

  assertPerformance(
    duration,
    SIMPLE_THRESHOLD,
    'BG.T3'
  );

  expect(
    screenshotsAreEqual(before, after)
  ).toBe(true);
});

// ======================================================
// BG.T4
// ======================================================

test('BG.T4 — Shape lock tidak bisa dirotate', async ({ page }) => {

  const canvas = await setup(page);

  await selectAndLock(page, canvas);

  const start = Date.now();

  await deselectAll(page, canvas);

  const before = await getCanvasSnapshot(page, canvas);

  await dragInCanvas(
    page,
    canvas,
    { x: 450, y: 230 },
    { x: 650, y: 120 }
  );

  await deselectAll(page, canvas);

  await page.waitForTimeout(1500);

  const after = await getCanvasSnapshot(page, canvas);

  const duration = Date.now() - start;

  assertPerformance(
    duration,
    SIMPLE_THRESHOLD,
    'BG.T4'
  );

  expect(
    screenshotsAreEqual(before, after)
  ).toBe(true);
});

// ======================================================
// BG.T5
// ======================================================

test('BG.T5 — Unlock mengembalikan akses edit', async ({ page }) => {

  const canvas = await setup(page);

  await selectAndLock(page, canvas);

  const start = Date.now();

  await unlockObject(page, canvas, OBJ1);

  await deselectAll(page, canvas);

  const before = await getCanvasSnapshot(page, canvas);

  await canvas.click({
    position: OBJ1,
    force: true
  });

  await page.waitForTimeout(1000);

  await dragInCanvas(
    page,
    canvas,
    OBJ1,
    { x: 700, y: 450 }
  );

  await deselectAll(page, canvas);

  const after = await getCanvasSnapshot(page, canvas);

  const duration = Date.now() - start;

  assertPerformance(
    duration,
    COMPLEX_THRESHOLD,
    'BG.T5'
  );

  expect(
    screenshotsAreDifferent(before, after)
  ).toBe(true);
});

// ======================================================
// BG.T6
// ======================================================

test('BG.T6 — Status lock tetap konsisten setelah reload', async ({ page }) => {

  const canvas = await setup(page);

  await selectAndLock(page, canvas);

  await deselectAll(page, canvas);

  await page.waitForTimeout(1500);

  const start = Date.now();

  const urlBeforeReload = page.url();

  await page.reload();

  await page.waitForLoadState('networkidle');

  await page.waitForTimeout(2000);

  expect(page.url()).toBe(urlBeforeReload);

  const canvasAfter = page.locator('canvas').nth(1);

  await expect(canvasAfter).toBeVisible({
    timeout: 10000
  });

  await deselectAll(page, canvasAfter);

  const before = await getCanvasSnapshot(
    page,
    canvasAfter
  );

  await dragInCanvas(
    page,
    canvasAfter,
    OBJ1,
    { x: 700, y: 450 }
  );

  await deselectAll(page, canvasAfter);

  const after = await getCanvasSnapshot(
    page,
    canvasAfter
  );

  const duration = Date.now() - start;

  assertPerformance(
    duration,
    COMPLEX_THRESHOLD,
    'BG.T6'
  );

  expect(
    screenshotsAreEqual(before, after)
  ).toBe(true);
});
