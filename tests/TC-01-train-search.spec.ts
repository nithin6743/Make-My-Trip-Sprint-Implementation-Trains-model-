import { test, expect } from "@playwright/test";
import { LoginPopup } from "./pages/LoginPopup";

test("TC-01 - Verify train search with valid source, destination and journey date", async ({
  page,
}) => {
  test.setTimeout(90000);

  await page.goto("https://www.makemytrip.com/railways/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // Close the login popup.
  const loginPopup = new LoginPopup(page);
  await loginPopup.closeIfVisible();

  // Verify source and destination.
  const sourceField = page.locator("#fromCity");
  const destinationField = page.locator("#toCity");

  await expect(sourceField).toHaveValue(/New Delhi/i);
  await expect(destinationField).toHaveValue(/Kanpur/i);

  // Submit the train search.
  const searchButton = page.getByText(/^search$/i);
  await expect(searchButton).toBeVisible();
  await searchButton.click();

  // Verify that at least one train result card appears.
  const trainResults = page.locator('[data-testid="listing-card"]');

  await expect(trainResults.first()).toBeVisible({
    timeout: 60000,
  });

  await expect(trainResults).not.toHaveCount(0);

  console.log("Train results displayed:", await trainResults.count());
});
