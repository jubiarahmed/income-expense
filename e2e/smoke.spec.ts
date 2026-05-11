import { expect, test } from '@playwright/test';

// Smoke tests against the live production build. They only touch the public surface
// so no test account / fixtures are required.

test.describe('Public surface', () => {
  test('app boots and shows the auth screen for signed-out users', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Expense Tracker' })).toBeVisible();
    // SegmentedControl "Sign in" tab AND the submit button both say "Sign in",
    // so scope the submit lookup by type=submit.
    const submit = page.locator('button[type="submit"]');
    await expect(submit).toBeVisible();
  });

  test('switching to Create reveals the name and confirm-password fields', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByPlaceholder('Your name')).toBeVisible();
    await expect(page.getByPlaceholder('Repeat password')).toBeVisible();
  });

  test('sign-in form rejects an invalid email', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('you@example.com').fill('not-an-email');
    await page.getByPlaceholder('Your password').fill('does-not-matter');
    await page.locator('button[type="submit"]').click();
    // type=email field gets focus and a native validation tooltip; never submits.
    const emailInput = page.getByPlaceholder('you@example.com');
    await expect(emailInput).toBeFocused();
  });

  test('PWA manifest is served', async ({ page }) => {
    const response = await page.request.get('/manifest.webmanifest');
    expect(response.ok()).toBeTruthy();
    const manifest = await response.json();
    expect(manifest.name).toContain('Expense Tracker');
  });

  test('service worker registration script is present', async ({ page }) => {
    await page.goto('/');
    const swScript = page.locator('script[src="/registerSW.js"]');
    await expect(swScript).toHaveCount(1);
  });

  test('a wrong sign-in returns a visible error alert', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('you@example.com').fill('nobody@expense-tracker.test');
    await page.getByPlaceholder('Your password').fill('wrong-password');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8000 });
  });
});
