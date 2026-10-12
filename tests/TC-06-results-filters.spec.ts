import { test, expect } from "@playwright/test";
import { LoginPopup } from "./pages/LoginPopup";
import { TrainResultsPage } from "./pages/TrainResultsPage";
import filterData from "./test-data/TC-06-filter-data.json";

type FilterCase = (typeof filterData.testCases)[number];

for (const testCase of filterData.testCases as FilterCase[]) {
  test(`${testCase.id} - ${testCase.title}`, async ({ page }) => {
    test.skip(!testCase.enabled, "Disabled in TC-06 JSON data");

    test.setTimeout(120000);

    // Open MakeMyTrip.
    await page.goto("https://www.makemytrip.com/flights", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Close the login popup if it appears.
    const loginPopup = new LoginPopup(page);
    await loginPopup.closeIfVisible();

    // Navigate to Trains.
    const trainsLink = page.getByRole("link", { name: /trains/i }).first();

    if (await trainsLink.isVisible().catch(() => false)) {
      await trainsLink.click();
    } else {
      await page
        .getByText(/^trains$/i)
        .first()
        .click();
    }

    // Verify the default route.
    await expect(page.locator("#fromCity")).toHaveValue(/New Delhi/i, {
      timeout: 30000,
    });

    await expect(page.locator("#toCity")).toHaveValue(/Kanpur/i);

    // Search for trains.
    await page.locator('a[data-cy="submit"]').click();

    const results = new TrainResultsPage(page);
    await results.verifyResultsDisplayed();

    // Locate the filter configured in JSON.
    const filter = page.locator(
      `label[data-testid="${testCase.filterTestId}"]`,
    );

    const checkbox = filter.locator('input[type="checkbox"]');

    await expect(filter).toBeVisible({
      timeout: 20000,
    });

    await filter.scrollIntoViewIfNeeded();

    // Capture the initial card count for diagnostic output.
    const beforeCount = await results.trainCards.count();

    // Apply the filter only when it is not already selected.
    if (!(await checkbox.isChecked())) {
      await filter.click();
    }

    await expect(checkbox).toBeChecked({
      timeout: 10000,
    });

    // Wait for the result list to settle.
    // Do not assume the departure-time signature must change:
    // availability or class filters may leave those times unchanged.
    await expect
      .poll(async () => await results.trainCards.count(), {
        message: `${testCase.filterName}: no train cards found after filtering`,
        timeout: 20000,
        intervals: [500, 1000, 2000],
      })
      .toBeGreaterThan(0);

    const afterCount = await results.trainCards.count();

    console.log(
      `${testCase.id}: cards before filter=${beforeCount}, cards after filter=${afterCount}`,
    );

    // Validate results according to the JSON scenario.
    switch (testCase.validationType) {
      case "departureAfter":
        await results.verifyDepartureAfter(
          testCase.cutoffHour!,
          testCase.cutoffMinute!,
          testCase.numberOfCardsToValidate,
        );
        break;

      case "arrivalBefore":
        await results.verifyArrivalBefore(
          testCase.cutoffHour!,
          testCase.cutoffMinute!,
          testCase.numberOfCardsToValidate,
        );
        break;

      case "availability":
        await results.verifyAvailability(testCase.numberOfCardsToValidate);
        break;

      case "journeyClass":
        await results.verifyJourneyClass(
          testCase.expectedClass!,
          testCase.numberOfCardsToValidate,
        );
        break;

      default:
        throw new Error(`Unknown validationType: ${testCase.validationType}`);
    }

    console.log(`${testCase.id} passed its result validation.`);
  });
}
