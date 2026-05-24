import { test, expect } from '@playwright/test';
import { mockAllApis, DEPLOYMENTS } from './fixtures';

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
  });

  test('renders table with non-deleted deployments', async ({ page }) => {
    await page.goto('/');
    // Wait for the table body rows (not skeleton)
    const rows = page.locator('tbody tr[data-row-id]');
    await expect(rows).toHaveCount(2); // dep-001 and dep-002 (dep-003 is deleted)
  });

  test('shows deployment names in table', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('api-service')).toBeVisible();
    await expect(page.getByText('batch-worker')).toBeVisible();
  });

  test('does not show deleted deployment by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('data-sync')).not.toBeVisible();
  });

  test('shows page title', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Deployments Dashboard' })).toBeVisible();
  });
});
