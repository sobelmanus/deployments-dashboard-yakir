import { test, expect } from '@playwright/test';
import { mockAllApis, DEPLOYMENTS } from './fixtures';
import type { Deployment } from '@/types';

test.describe.skip('Inline edit', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto('/');
    await expect(page.locator('tbody tr[data-row-id]')).toHaveCount(2);
    // Wait for inline edit cells to be initialized (requires fieldConfig to load)
    await expect(
      page.locator('[data-row-id="dep-001"] [data-inline-edit="attributes.name"]')
    ).toBeVisible();
  });

  // The InlineEditCell view-mode div has title={currentValue}, giving us a reliable selector
  // for the clickable div (which has the onClick={activate} handler).
  function nameCell(page: import('@playwright/test').Page) {
    return page.locator('[data-row-id="dep-001"] [data-inline-edit="attributes.name"]');
  }
  function nameCellDiv(page: import('@playwright/test').Page) {
    return page.locator('[data-row-id="dep-001"] [data-inline-edit="attributes.name"] [title="api-service"]');
  }

  test('click name cell activates edit mode with input', async ({ page }) => {
    // Click the inner div (has title attribute = current value and onClick={activate})
    await nameCellDiv(page).click();

    const input = nameCell(page).locator('input[type="text"]');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('api-service');
  });

  test('type new name + Enter: PATCH called + cell shows new value', async ({ page }) => {
    const updatedDep: Deployment = {
      ...DEPLOYMENTS[0],
      attributes: { ...DEPLOYMENTS[0].attributes, name: 'renamed-service' },
    };

    // Override PATCH for this test (registered after beforeEach routes, so takes priority)
    await page.route('**/api/deployments/dep-001', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedDep),
        });
      } else {
        await route.continue();
      }
    });

    await nameCellDiv(page).click();
    const input = nameCell(page).locator('input[type="text"]');
    await input.fill('renamed-service');
    await input.press('Enter');

    await expect(input).not.toBeVisible();
    await expect(nameCell(page)).toContainText('renamed-service');
  });

  test('Escape while editing reverts to original value', async ({ page }) => {
    await nameCellDiv(page).click();
    const input = nameCell(page).locator('input[type="text"]');
    await input.fill('temporary-name');
    await input.press('Escape');

    await expect(input).not.toBeVisible();
    await expect(nameCell(page)).toContainText('api-service');
  });

  test('clicking outside (blur) commits the value', async ({ page }) => {
    const updatedDep: Deployment = {
      ...DEPLOYMENTS[0],
      attributes: { ...DEPLOYMENTS[0].attributes, name: 'blur-committed' },
    };

    await page.route('**/api/deployments/dep-001', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedDep),
        });
      } else {
        await route.continue();
      }
    });

    await nameCellDiv(page).click();
    const input = nameCell(page).locator('input[type="text"]');
    await input.fill('blur-committed');

    // Click the page title to blur the input
    await page.locator('h1').click();

    await expect(input).not.toBeVisible();
    await expect(nameCell(page)).toContainText('blur-committed');
  });
});
