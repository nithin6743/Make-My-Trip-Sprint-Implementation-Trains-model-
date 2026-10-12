import { test, expect } from "@playwright/test";
import { LoginPopup } from "./pages/LoginPopup";

test.describe("TC-07: Train Results Sorting", () => {
  test.setTimeout(120000);

  test("Navigate from Flights to Railways and verify sorting options", async ({
    page,
  }) => {
    // Step 1: Open Flights
    await page.goto("https://www.makemytrip.com/flights/", {
      waitUntil: "domcontentloaded",
    });

    const loginPopup = new LoginPopup(page);
    await loginPopup.closeIfVisible();

    // Step 2: Navigate to Railways
    const trains = page.getByText("Trains", { exact: true }).first();

    await expect(trains).toBeVisible({ timeout: 20000 });
    await trains.click();

    await expect(page).toHaveURL(/railways/i, {
      timeout: 30000,
    });

    await loginPopup.closeIfVisible();

    // Step 3: Locate the departure station
    const from = page.getByRole("textbox", {
      name: /From NDLS, New Delhi Railway Station/i,
    });

    await expect(from).toBeVisible({ timeout: 20000 });

    // The station is already selected, so do not fill it again.
    await expect(from).toHaveValue(/New Delhi/i);

    // Step 4: Locate the destination station
    const to = page.getByRole("textbox", {
      name: /To CNB, Kanpur Central/i,
    });

    await expect(to).toBeVisible({ timeout: 20000 });
    await expect(to).toHaveValue(/Kanpur/i);

    // Step 5: Select a date only if the date field is empty
    const date = page
      .locator('input[placeholder*="Date" i], input[aria-label*="Date" i]')
      .first();

    if (
      (await date.count()) > 0 &&
      (await date.isVisible().catch(() => false))
    ) {
      const dateValue = await date.inputValue().catch(() => "");

      if (!dateValue.trim()) {
        await date.click();

        const firstDate = page
          .locator('[role="gridcell"]:not([aria-disabled="true"])')
          .first();

        await expect(firstDate).toBeVisible({ timeout: 10000 });
        await firstDate.click();
      }
    }

    // Step 6: Click Search
    const search = page.getByText("Search", { exact: true });

    await expect(search).toBeVisible({ timeout: 10000 });
    await search.click();

    // Step 7: Wait for results
    const results = page.locator('[data-testid="listing-card"]');

    await expect(results.first()).toBeVisible({
      timeout: 60000,
    });

    // Step 8: Verify sorting tabs
    const sortOptions = [
      "Availability",
      "Train Name",
      "Travel Time",
      "Arrival",
      "Departure",
    ];

    for (const option of sortOptions) {
      const label = page
        .locator('ul[class*="SortBy_sortTabsWrapper"]')
        .locator('p[class*="SortBy_labelText"]')
        .getByText(option, { exact: true });

      await expect(label).toBeVisible();

      const tab = label.locator(
        'xpath=ancestor::div[contains(@class, "SortBy_tabSection")]',
      );

      await tab.click();

      await expect(tab).toHaveClass(/SortBy_activeTabs/);
      await expect(results.first()).toBeVisible();

      console.log(`Verified sorting option: ${option}`);
    }
  });
});
