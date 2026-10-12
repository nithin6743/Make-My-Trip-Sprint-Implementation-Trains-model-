import { test, expect } from "@playwright/test";
import { LoginPopup } from "./pages/LoginPopup";

test("TC-08 - Verify the 65th day cannot be selected", async ({ page }) => {
  test.setTimeout(120000);

  // Step 1: Open MakeMyTrip and navigate to Trains.
  await page.goto("https://www.makemytrip.com/flights/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  const loginPopup = new LoginPopup(page);
  await loginPopup.closeIfVisible();

  await page
    .getByRole("link", { name: /^Trains$/i })
    .first()
    .click();
  await expect(page).toHaveURL(/railways/i);

  // Step 2: Open the journey-date calendar.
  const journeyDateField = page.locator("#travelDate");
  await expect(journeyDateField).toBeVisible({ timeout: 30000 });

  const originalDate = await journeyDateField.inputValue();

  await journeyDateField.click();

  const calendar = page.locator(".DayPicker");
  await expect(calendar).toBeVisible();

  // Step 3: Calculate the 65th day, counting today as day 1.
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number);

  const [year, month, day] = dateParts;
  const today = new Date(Date.UTC(year, month - 1, day));

  const targetDate = new Date(today);
  targetDate.setUTCDate(targetDate.getUTCDate() + 64);

  const targetLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(targetDate);

  console.log(`TC-08 target date: ${targetLabel}`);

  // Step 4: Find the exact date in the displayed calendar.
  // Example accessible name: "Wed Dec 16 2026".
  const targetCell = calendar.getByRole("gridcell", {
    name: targetLabel.replace(
      /^(\w+),\s+(\w+)\s+(\d+),\s+(\d+)$/,
      "$1 $2 $3 $4",
    ),
    exact: true,
  });

  await expect(
    targetCell,
    `The 65th day (${targetLabel}) must be displayed`,
  ).toHaveCount(1);

  // Step 5: Confirm the date is actually disabled.
  await expect(targetCell).toBeDisabled();

  console.log("The 65th day is disabled as expected.");

  // Step 6: Attempt to click the disabled date.
  let clickBlocked = false;

  try {
    await targetCell.click({ timeout: 3000 });
  } catch {
    clickBlocked = true;
  }

  expect(
    clickBlocked,
    "Playwright should not be able to click the disabled 65th day",
  ).toBe(true);

  // Step 7: Confirm the selected date did not change.
  await expect(journeyDateField).toHaveValue(originalDate);

  console.log(
    "TC-08 PASS: The 65th day is disabled, the click is blocked, and the journey date remains unchanged.",
  );
});
