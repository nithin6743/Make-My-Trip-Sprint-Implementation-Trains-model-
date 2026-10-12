import { test, expect } from "@playwright/test";
import { LoginPopup } from "./pages/LoginPopup";
import { TrainResultsPage } from "./pages/TrainResultsPage";
import filterData from "./test-data/TC-06-filter-data.json";

for (const testCase of filterData.testCases) {
  test(`${testCase.id} - ${testCase.title}`, async ({ page }) => {
    test.skip(!testCase.enabled, "Disabled in TC-06 JSON data");
    test.setTimeout(120000);

    // Open the train page directly.
    await page.goto("https://www.makemytrip.com/railways/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Use the existing popup handler. Do not modify LoginPopup.ts.
    const loginPopup = new LoginPopup(page);
    await loginPopup.closeIfVisible();

    // Confirm the default route.
    await expect(page.locator("#fromCity")).toHaveValue(/New Delhi/i, {
      timeout: 30000,
    });
    await expect(page.locator("#toCity")).toHaveValue(/Kanpur/i);

    // Search for trains.
    await page.locator('a[data-cy="submit"]').click();

    const results = new TrainResultsPage(page);
    await results.verifyResultsDisplayed();

    // Locate and apply the filter from JSON.
    const filter = page.locator(
      `label[data-testid="${testCase.filterTestId}"]`,
    );

    await expect(filter).toBeVisible({ timeout: 20000 });
    await filter.scrollIntoViewIfNeeded();

    const checkbox = filter.locator('input[type="checkbox"]');
    const beforeCount = await results.trainCards.count();

    if (!(await checkbox.isChecked())) {
      await filter.scrollIntoViewIfNeeded();
      await filter.click({ timeout: 10000 });
    }

    await expect(checkbox).toBeChecked({ timeout: 15000 });

    // Wait for the number of cards to change after filtering.
    await expect
      .poll(async () => await results.trainCards.count(), {
        message: `${testCase.id}: result count did not change after applying the filter`,
        timeout: 20000,
        intervals: [500, 1000, 2000],
      })
      .not.toBe(beforeCount);

    await results.verifyResultsDisplayed();

    console.log(
      `${testCase.id}: cards before=${beforeCount}, after=${await results.trainCards.count()}`,
    );

    // Validate the first result for this simplified test.
    switch (testCase.validationType) {
      case "departureAfter":
        await results.verifyFirstDepartureAfter(
          testCase.cutoffHour,
          testCase.cutoffMinute,
        );
        break;

      case "arrivalBefore":
        await results.verifyFirstArrivalBefore(
          testCase.cutoffHour,
          testCase.cutoffMinute,
        );
        break;

      case "availability":
        await results.verifyFirstTrainAvailability();
        break;

      case "journeyClass":
        await results.verifyFirstTrainClass(testCase.expectedClass);
        break;

      default:
        throw new Error(`Unknown validation type: ${testCase.validationType}`);
    }

    console.log(`${testCase.id} validation completed.`);
  });
}
