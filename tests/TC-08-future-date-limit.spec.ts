import { test, expect } from "@playwright/test";
import { LoginPopup } from "./pages/LoginPopup";

test("TC-08 - Verify the 65th day is disabled", async ({ page }) => {
  test.setTimeout(60000);

  // Step 1: Open MakeMyTrip.
  await page.goto("https://www.makemytrip.com/flights/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // Step 2: Close the login popup if visible.
  const loginPopup = new LoginPopup(page);
  await loginPopup.closeIfVisible();

  // Step 3: Navigate to Trains.
  await page
    .getByRole("link", { name: /^Trains$/i })
    .first()
    .click();
  await expect(page).toHaveURL(/railways/i);

  // Step 4: Open the journey-date calendar.
  const journeyDateField = page.locator("#travelDate");
  await expect(journeyDateField).toBeVisible({ timeout: 30000 });
  await journeyDateField.click();

  const calendar = page.locator(".DayPicker").first();
  await expect(calendar).toBeVisible();

  // Step 5: Calculate the 65th day.
  // Today is day 1, so add 64 days.
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
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  })
    .format(targetDate)
    .replace(/,/g, "");

  const targetMonthLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(targetDate);

  console.log(`TC-08 target date: ${targetLabel}`);
  console.log(`Target month: ${targetMonthLabel}`);

  // Step 6: Navigate forward month by month until the target month
  // is displayed. Click only the calendar navigation arrow.
  const nextMonthButton = page.locator(
    ".DayPicker-NavButton--next:not(.DayPicker-NavButton--interactionDisabled)",
  );

  for (let attempt = 0; attempt < 4; attempt++) {
    const targetMonthVisible = await calendar
      .getByText(targetMonthLabel, { exact: true })
      .count();

    if (targetMonthVisible > 0) {
      break;
    }

    await expect(
      nextMonthButton,
      "Next Month navigation must be available",
    ).toBeVisible();

    await nextMonthButton.click();
  }

  // Confirm the target month was reached.
  await expect(
    calendar.getByText(targetMonthLabel, { exact: true }),
    `Calendar must display ${targetMonthLabel}`,
  ).toBeVisible();

  // Step 7: Locate the 65th-day cell.
  const targetCell = calendar.locator(
    `.DayPicker-Day[aria-label="${targetLabel}"]`,
  );

  await expect(
    targetCell,
    `The 65th day (${targetLabel}) must be displayed`,
  ).toHaveCount(1);

  // Step 8: PASS only if the disabled CSS class is present.
  await expect(
    targetCell,
    `The 65th day (${targetLabel}) must have DayPicker-Day--disabled`,
  ).toHaveClass(/DayPicker-Day--disabled/);

  console.log(`PASS: ${targetLabel} has the DayPicker-Day--disabled class.`);
});
