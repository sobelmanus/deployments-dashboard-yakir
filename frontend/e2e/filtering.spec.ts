import { test, expect } from '@playwright/test';
import { mockAllApis } from './fixtures';

test.describe('Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto('/');
    // Wait for initial data to load (2 non-deleted rows)
    await expect(page.locator('tbody tr[data-row-id]')).toHaveCount(2);
  });

  test('status filter: checking "failed" shows only batch-worker', async ({ page }) => {
    // The toolbar filter button appears before the table column header, so .first() is reliable
    await page.getByRole('button', { name: /^Status/ }).first().click();
    await page.getByRole('checkbox', { name: /failed/i }).check();
    await page.keyboard.press('Escape');

    await expect(page.locator('tbody tr[data-row-id]')).toHaveCount(1);
    await expect(page.getByText('batch-worker')).toBeVisible();
    await expect(page.getByText('api-service')).not.toBeVisible();
  });

  test('type filter: checking "worker" shows only batch-worker', async ({ page }) => {
    await page.getByRole('button', { name: /^Type/ }).first().click();
    await page.getByRole('checkbox', { name: /worker/i }).check();
    await page.keyboard.press('Escape');

    await expect(page.locator('tbody tr[data-row-id]')).toHaveCount(1);
    await expect(page.getByText('batch-worker')).toBeVisible();
    await expect(page.getByText('api-service')).not.toBeVisible();
  });

  test('environment filter: checking "production" shows only api-service', async ({ page }) => {
    await page.getByRole('button', { name: /^Environment/ }).first().click();
    await page.getByRole('checkbox', { name: /production/i }).check();
    await page.keyboard.press('Escape');

    await expect(page.locator('tbody tr[data-row-id]')).toHaveCount(1);
    await expect(page.getByText('api-service')).toBeVisible();
    await expect(page.getByText('batch-worker')).not.toBeVisible();
  });

  test('view=deleted shows only data-sync', async ({ page }) => {
    await page.getByRole('button', { name: 'Deleted' }).click();

    await expect(page.locator('tbody tr[data-row-id]')).toHaveCount(1);
    await expect(page.getByText('data-sync')).toBeVisible();
    await expect(page.getByText('api-service')).not.toBeVisible();
    await expect(page.getByText('batch-worker')).not.toBeVisible();
  });

  test('view=all shows all 3 deployments', async ({ page }) => {
    await page.getByRole('button', { name: 'All' }).click();

    await expect(page.locator('tbody tr[data-row-id]')).toHaveCount(3);
    await expect(page.getByText('api-service')).toBeVisible();
    await expect(page.getByText('batch-worker')).toBeVisible();
    await expect(page.getByText('data-sync')).toBeVisible();
  });

  test('switching back to existing view hides deleted deployment', async ({ page }) => {
    await page.getByRole('button', { name: 'All' }).click();
    await expect(page.locator('tbody tr[data-row-id]')).toHaveCount(3);

    await page.getByRole('button', { name: 'Existing' }).click();
    await expect(page.locator('tbody tr[data-row-id]')).toHaveCount(2);
    await expect(page.getByText('data-sync')).not.toBeVisible();
  });
});
