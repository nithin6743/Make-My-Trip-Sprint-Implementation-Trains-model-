import { test, expect, Page } from "@playwright/test";
import { LoginPopup } from "./pages/LoginPopup";
import trainQuotas from "./test-data/train-quotas.json";

type Quota = (typeof trainQuotas)[number];

// Set the exact checkbox state required for each quota.
async function setQuotaState(
  page: Page,
  quota: Quota,
  shouldBeSelected: boolean,
): Promise<void> {
  const quotaLabel = page.locator(`label[data-testid="${quota.id}"]`);

  const quotaCheckbox = quotaLabel.locator('input[type="checkbox"]');

  await expect(quotaLabel).toBeVisible({ timeout: 15000 });
  await expect(quotaCheckbox).toBeAttached();

  const currentlySelected = await quotaCheckbox.isChecked();

  console.log(
    `${quota.name}: initially ${currentlySelected ? "SELECTED" : "DESELECTED"}`,
  );

  // Change the state only when necessary.
  // Click the visible label because the checkbox input is hidden.
  if (currentlySelected !== shouldBeSelected) {
    await quotaLabel.click();
  }

  // Verify the final checkbox state.
  if (shouldBeSelected) {
    await expect(quotaCheckbox).toBeChecked({
      timeout: 15000,
    });
  } else {
    await expect(quotaCheckbox).not.toBeChecked({
      timeout: 15000,
    });
  }

  console.log(
    `${quota.name}: ${
      shouldBeSelected ? "SELECTED" : "DESELECTED"
    } as expected`,
  );
}

for (const quota of trainQuotas) {
  test(`TC-04 - Verify train search using ${quota.name}`, async ({ page }) => {
    test.setTimeout(120000);

    // 1. Open the MakeMyTrip homepage.
    let navigationSucceeded = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.goto("https://www.makemytrip.com/flights", {
          waitUntil: "domcontentloaded",
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

    // 2. Close the login popup if it appears.
    const loginPopup = new LoginPopup(page);
    await loginPopup.closeIfVisible();

    // 3. Navigate to Trains through the website UI.
    const trainsLink = page.getByRole("link", { name: /trains/i }).first();

    if (await trainsLink.isVisible().catch(() => false)) {
      await trainsLink.click();
    } else {
      await page
        .getByText(/^trains$/i)
        .first()
        .click();
    }

    // 4. Verify the train-search form.
    const sourceField = page.locator("#fromCity");
    const destinationField = page.locator("#toCity");
    const searchButton = page.locator('a[data-cy="submit"]');

    await expect(sourceField).toBeVisible({
      timeout: 30000,
    });

    await expect(destinationField).toBeVisible({
      timeout: 15000,
    });

    await expect(sourceField).toHaveValue(/.+/);
    await expect(destinationField).toHaveValue(/.+/);

    await expect(searchButton).toBeVisible({
      timeout: 15000,
    });

    // 5. Search for trains.
    await searchButton.click();

    const trainResults = page.locator('[data-testid="listing-card"]');

    await expect(trainResults.first()).toBeVisible({
      timeout: 60000,
    });

    console.log(`Initial train results: ${await trainResults.count()}`);

    // 6. Set the target quota to selected.
    // Explicitly deselect the other quotas so default selections
    // cannot cause a false positive.
    for (const currentQuota of trainQuotas) {
      await setQuotaState(page, currentQuota, currentQuota.id === quota.id);
    }

    // 7. Verify that the train-results area remains visible.
    await expect(trainResults.first()).toBeVisible({
      timeout: 60000,
    });

    console.log(
      `${quota.name}: checkbox state verified; ` +
        "train results remain visible.",
    );
  });
}
