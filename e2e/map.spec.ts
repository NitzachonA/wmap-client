import { test, expect } from '@playwright/test';

test('map initialization and basic functionality', async ({ page }) => {
  await page.goto('/');
  
  // Check if map container exists
  const mapContainer = await page.locator('.map-container');
  await expect(mapContainer).toBeVisible();

  // Wait for ArcGIS view to be ready (look for canvas)
  const mapCanvas = await page.locator('.esri-view-surface');
  await expect(mapCanvas).toBeVisible();
});

test('sketch toolbar functionality', async ({ page }) => {
  await page.goto('/');
  
  // Wait for toolbar to be ready
  const toolbar = await page.locator('.sketch-toolbar');
  await expect(toolbar).toBeVisible();

  // Check if clear button is initially disabled (no features)
  const clearButton = await page.locator('.sketch-toolbar calcite-button[icon-start="trash"]');
  await expect(clearButton).toBeDisabled();
});

test('layer toggling', async ({ page }) => {
  await page.goto('/');
  
  // Wait for layers toggle component
  const layersToggle = await page.locator('app-layers-toggle');
  await expect(layersToggle).toBeVisible();

  // Click toggle button
  const toggleButton = await page.locator('app-layers-toggle button');
  await toggleButton.click();

  // Let the layer load (in real test, you'd want to verify the layer is visible)
  await page.waitForTimeout(1000);
});

test('drawing point tool', async ({ page }) => {
  await page.goto('/');
  
  // Wait for points tool component
  const pointsTool = await page.locator('app-points-tool');
  await expect(pointsTool).toBeVisible();

  // Click the draw point button
  const drawButton = await page.locator('app-points-tool button');
  await drawButton.click();

  // Verify cursor changes (indicating active drawing mode)
  const mapView = await page.locator('.map-container');
  const cursor = await mapView.evaluate((el) => window.getComputedStyle(el).cursor);
  expect(cursor).not.toBe('default');
});
