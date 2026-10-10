import { test, expect, Locator } from "@playwright/test";
import { LoginPopup } from "./pages/LoginPopup";

test("TC-02 - Verify Journey Date Within Permitted Future Booking Period", async ({
  page,
}) => {
  test.setTimeout(180000);

  // Step 1: Open MakeMyTrip homepage.
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

  const journeyDateField = page.locator("#travelDate");
  const calendar = page.locator(".DayPicker");
  const classDropdown = page.locator("ul.travelForPopup");

  await expect(journeyDateField).toBeVisible({
    timeout: 30000,
  });

  // Step 4: Calculate dates using India's current calendar date.
  const indiaDateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [year, month, day] = indiaDateParts.split("-").map(Number);
  const today = new Date(Date.UTC(year, month - 1, day));

  // Observed MakeMyTrip behavior: today + 63 days is selectable.
  const lastPermittedDate = new Date(today);
  lastPermittedDate.setUTCDate(lastPermittedDate.getUTCDate() + 63);

  // The following day is expected to be disabled.
  const firstOutsideDate = new Date(lastPermittedDate);
  firstOutsideDate.setUTCDate(firstOutsideDate.getUTCDate() + 1);

  // Remove ALL commas to match calendar accessible names,
  // for example: "Sat Dec 12 2026".
  const formatCalendarLabel = (date: Date): string =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
      .format(date)
      .replace(/,/g, "");

  const lastPermittedLabel = formatCalendarLabel(lastPermittedDate);

  const firstOutsideLabel = formatCalendarLabel(firstOutsideDate);

  console.log("India current date:", indiaDateParts);
  console.log("Expected last selectable date:", lastPermittedLabel);
  console.log("Expected first disabled date:", firstOutsideLabel);

  // Step 5: Open the journey-date calendar.
  await journeyDateField.click();
  await expect(calendar).toBeVisible();

  const nextMonthButton = page.locator(".DayPicker-NavButton--next");

  // Use accessible roles rather than matching aria-label text
  // through a CSS selector.
  const findDateCell = (label: string): Locator =>
    calendar.getByRole("gridcell", { name: label, exact: true }).first();

  let lastPermittedCell = findDateCell(lastPermittedLabel);
  let outsideCell = findDateCell(firstOutsideLabel);

  // Step 6: Navigate until both dates are rendered.
  for (let monthStep = 0; monthStep < 8; monthStep++) {
    const permittedVisible = (await lastPermittedCell.count()) > 0;

    const outsideVisible = (await outsideCell.count()) > 0;

    if (permittedVisible && outsideVisible) {
      break;
    }

    if (!(await nextMonthButton.isVisible().catch(() => false))) {
      break;
    }

    await nextMonthButton.click();
    await expect(calendar).toBeVisible();

    lastPermittedCell = findDateCell(lastPermittedLabel);
    outsideCell = findDateCell(firstOutsideLabel);
  }

  // Re-query after navigation.
  lastPermittedCell = findDateCell(lastPermittedLabel);
  outsideCell = findDateCell(firstOutsideLabel);

  await expect(
    lastPermittedCell,
    `Expected ${lastPermittedLabel} to appear in the calendar`,
  ).toHaveCount(1);

  await expect(
    outsideCell,
    `Expected ${firstOutsideLabel} to appear in the calendar`,
  ).toHaveCount(1);

  // Step 7: Validate the permitted booking boundary.
  await expect(lastPermittedCell).toBeEnabled();
  await expect(outsideCell).toBeDisabled();

  console.log(`${lastPermittedLabel} is selectable.`);
  console.log(`${firstOutsideLabel} is disabled.`);

  // Step 8: Select the last permitted journey date.
  await lastPermittedCell.click();
  await expect(calendar).toBeHidden();

  console.log("Selected journey date:", lastPermittedLabel);

  // Step 9: Close the class dropdown if it is open.
  if (await classDropdown.isVisible().catch(() => false)) {
    const bookingHeading = page.getByRole("heading", {
      name: /train ticket booking/i,
    });

    if (await bookingHeading.isVisible().catch(() => false)) {
      await bookingHeading.click();
    } else {
      await page.locator("body").click({
        position: { x: 10, y: 10 },
      });
    }

    await expect(classDropdown).toBeHidden({
      timeout: 10000,
    });
  }

  // Ensure the calendar is closed before searching.
  if (await calendar.isVisible().catch(() => false)) {
    const bookingHeading = page.getByRole("heading", {
      name: /train ticket booking/i,
    });

    if (await bookingHeading.isVisible().catch(() => false)) {
      await bookingHeading.click();
    } else {
      await journeyDateField.click();
    }

    await expect(calendar).toBeHidden({
      timeout: 10000,
    });
  }

  // Step 10: Search trains.
  const searchButton = page.locator('a[data-cy="submit"]');

  await expect(searchButton).toBeVisible({
    timeout: 30000,
  });

  await searchButton.click();

  // Step 11: Verify train results.
  const trainResults = page.locator('[data-testid="listing-card"]');

  await expect(trainResults.first()).toBeVisible({
    timeout: 60000,
  });

  await expect(trainResults).not.toHaveCount(0);

  console.log("Train results displayed:", await trainResults.count());
});
