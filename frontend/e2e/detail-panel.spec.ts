import { test, expect } from '@playwright/test';
import { mockAllApis } from './fixtures';

test.describe('Detail panel', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto('/');
    await expect(page.locator('tbody tr[data-row-id]')).toHaveCount(2);
  });

  test('click row opens panel with deployment name in h2', async ({ page }) => {
    await page.locator('tbody tr[data-row-id="dep-001"]').click();
    await expect(page.locator('h2')).toContainText('api-service');
  });

  test('close button closes the panel', async ({ page }) => {
    await page.locator('tbody tr[data-row-id="dep-001"]').click();
    await expect(page.locator('h2')).toContainText('api-service');

    await page.getByRole('button', { name: 'Close panel' }).click();
    await expect(page.locator('h2')).not.toBeVisible();
  });

  test('Escape key closes the panel', async ({ page }) => {
    await page.locator('tbody tr[data-row-id="dep-001"]').click();
    await expect(page.locator('h2')).toContainText('api-service');

    await page.keyboard.press('Escape');
    await expect(page.locator('h2')).not.toBeVisible();
  });

  test('backdrop click closes the panel', async ({ page }) => {
    await page.locator('tbody tr[data-row-id="dep-001"]').click();
    await expect(page.locator('h2')).toContainText('api-service');

    // Click the backdrop (top-left corner, away from the panel which slides in from the right)
    await page.mouse.click(50, 300);
    await expect(page.locator('h2')).not.toBeVisible();
  });

  test('panel shows read-only fields', async ({ page }) => {
    await page.locator('tbody tr[data-row-id="dep-001"]').click();
    await expect(page.getByRole('button', { name: 'Close panel' })).toBeVisible();

    // dt elements only appear in the panel's definition list, not in the table
    await expect(page.locator('dt').filter({ hasText: 'Deployment ID' })).toBeVisible();
    await expect(page.locator('dt').filter({ hasText: 'Version' })).toBeVisible();
    await expect(page.locator('dt').filter({ hasText: 'Status' })).toBeVisible();
    await expect(page.locator('dt').filter({ hasText: 'Type' })).toBeVisible();
    await expect(page.locator('dt').filter({ hasText: 'Environment' })).toBeVisible();
    await expect(page.locator('dt').filter({ hasText: 'Created By' })).toBeVisible();
  });

  test('panel shows deployment field values', async ({ page }) => {
    await page.locator('tbody tr[data-row-id="dep-001"]').click();
    await expect(page.getByRole('button', { name: 'Close panel' })).toBeVisible();

    // dd elements only appear in the panel's definition list
    await expect(page.locator('dd').filter({ hasText: 'dep-001' })).toBeVisible();
    await expect(page.locator('dd').filter({ hasText: '1.0.0' })).toBeVisible();
  });

  test('panel shows attributes section with Edit button', async ({ page }) => {
    await page.locator('tbody tr[data-row-id="dep-001"]').click();
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
  });

  test('clicking row for dep-002 shows batch-worker panel', async ({ page }) => {
    await page.locator('tbody tr[data-row-id="dep-002"]').click();
    await expect(page.locator('h2')).toContainText('batch-worker');
  });
});
