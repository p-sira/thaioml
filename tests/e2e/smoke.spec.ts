import { test, expect } from '@playwright/test';

test.describe('Website E2E Smoke Tests', () => {
  test('MkDocs frontend should load', async ({ page }) => {
    // MkDocs runs on 8000 by default (from mkdocs serve)
    await page.goto('http://localhost:8000');
    await expect(page).toHaveTitle(/ThaiOML/);
  });

  test('Next.js webapp should load', async ({ page }) => {
    // Next.js runs on 3000 by default
    const response = await page.goto('http://localhost:3000');
    // Ensure it doesn't return a 500 or 404, might redirect depending on Clerk setup
    expect(response?.status()).toBeLessThan(400);
  });

  test('FastAPI backend should respond', async ({ request }) => {
    // FastAPI backend runs on 8080 according to Makefile
    // We check the root/health endpoint
    const response = await request.get('http://localhost:8080');
    expect(response.ok()).toBeTruthy();
  });

  test('Decap CMS proxy should respond', async ({ request }) => {
    // Decap proxy server usually runs on 8081
    // We just check if the server accepts a connection
    const response = await request.get('http://localhost:8081/api/v1', { ignoreHTTPSErrors: true });
    // It might return a 401 or 404, but as long as it responds, it's up.
    expect(response.status()).toBeDefined();
  });
});
