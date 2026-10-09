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

  // Handle the login popup in every browser.
  const loginPopup = new LoginPopup(page);
  await loginPopup.closeIfVisible();

  // Verify the journey fields.
  const sourceField = page.locator("#fromCity");
  const destinationField = page.locator("#toCity");

  await expect(sourceField).toBeVisible();
  await expect(destinationField).toBeVisible();

  await expect(sourceField).toHaveValue(/New Delhi/i);
  await expect(destinationField).toHaveValue(/Kanpur/i);

  // Submit the train search.
  const searchButton = page.getByText("Search", { exact: true });
  await expect(searchButton).toBeVisible();
  await searchButton.click();

  // Allow the results page to update.
  await expect(page).toHaveURL(/makemytrip\.com/i, {
    timeout: 60000,
  });

  await page.screenshot({
    path: "test-results/TC-01-after-search.png",
    fullPage: false,
  });
});
