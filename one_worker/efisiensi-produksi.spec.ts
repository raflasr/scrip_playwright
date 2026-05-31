import { test, expect, Page, Locator } from '@playwright/test';

// ======================================================
// PERFORMANCE THRESHOLD
// ======================================================

// manipulasi sederhana
const SIMPLE_THRESHOLD = 2000;

// manipulasi kompleks / rerender
const COMPLEX_THRESHOLD = 5000;

// posisi object awal
const OBJ = { x: 450, y: 320 };

// ======================================================
// HELPERS
// ======================================================

/**
 * Membuka panel element dan memastikan grid visible.
 */
async function openElementPanel(page: Page) {

  const elementButton = page.getByRole('button', {
    name: /element/i
  });

  await expect(elementButton).toBeVisible({
    timeout: 10_000,
  });

  await elementButton.click({
    force: true,
  });

  await page.waitForTimeout(1_500);

  const grid = page.locator('.grid');

  // retry sekali jika belum muncul
  if (!(await grid.isVisible().catch(() => false))) {

    await elementButton.click({
      force: true,
    });

    await page.waitForTimeout(1_500);
  }

  await expect(grid).toBeVisible({
    timeout: 10_000,
  });
}

/**
 * Setup awal:
 * 1. buka deployment
 * 2. create project
 * 3. buka panel element
 * 4. tambahkan shape
 * 5. letakkan shape di canvas
 */
async function setup(page: Page): Promise<Locator> {

  // otomatis menggunakan baseURL dari playwright.config.ts
  await page.goto('/');

  await page.waitForLoadState('networkidle');

  // create project
  const createButton = page.getByRole('button', {
    name: /create/i,
  });

  await expect(createButton).toBeVisible({
    timeout: 15_000,
  });

  await createButton.click();

  await page.waitForTimeout(2_000);

  // buka panel element
  await openElementPanel(page);

  // pilih shape pertama
  const shape = page.locator('.grid button').first();

  await expect(shape).toBeVisible({
    timeout: 10_000,
  });

  await shape.click();

  await page.waitForTimeout(1_500);

  // ambil canvas
  const canvas = page.locator('canvas').nth(1);

  await expect(canvas).toBeVisible({
    timeout: 10_000,
  });

  // tambahkan object ke canvas
  await canvas.click({
    position: OBJ,
  });

  await page.waitForTimeout(1_000);

  return canvas;
}

/**
 * Drag di dalam canvas.
 */
async function dragInCanvas(
  page: Page,
  canvas: Locator,
  from: { x: number; y: number },
  to: { x: number; y: number }
) {

  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error('Canvas boundingBox null');
  }

  const absFrom = {
    x: box.x + from.x,
    y: box.y + from.y,
  };

  const absTo = {
    x: box.x + to.x,
    y: box.y + to.y,
  };

  await page.mouse.move(
    absFrom.x,
    absFrom.y
  );

  await page.mouse.down();

  // drag bertahap supaya stabil
  const steps = 10;

  for (let i = 1; i <= steps; i++) {

    await page.mouse.move(
      absFrom.x + ((absTo.x - absFrom.x) * i) / steps,
      absFrom.y + ((absTo.y - absFrom.y) * i) / steps,
      {
        steps: 1,
      }
    );
  }

  await page.mouse.up();

  await page.waitForTimeout(300);
}

/**
 * Assertion performa.
 */
function assertPerformance(
  duration: number,
  threshold: number,
  testName: string
) {

  console.log(`[${testName}] duration: ${duration} ms`);

  expect(duration).toBeLessThan(
    threshold
  );
}

// ======================================================
// EF.T1 — MOVE OBJECT
// ======================================================

test('EF.T1 — Move object berjalan lancar', async ({ page }) => {

  const canvas = await setup(page);

  const start = Date.now();

  await dragInCanvas(
    page,
    canvas,
    OBJ,
    { x: 700, y: 450 }
  );

  const duration = Date.now() - start;

  assertPerformance(
    duration,
    SIMPLE_THRESHOLD,
    'EF.T1'
  );

  // validasi canvas masih aktif
  await expect(canvas).toBeVisible();

  // validasi canvas masih bisa diinteraksi
  await canvas.click({
    position: { x: 600, y: 400 }
  });
});

// ======================================================
// EF.T2 — RESIZE OBJECT
// ======================================================

test('EF.T2 — Resize object berjalan lancar', async ({ page }) => {

  const canvas = await setup(page);

  const start = Date.now();

  await dragInCanvas(
    page,
    canvas,
    { x: 520, y: 370 },
    { x: 750, y: 550 }
  );

  const duration = Date.now() - start;

  assertPerformance(
    duration,
    SIMPLE_THRESHOLD,
    'EF.T2'
  );

  await expect(canvas).toBeVisible();

  await canvas.click({
    position: { x: 500, y: 350 }
  });
});

// ======================================================
// EF.T3 — ROTATE OBJECT
// ======================================================

test('EF.T3 — Rotate object berjalan lancar', async ({ page }) => {

  const canvas = await setup(page);

  const start = Date.now();

  await dragInCanvas(
    page,
    canvas,
    { x: 450, y: 230 },
    { x: 620, y: 150 }
  );

  const duration = Date.now() - start;

  assertPerformance(
    duration,
    SIMPLE_THRESHOLD,
    'EF.T3'
  );

  await expect(canvas).toBeVisible();

  await canvas.click({
    position: { x: 450, y: 320 }
  });
});

// ======================================================
// EF.T4 — MULTIPLE MANIPULATION
// ======================================================

test('EF.T4 — Multiple manipulation tetap responsif', async ({ page }) => {

  const canvas = await setup(page);

  const start = Date.now();

  // move
  await dragInCanvas(
    page,
    canvas,
    OBJ,
    { x: 700, y: 450 }
  );

  // resize
  await dragInCanvas(
    page,
    canvas,
    { x: 520, y: 370 },
    { x: 760, y: 540 }
  );

  // rotate
  await dragInCanvas(
    page,
    canvas,
    { x: 450, y: 230 },
    { x: 620, y: 150 }
  );

  const duration = Date.now() - start;

  assertPerformance(
    duration,
    COMPLEX_THRESHOLD,
    'EF.T4'
  );

  await expect(canvas).toBeVisible();

  // validasi canvas tetap responsif
  await canvas.click({
    position: { x: 500, y: 400 }
  });
});

// ======================================================
// EF.T5 — RESPONSIVE AFTER MULTIPLE ACTION
// ======================================================

test('EF.T5 — Canvas tetap responsif setelah manipulasi', async ({ page }) => {

  const canvas = await setup(page);

  await dragInCanvas(
    page,
    canvas,
    OBJ,
    { x: 650, y: 420 }
  );

  await dragInCanvas(
    page,
    canvas,
    { x: 520, y: 370 },
    { x: 760, y: 540 }
  );

  await dragInCanvas(
    page,
    canvas,
    { x: 450, y: 230 },
    { x: 620, y: 150 }
  );

  // tunggu render selesai dulu
  await page.waitForTimeout(1000);

  // pastikan canvas masih visible
  await expect(canvas).toBeVisible({
    timeout: 10_000,
  });

  const start = Date.now();

  // validasi canvas masih responsif
  await canvas.click({
    position: { x: 400, y: 300 },
    force: true,
  });

  await page.waitForTimeout(500);

  const duration = Date.now() - start;

  assertPerformance(
    duration,
    SIMPLE_THRESHOLD,
    'EF.T5'
  );

  await expect(canvas).toBeVisible();
});

// ======================================================
// EF.T6 — ADD OBJECT
// ======================================================

test('EF.T6 — Add object tetap responsif', async ({ page }) => {

  const canvas = await setup(page);

  const start = Date.now();

  // buka panel element lagi
  await openElementPanel(page);

  const shape = page.locator('.grid button').first();

  // tunggu shape siap
  await expect(shape).toBeVisible({
    timeout: 15_000,
  });

  await expect(shape).toBeEnabled({
    timeout: 15_000,
  });

  await shape.scrollIntoViewIfNeeded();

  await shape.click({
    force: true,
    timeout: 15_000,
  });

  // delay diperkecil
  await page.waitForTimeout(500);

  // tambahkan object kedua
  await canvas.click({
    position: { x: 250, y: 250 },
    force: true,
  });

  // delay diperkecil
  await page.waitForTimeout(300);

  const duration = Date.now() - start;

  assertPerformance(
    duration,
    COMPLEX_THRESHOLD,
    'EF.T6'
  );

  await expect(canvas).toBeVisible();
});

// ======================================================
// EF.T7 — SWITCHING OBJECT
// ======================================================

test('EF.T7 — Switching object tetap lancar', async ({ page }) => {

  const canvas = await setup(page);

  // tambah object kedua
  await openElementPanel(page);

  const shape = page.locator('.grid button').first();

  await expect(shape).toBeVisible({
    timeout: 10_000,
  });

  await shape.click();

  await page.waitForTimeout(1_500);

  // letakkan object kedua
  await canvas.click({
    position: { x: 200, y: 200 }
  });

  await page.waitForTimeout(800);

  const start = Date.now();

  // klik object pertama
  await canvas.click({
    position: OBJ
  });

  await page.waitForTimeout(500);

  // klik object kedua
  await canvas.click({
    position: { x: 200, y: 200 }
  });

  await page.waitForTimeout(500);

  const duration = Date.now() - start;

  assertPerformance(
    duration,
    SIMPLE_THRESHOLD,
    'EF.T7'
  );

  await expect(canvas).toBeVisible();
});
