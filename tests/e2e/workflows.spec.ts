import { test, expect } from '@playwright/test';

test.describe('Key Workflows', () => {

  test('Ask the Library chat workflow', async ({ page }) => {
    // Mock the /api/chat endpoint BEFORE navigating so the intercept is ready.
    // Use ** glob so it matches regardless of origin.
    await page.route('**/api/chat', async route => {
      const json = { answer: "This is a mocked response from the AI." };
      await route.fulfill({ json });
    });

    await page.goto('http://localhost:3000/chat');

    // Verify the UI loaded — the heading is an <h2> rendered client-side
    await expect(page.getByRole('heading', { name: 'Ask the Library' })).toBeVisible({ timeout: 10000 });

    // Type a message
    const textarea = page.getByPlaceholder('Ask a medical question...');
    await textarea.fill('Hello, Library!');

    // Send the message — scope to main to avoid cookie banner and dev-tools buttons
    await page.getByRole('main').getByRole('button').click();

    // Verify the user message is displayed
    await expect(page.getByText('Hello, Library!')).toBeVisible();

    // Verify the mocked AI response is displayed
    await expect(page.getByText('This is a mocked response from the AI.')).toBeVisible({ timeout: 10000 });
  });

  test('Decap CMS editor loading', async ({ page }) => {
    // Navigate to the CMS hosted on the MkDocs frontend
    await page.goto('http://localhost:8000/admin/');

    // In local_backend mode, there is usually a login button that bypasses OAuth
    // Or it automatically logs in depending on Decap version. We wait for a button or the UI.
    const loginButton = page.getByRole('button', { name: /login/i });
    if (await loginButton.isVisible()) {
        await loginButton.click();
    }

    // Verify we land on the Collections page and can see the Articles collection
    // Wait for the side navigation or header
    await expect(page.getByRole('heading', { name: 'Collections' })).toBeVisible({ timeout: 10000 });

    // The "Articles" collection heading should be present (use role to avoid ambiguity
    // with the sidebar nav link which also contains "Articles" text)
    await expect(page.getByRole('heading', { name: 'Articles' })).toBeVisible();
  });

  test('Cross-app search redirection', async ({ page }) => {
    // Start on the Webapp landing page
    await page.goto('http://localhost:3000');

    // Fill the search box — actual placeholder: "Search guidelines, clinical trials, or articles..."
    const searchInput = page.getByPlaceholder(/Search guidelines/i);
    await searchInput.fill('hypertension');
    await searchInput.press('Enter');

    // Wait for the URL to change to the MkDocs site on port 8000
    await page.waitForURL('http://localhost:8000/?q=hypertension', { timeout: 10000 });

    // We can't strictly test the search results load without waiting for the MkDocs index,
    // but the URL change verifies the routing is correct.
    expect(page.url()).toContain('8000/?q=hypertension');
  });

  test('I am feeling lucky redirection', async ({ page }) => {
    // Start on the Webapp landing page
    await page.goto('http://localhost:3000');

    // Click the "I'm feeling lucky" button (rendered as plain text, not an icon button)
    await page.getByRole('button', { name: /feeling lucky/i }).click();

    // Verify that we are redirected to a random article in the Docs
    // MkDocs always appends a trailing slash, so check for /articles/ path segment
    await page.waitForURL(url => url.href.includes('8000/articles/'), { timeout: 10000 });

    expect(page.url()).toContain('8000');
  });

});
