import { test, expect, Page, Locator } from "@playwright/test";
import { LoginPopup } from "./pages/LoginPopup";

test("TC-02 - Verify train search when source and destination are interchanged", async ({
  page,
}) => {
  test.setTimeout(120000);

  // Step 1: Open MakeMyTrip homepage.
  await page.goto("https://www.makemytrip.com/flights", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // Step 2: Close login popup if visible.
  const loginPopup = new LoginPopup(page);
  await loginPopup.closeIfVisible();

  // Step 3: Navigate to Trains through the homepage UI.
  const trainsLink = page
    .getByRole("link", {
      name: /trains/i,
    })
    .first();

  if (await trainsLink.isVisible().catch(() => false)) {
    await trainsLink.click();
  } else {
    await page
      .getByText(/^trains$/i)
      .first()
      .click();
  }

  // Step 4: Locate route fields.
  const sourceField = page.locator("#fromCity");
  const destinationField = page.locator("#toCity");

  await expect(sourceField).toBeVisible({ timeout: 30000 });
  await expect(destinationField).toBeVisible({ timeout: 30000 });

  // Step 5: Save the original route before changing either field.
  const originalSource = (await sourceField.inputValue()).trim();
  const originalDestination = (await destinationField.inputValue()).trim();

  console.log("Original source:", originalSource);
  console.log("Original destination:", originalDestination);

  expect(originalSource).not.toBe("");
  expect(originalDestination).not.toBe("");

  function extractCityName(value: string): string {
    if (/kanpur/i.test(value)) return "Kanpur";
    if (/new delhi|delhi/i.test(value)) return "New Delhi";

    return value
      .replace(/^[A-Z]{2,5},\s*/, "")
      .replace(/\s+Railway Station$/i, "")
      .trim();
  }

  const sourceCity = extractCityName(originalSource);
  const destinationCity = extractCityName(originalDestination);

  // Step 6: Select a city only from the active autocomplete suggestions.
  async function selectStation(
    field: Locator,
    cityName: string,
    page: Page,
  ): Promise<void> {
    // Open the autocomplete for this specific field.
    await field.click();

    const searchInput = page
      .locator(
        'input[role="combobox"]:visible, ' +
          "input.react-autosuggest__input--open:visible",
      )
      .last();

    await expect(searchInput).toBeVisible({ timeout: 15000 });
    await searchInput.fill(cityName);

    // Scope all text matching to the suggestions container.
    const suggestions = page.locator(
      ".RailAutoComplete_suggestionsContainer__AvECx:visible",
    );

    await expect(suggestions).toBeVisible({ timeout: 15000 });

    // Match the city text inside the suggestions, not elsewhere on the page.
    const cityText = suggestions
      .getByText(
        new RegExp(cityName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        { exact: false },
      )
      .first();

    await expect(cityText).toBeVisible({ timeout: 15000 });

    console.log(
      `Selecting "${cityName}". Suggestion text:`,
      await cityText.innerText(),
    );

    // Click the containing list item to select the suggestion.
    await cityText.locator("xpath=ancestor::li[1]").click();

    // Wait until the readonly route field reflects the selection.
    await expect
      .poll(async () => (await field.inputValue()).trim(), { timeout: 10000 })
      .not.toBe("");

    console.log(`Selected ${cityName}. Field value:`, await field.inputValue());
  }

  // Step 7: First swap the source to the original destination.
  await selectStation(sourceField, destinationCity, page);

  // Step 8: Then swap the destination to the original source.
  await selectStation(destinationField, sourceCity, page);

  // Step 9: Verify the reversed route.
  await expect(sourceField).toHaveValue(
    new RegExp(destinationCity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );

  await expect(destinationField).toHaveValue(
    new RegExp(sourceCity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );

  console.log("Reversed source:", await sourceField.inputValue());
  console.log("Reversed destination:", await destinationField.inputValue());

  // Step 10: Search using the reversed route.
  const searchButton = page.getByText(/^search$/i).first();

  await expect(searchButton).toBeVisible({ timeout: 15000 });
  await searchButton.click();

  // Step 11: Verify that train results are displayed.
  const trainResults = page.locator('[data-testid="listing-card"]');

  await expect(trainResults.first()).toBeVisible({ timeout: 60000 });
  await expect(trainResults).not.toHaveCount(0);

  console.log(
    "TC-02 passed. Train results displayed:",
    await trainResults.count(),
  );
});
