import {
  test,
  expect,
  Page,
  Locator
} from '@playwright/test';

import path from 'path';
import fs from 'fs';

// ======================================================
// SCALABILITY TESTING
// HEAVY WORKLOAD VERSION
// 70 OBJECTS
// ======================================================

test.setTimeout(300000);

// ======================================================
// CONSTANTS
// ======================================================

const BASE_URL =
  'https://hakuhodo-dev.devnstg.com/';

// threshold performa
const SIMPLE_THRESHOLD = 20000;

const COMPLEX_THRESHOLD = 90000;

// total object
const TOTAL_OBJECTS = 70;

// ======================================================
// HELPERS
// ======================================================

async function getCanvas(page: Page) {

  return page.locator('canvas').last();
}

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
// OPEN ELEMENT PANEL
// ======================================================

async function openElementPanel(page: Page) {

  const elementButton =
    page.getByRole('button', {
      name: /element/i
    });

  await expect(elementButton)
    .toBeVisible({
      timeout: 15000,
    });

  await elementButton.click({
    force: true,
  });

  await page.waitForTimeout(800);

  const grid = page.locator('.grid');

  // retry sekali
  if (!(await grid.isVisible()
    .catch(() => false))) {

    await elementButton.click({
      force: true,
    });

    await page.waitForTimeout(800);
  }

  await expect(grid)
    .toBeVisible({
      timeout: 15000,
    });
}

// ======================================================
// EXPORT HELPER
// ======================================================

async function doExportAndSave(page: Page) {

  await page.getByRole('button', {
    name: /export/i,
  }).click();

  await page.waitForTimeout(1000);

  const exportPNG =
    page.getByText(/export to png/i);

  await expect(exportPNG)
    .toBeVisible({
      timeout: 15000,
    });

  const [download] =
    await Promise.all([

    page.waitForEvent('download', {
      timeout: 60000,
    }),

    exportPNG.click(),

  ]);

  if (!fs.existsSync('test-results')) {

    fs.mkdirSync('test-results', {
      recursive: true,
    });
  }

  const filePath = path.join(
    'test-results',
    download.suggestedFilename()
  );

  await download.saveAs(filePath);

  // tunggu render/export selesai
  await page.waitForTimeout(2500);

  return filePath;
}

// ======================================================
// SETUP
// ======================================================

async function setup(
  page: Page
): Promise<Locator> {

  await page.goto(BASE_URL);

  await page.waitForLoadState(
    'networkidle'
  );

  // create project
  const createBtn =
    page.getByRole('button', {
      name: /create/i,
    });

  await expect(createBtn)
    .toBeVisible({
      timeout: 20000,
    });

  await createBtn.click();

  await page.waitForTimeout(3000);

  // buka panel element
  await openElementPanel(page);

  // pilih shape
  const shapeButton =
    page.locator('.grid button')
      .first();

  await expect(shapeButton)
    .toBeVisible({
      timeout: 15000,
    });

  await shapeButton.click({
    force: true,
  });

  await page.waitForTimeout(500);

  const canvas =
    await getCanvas(page);

  await expect(canvas)
    .toBeVisible({
      timeout: 15000,
    });

  return canvas;
}

// ======================================================
// ADD OBJECT
// ======================================================

async function addObject(
  page: Page,
  canvas: Locator,
  x: number,
  y: number
) {

  const shape =
    page.locator('.grid button')
      .first();

  await expect(shape)
    .toBeVisible({
      timeout: 15000,
    });

  await shape.click({
    force: true,
  });

  await page.waitForTimeout(100);

  await canvas.click({
    position: { x, y },
    force: true,
  });

  // delay kecil biar render stabil
  await page.waitForTimeout(80);
}

// ======================================================
// GENERATE MANY OBJECTS
// ======================================================

async function generateObjects(
  page: Page,
  canvas: Locator,
  total: number
) {

  for (let i = 0; i < total; i++) {

    const col = i % 10;
    const row = Math.floor(i / 10);

    const x =
      80 + (col * 75);

    const y =
      80 + (row * 70);

    await addObject(
      page,
      canvas,
      x,
      y
    );
  }
}

// ======================================================
// SC.T1
// MANY OBJECTS
// ======================================================

test(
  'SC.T1 — Canvas tetap stabil dengan 70 object',
  async ({ page }) => {

  const canvas =
    await setup(page);

  const start = Date.now();

  await generateObjects(
    page,
    canvas,
    TOTAL_OBJECTS
  );

  const duration =
    Date.now() - start;

  assertPerformance(
    duration,
    COMPLEX_THRESHOLD,
    'SC.T1'
  );

  await expect(canvas)
    .toBeVisible();
});

// ======================================================
// SC.T2
// REPEATED EXPORT
// ======================================================

test(
  'SC.T2 — Export berulang tetap stabil',
  async ({ page }) => {

  const canvas =
    await setup(page);

  await generateObjects(
    page,
    canvas,
    TOTAL_OBJECTS
  );

  const start = Date.now();

  for (let i = 0; i < 5; i++) {

    const filePath =
      await doExportAndSave(page);

    expect(
      fs.existsSync(filePath)
    ).toBeTruthy();
  }

  const duration =
    Date.now() - start;

  assertPerformance(
    duration,
    COMPLEX_THRESHOLD,
    'SC.T2'
  );
});

// ======================================================
// SC.T3
// COMPLEX TEMPLATE EXPORT
// ======================================================

test(
  'SC.T3 — Template kompleks 70 object tetap dapat diexport',
  async ({ page }) => {

  const canvas =
    await setup(page);

  await generateObjects(
    page,
    canvas,
    TOTAL_OBJECTS
  );

  const start = Date.now();

  const filePath =
    await doExportAndSave(page);

  const duration =
    Date.now() - start;

  assertPerformance(
    duration,
    COMPLEX_THRESHOLD,
    'SC.T3'
  );

  expect(
    fs.existsSync(filePath)
  ).toBeTruthy();

  const stats =
    fs.statSync(filePath);

  expect(stats.size)
    .toBeGreaterThan(1000);
});

// ======================================================
// SC.T4
// MASS ASSET GENERATION
// ======================================================

test(
  'SC.T4 — Multiple asset generation 70 object tetap responsif',
  async ({ page }) => {

  const canvas =
    await setup(page);

  const start = Date.now();

  await generateObjects(
    page,
    canvas,
    TOTAL_OBJECTS
  );

  const filePath =
    await doExportAndSave(page);

  const duration =
    Date.now() - start;

  assertPerformance(
    duration,
    COMPLEX_THRESHOLD,
    'SC.T4'
  );

  expect(
    fs.existsSync(filePath)
  ).toBeTruthy();
});

// ======================================================
// SC.T5
// VISUAL STABILITY
// ======================================================

test(
  'SC.T5 — Visual canvas tetap stabil setelah workload 70 object',
  async ({ page }) => {

  const canvas =
    await setup(page);

  await generateObjects(
    page,
    canvas,
    TOTAL_OBJECTS
  );

  const start = Date.now();

  await expect(canvas)
    .toHaveScreenshot(
      'scalability-visual-stability-70.png',
      {
        maxDiffPixelRatio: 0.08,
        animations: 'disabled',
      }
    );

  const duration =
    Date.now() - start;

  assertPerformance(
    duration,
    SIMPLE_THRESHOLD,
    'SC.T5'
  );
});
