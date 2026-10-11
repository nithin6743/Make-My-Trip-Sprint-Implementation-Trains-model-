
import { test, expect } from '@playwright/test';
import { LoginPopup } from './pages/LoginPopup';
import trainQuotas from './test-data/train-quotas.json';

for (const quota of trainQuotas) {
  test(`TC-04 - Verify train search using ${quota.name}`, async ({ page }) => {
    test.setTimeout(120000);

    // Open the homepage, retrying transient navigation failures.
    let navigationSucceeded = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.goto('https://www.makemytrip.com/flights', {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });

        navigationSucceeded = true;
        break;
      } catch (error) {
        console.log(`Homepage navigation attempt ${attempt} failed.`);

        if (attempt === 3) {
          throw error;
        }

        await page.waitForTimeout(2000);
      }
    }

    expect(navigationSucceeded).toBe(true);

    // Close the login popup if it appears.
    const loginPopup = new LoginPopup(page);
    await loginPopup.closeIfVisible();

    // Navigate to Trains through the UI.
    const trainsLink = page.getByRole('link', { name: /trains/i }).first();

    if (await trainsLink.isVisible().catch(() => false)) {
      await trainsLink.click();
    } else {
      await page.getByText(/^trains$/i).first().click();
    }

    // Verify the train search form.
    const sourceField = page.locator('#fromCity');
    const destinationField = page.locator('#toCity');
    const searchButton = page.locator('a[data-cy="submit"]');

    await expect(sourceField).toBeVisible({ timeout: 30000 });
    await expect(destinationField).toBeVisible();
    await expect(sourceField).toHaveValue(/.+/);
    await expect(destinationField).toHaveValue(/.+/);

    // Search for trains.
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    const trainResults = page.locator('[data-testid="listing-card"]');

    await expect(trainResults.first()).toBeVisible({
      timeout: 60000,
    });

    console.log(`Initial train results: ${await trainResults.count()}`);

    // Locate the quota option using the DOM you provided.
    const quotaLabel = page.locator(
      `label[data-testid="${quota.id}"]`
    );

    await expect(quotaLabel).toBeVisible({ timeout: 15000 });

    // The actual checkbox input is hidden, so interact with its visible label.
    const quotaCheckbox = quotaLabel.locator('input[type="checkbox"]');

    const wasChecked = await quotaCheckbox.isChecked();

    if (!wasChecked) {
      await quotaLabel.click();
    }

    await expect(quotaCheckbox).toBeChecked({ timeout: 15000 });

    console.log(`${quota.name} checkbox is selected.`);

    // Verify the results remain visible after selecting the quota.
    await expect(trainResults.first()).toBeVisible({
      timeout: 60000,
    });

    console.log(
      `${quota.name}: selected successfully; train results remain visible.`
    );
  });
}
