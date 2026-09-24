import { test, expect } from '@playwright/test';

test.describe('Website E2E Smoke Tests', () => {
  test('Next.js webapp should load', async ({ page }) => {
    // Next.js runs on 3000 by default.
    // In CI, Clerk uses a dummy key so it may return 400 (auth rejected)
    // rather than 200. We only assert it's not a server crash (5xx).
    const response = await page.goto('http://localhost:3000');
    expect(response?.status()).toBeLessThan(500);
  });

  test('FastAPI backend should respond', async ({ request }) => {
    // FastAPI backend runs on 8080 according to Makefile
    // We check the root/health endpoint
    const response = await request.get('http://localhost:8080');
    expect(response.ok()).toBeTruthy();
  });
});
