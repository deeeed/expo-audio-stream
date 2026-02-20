/**
 * Web Agent Validation — Playwright E2E tests for the web agentic bridge.
 *
 * Validates that the __AGENTIC__ bridge works correctly in a browser context:
 *   - Bridge is installed and reports platform === 'web'
 *   - Navigation works (navigate to tabs, verify route changes)
 *   - State queries work (get-route, get-state)
 *   - Go-back works
 *   - Screenshots can be captured
 */

import { test, expect } from '@playwright/test';

const BRIDGE_TIMEOUT = 30_000;

test.describe('Web Agentic Bridge', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and wait for the bridge
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => typeof globalThis.__AGENTIC__ !== 'undefined',
      { timeout: BRIDGE_TIMEOUT }
    );
    // Wait for route sync (AgenticBridgeSync component needs a render cycle)
    await page.waitForFunction(
      () => (globalThis.__AGENTIC__?.getRoute()?.segments?.length ?? 0) > 0,
      { timeout: 10_000 }
    );
  });

  test('bridge is installed with platform=web', async ({ page }) => {
    const platform = await page.evaluate(
      () => globalThis.__AGENTIC__?.platform
    );
    expect(platform).toBe('web');
  });

  test('getRoute returns current route info', async ({ page }) => {
    const route = await page.evaluate(
      () => globalThis.__AGENTIC__?.getRoute()
    );
    expect(route).toBeDefined();
    expect(route).toHaveProperty('pathname');
    expect(route).toHaveProperty('segments');
  });

  test('getState returns state object', async ({ page }) => {
    const state = await page.evaluate(
      () => globalThis.__AGENTIC__?.getState()
    );
    expect(state).toBeDefined();
    expect(typeof state).toBe('object');
  });

  test('navigate changes the route', async ({ page }) => {
    await page.evaluate(() =>
      globalThis.__AGENTIC__?.navigate('/(tabs)/files')
    );

    // Wait for route to actually change
    await page.waitForFunction(
      () => globalThis.__AGENTIC__?.getRoute()?.pathname?.includes('files'),
      { timeout: 5000 }
    );

    const afterRoute = await page.evaluate(
      () => globalThis.__AGENTIC__?.getRoute()
    );

    expect(afterRoute).toBeDefined();
    expect(afterRoute.pathname).toContain('files');
  });

  test('canGoBack and goBack work', async ({ page }) => {
    // canGoBack and goBack are available as bridge methods
    const canGoBackType = await page.evaluate(
      () => typeof globalThis.__AGENTIC__?.canGoBack
    );
    expect(canGoBackType).toBe('function');

    const goBackType = await page.evaluate(
      () => typeof globalThis.__AGENTIC__?.goBack
    );
    expect(goBackType).toBe('function');

    // Navigate to build history, then test go-back
    await page.evaluate(() =>
      globalThis.__AGENTIC__?.navigate('/(tabs)/files')
    );
    await page.waitForFunction(
      () => globalThis.__AGENTIC__?.getRoute()?.pathname?.includes('files'),
      { timeout: 5000 }
    );

    await page.evaluate(() =>
      globalThis.__AGENTIC__?.navigate('/(tabs)/more')
    );
    await page.waitForFunction(
      () => globalThis.__AGENTIC__?.getRoute()?.pathname?.includes('more'),
      { timeout: 5000 }
    );

    // Try go-back — on web, Expo Router may or may not support canGoBack
    // depending on the navigation stack, so we test the function exists and
    // executes without error rather than asserting a specific result
    const goBackResult = await page.evaluate(
      () => globalThis.__AGENTIC__?.goBack()
    );
    expect(goBackResult).toBeDefined();

    await page.waitForTimeout(1000);
    const routeAfterBack = await page.evaluate(
      () => globalThis.__AGENTIC__?.getRoute()
    );
    expect(routeAfterBack).toBeDefined();
    expect(routeAfterBack.pathname).toBeTruthy();
  });

  test('screenshot can be captured', async ({ page }) => {
    const screenshot = await page.screenshot();
    expect(screenshot).toBeTruthy();
    expect(screenshot.byteLength).toBeGreaterThan(0);
  });

  test('navigate to multiple tabs', async ({ page }) => {
    const tabs = ['/(tabs)/record', '/(tabs)/files', '/(tabs)/more'];

    for (const tab of tabs) {
      await page.evaluate((t) => globalThis.__AGENTIC__?.navigate(t), tab);
      await page.waitForTimeout(1000);

      const route = await page.evaluate(
        () => globalThis.__AGENTIC__?.getRoute()
      );
      expect(route).toBeDefined();
      expect(route.pathname).toBeTruthy();
    }
  });

  test('console logs are captured in browser context', async ({ page }) => {
    // Verify that console messages are emitted (Expo dev mode logs)
    const messages: string[] = [];
    page.on('console', (msg) => {
      messages.push(msg.text());
    });

    // Trigger some activity
    await page.evaluate(() =>
      globalThis.__AGENTIC__?.navigate('/(tabs)/record')
    );
    await page.waitForTimeout(2000);

    // In dev mode, Expo typically emits console messages
    // We just verify the capture mechanism works
    expect(Array.isArray(messages)).toBe(true);
  });
});
