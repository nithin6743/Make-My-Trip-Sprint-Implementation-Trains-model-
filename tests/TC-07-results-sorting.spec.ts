import { test, expect } from "@playwright/test";
import { LoginPopup } from "./pages/LoginPopup";
import sortingData from "./test-data/TC-07-sorting-data.json";

test.describe("TC-07: Train Results Sorting", () => {
  test.setTimeout(120000);

  test("Navigate from Flights to Railways and verify sorting options", async ({
    page,
  }) => {
    // Step 1: Open MakeMyTrip Flights.
    await page.goto("https://www.makemytrip.com/flights/", {
      waitUntil: "domcontentloaded",
    });

    const loginPopup = new LoginPopup(page);
    await loginPopup.closeIfVisible();

    // Step 2: Navigate to Trains.
    const trainsLink = page.getByRole("link", { name: "Trains" }).first();

    await expect(trainsLink).toBeVisible({ timeout: 20000 });
    await trainsLink.click();

    await expect(page).toHaveURL(/railways/i, {
      timeout: 30000,
    });

    await loginPopup.closeIfVisible();

    // Step 3: Verify the prefilled stations.
    const fromStation = page.getByRole("textbox", {
      name: /From NDLS, New Delhi Railway Station/i,
    });

    const toStation = page.getByRole("textbox", {
      name: /To CNB, Kanpur Central/i,
    });

    await expect(fromStation).toBeVisible({ timeout: 20000 });
    await expect(fromStation).toHaveValue(/New Delhi/i);

    await expect(toStation).toBeVisible({ timeout: 20000 });
    await expect(toStation).toHaveValue(/Kanpur/i);

    // Step 4: Search for trains.
    // The Search control may be a button or a text element,
    // depending on the page version.
    const searchButton = page.getByRole("button", {
      name: /^search$/i,
    });

    if (await searchButton.count()) {
      await searchButton.first().click();
    } else {
      await page.getByText("Search", { exact: true }).click();
    }

    // Step 5: Wait for train results.
    const results = page.locator('[data-testid="listing-card"]');

    await expect(results.first()).toBeVisible({
      timeout: 60000,
    });

    // Step 6: Print DOM diagnostics to identify actual selectors.
    const debugInfo = await page.evaluate(() => {
      const tabs = document.querySelector(
        'ul[class*="SortBy_sortTabsWrapper"]',
      );

      const cards = document.querySelectorAll('[data-testid="listing-card"]');

      return {
        sortingTabsHTML: tabs?.outerHTML ?? "Sorting tabs not found",
        firstTrainCardHTML: cards[0]?.outerHTML ?? "Train card not found",
        cardCount: cards.length,
      };
    });

    console.log("TC-07 DOM DIAGNOSTICS:");
    console.log(JSON.stringify(debugInfo, null, 2));

    // Step 7: Validate sorting options.
    const sortTabs = page.locator('ul[class*="SortBy_sortTabsWrapper"]');

    await expect(sortTabs).toBeVisible({ timeout: 15000 });

    for (const option of sortingData.sortingOptions) {
      console.log(`Checking sorting option: ${option.name}`);

      // Locate the option using its visible label.
      const label = sortTabs
        .locator('p[class*="SortBy_labelText"]')
        .getByText(option.name, { exact: true });

      await expect(label).toBeVisible({ timeout: 10000 });

      const tab = label.locator(
        'xpath=ancestor::div[contains(@class, "SortBy_tabSection")]',
      );

      await tab.scrollIntoViewIfNeeded();
      await tab.click();

      // Check the actual class after clicking.
      // If the tab does not activate, fail with a useful message.
      await expect
        .poll(async () => (await tab.getAttribute("class")) ?? "", {
          message:
            `${option.name} tab should become active after clicking. ` +
            "Review the TC-07 DOM diagnostics above.",
          timeout: 10000,
        })
        .toContain("SortBy_activeTabs");

      // Read the configured field from each displayed train card.
      const values = await results.evaluateAll(
        (cards, selector) =>
          cards.map((card) => {
            const element = card.querySelector(selector);
            return element?.textContent?.trim() ?? "";
          }),
        option.selector,
      );

      expect(
        values.length,
        `No train cards found for ${option.name}`,
      ).toBeGreaterThan(0);

      expect(
        values.every((value) => value.length > 0),
        `Missing ${option.name} values. ` +
          `Configured selector: ${option.selector}. ` +
          "Review the firstTrainCardHTML diagnostic.",
      ).toBe(true);

      let normalizedValues: (string | number)[];

      if (option.name === "Train Name") {
        normalizedValues = values.map((value) =>
          value.toLocaleLowerCase().trim(),
        );
      } else if (option.name === "Travel Time") {
        normalizedValues = values.map((value) => {
          const hours = value.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)\b/i);

          const minutes = value.match(
            /(\d+)\s*(?:m|min|mins|minute|minutes)\b/i,
          );

          return (
            (hours ? Number(hours[1]) * 60 : 0) +
            (minutes ? Number(minutes[1]) : 0)
          );
        });

        expect(
          (normalizedValues as number[]).every((value) => value > 0),
          `Could not parse journey durations: ${values.join(", ")}`,
        ).toBe(true);
      } else {
        throw new Error(`Unsupported sorting option: ${option.name}`);
      }

      // Verify ascending order.
      // Confirm this matches the website's documented sort direction.
      const sortedValues = [...normalizedValues].sort((a, b) => {
        if (typeof a === "number" && typeof b === "number") {
          return a - b;
        }

        return String(a).localeCompare(String(b));
      });

      expect(
        normalizedValues,
        `${option.name} results are not in ascending order. ` +
          `Actual values: ${normalizedValues.join(", ")}`,
      ).toEqual(sortedValues);

      console.log(`Verified actual ordering: ${option.name}`);
    }
  });
});
