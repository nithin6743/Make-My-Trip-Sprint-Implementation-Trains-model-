import { test, expect } from "@playwright/test";
import { LoginPopup } from "./pages/LoginPopup";
import travelClasses from "./test-data/travel-classes.json";

for (const travelClass of travelClasses) {
  test(`TC-03 - Verify train search using ${travelClass.code} (${travelClass.name})`, async ({
    page,
  }) => {
    test.setTimeout(120000);

    // Step 1: Open the MakeMyTrip homepage.
    await page.goto("https://www.makemytrip.com/flights", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Step 2: Close login popup if visible.
    const loginPopup = new LoginPopup(page);
    await loginPopup.closeIfVisible();

    // Step 3: Navigate to Trains through the UI.
    const trainsLink = page.getByRole("link", { name: /trains/i }).first();

    if (await trainsLink.isVisible().catch(() => false)) {
      await trainsLink.click();
    } else {
      await page
        .getByText(/^trains$/i)
        .first()
        .click();
    }

    // Step 4: Verify search fields.
    const sourceField = page.locator("#fromCity");
    const destinationField = page.locator("#toCity");
    const journeyDateField = page.locator("#travelDate");
    const classField = page.locator("#travelClass");

    await expect(sourceField).toBeVisible({ timeout: 30000 });
    await expect(destinationField).toBeVisible();
    await expect(journeyDateField).toBeVisible();
    await expect(classField).toBeVisible();

    await expect(sourceField).toHaveValue(/.+/);
    await expect(destinationField).toHaveValue(/.+/);

    // Step 5: Open the Class dropdown.
    const classWidget = page.locator('label[for="travelClass"]');
    const classDropdown = page.locator("ul.travelForPopup");

    await classWidget.click();

    await expect(classDropdown).toBeVisible({
      timeout: 10000,
    });

    // Step 6: Select the class using its data-cy code.
    const classOption = classDropdown.locator(
      `li[data-cy="${travelClass.code}"]`,
    );

    await expect(
      classOption,
      `Class option ${travelClass.code} should be visible`,
    ).toBeVisible();

    await classOption.click();

    // Assert that the requested class was selected.
    await expect(classField).toHaveValue(travelClass.code, {
      timeout: 10000,
    });

    await expect(classDropdown).toBeHidden({
      timeout: 10000,
    });

    console.log(`Selected class: ${travelClass.code} (${travelClass.name})`);

    // Step 7: Search trains.
    const searchButton = page.locator('a[data-cy="submit"]');

    await expect(searchButton).toBeVisible({
      timeout: 30000,
    });

    await searchButton.click();

    // Step 8: Verify train results, no-results messages, or errors.
    const trainResults = page.locator('[data-testid="listing-card"]');

    // Known no-results messages.
    const noResultsMessage = page
      .getByText(
        /no trains found|no trains available|no results found|no trains for your search|no availability/i,
      )
      .first();

    // Potential application errors.
    const errorMessage = page
      .getByText(
        /something went wrong|unexpected error|unable to process|failed to load|please try again|technical error/i,
      )
      .first();

    // Wait until a recognizable outcome appears.
    await expect
      .poll(
        async () => {
          const resultsVisible = await trainResults
            .first()
            .isVisible()
            .catch(() => false);

          const noResultsVisible = await noResultsMessage
            .isVisible()
            .catch(() => false);

          const errorVisible = await errorMessage
            .isVisible()
            .catch(() => false);

          return resultsVisible || noResultsVisible || errorVisible;
        },
        {
          timeout: 60000,
          message: `No results, no-availability message, or error appeared for class ${travelClass.code}`,
        },
      )
      .toBe(true);

    // Classify the outcome.
    if (await errorMessage.isVisible().catch(() => false)) {
      const errorText = (await errorMessage.innerText()).trim();

      throw new Error(
        `Search failed for class ${travelClass.code}: ${errorText}`,
      );
    }

    if (
      await trainResults
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      const resultCount = await trainResults.count();

      await expect(trainResults.first()).toBeVisible();

      console.log(
        `${travelClass.code}: ${resultCount} train result(s) displayed.`,
      );
    } else if (await noResultsMessage.isVisible().catch(() => false)) {
      const message = (await noResultsMessage.innerText()).trim();

      console.log(
        `${travelClass.code}: no results displayed. Website message: ${message}`,
      );
    } else {
      throw new Error(
        `Search outcome could not be classified for class ${travelClass.code}`,
      );
    }
  });
}
