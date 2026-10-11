import { test, expect, Locator } from "@playwright/test";
import { LoginPopup } from "./pages/LoginPopup";

test("TC-05 - Verify trains displayed based on selected search criteria", async ({
  page,
}) => {
  test.setTimeout(180000);

  // Step 1: Open MakeMyTrip.
  await page.goto("https://www.makemytrip.com/flights", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // Step 2: Close the login popup if visible.
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

  // Step 4: Locate the search fields.
  const sourceField = page.locator("#fromCity");
  const destinationField = page.locator("#toCity");
  const journeyDateField = page.locator("#travelDate");
  const searchButton = page.locator('a[data-cy="submit"]');
  const calendar = page.locator(".DayPicker");

  await expect(sourceField).toBeVisible({ timeout: 30000 });
  await expect(destinationField).toBeVisible({
    timeout: 15000,
  });
  await expect(journeyDateField).toBeVisible({
    timeout: 15000,
  });

  // Step 5: Verify the expected source and destination.
  await expect(sourceField).toHaveValue(/New Delhi/i);
  await expect(destinationField).toHaveValue(/Kanpur/i);

  // Step 6: Calculate tomorrow using India's current date.
  const indiaDateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/,/g, "");

  const [year, month, day] = indiaDateParts.split("-").map(Number);

  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));

  const tomorrowLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
    .format(tomorrow)
    .replace(/,/g, "");

  console.log("Selected route: New Delhi to Kanpur");
  console.log("Target journey date:", tomorrowLabel);

  // Step 7: Open the journey-date calendar.
  await journeyDateField.click();
  await expect(calendar).toBeVisible({ timeout: 10000 });

  const findDateCell = (label: string): Locator =>
    calendar
      .getByRole("gridcell", {
        name: label,
        exact: true,
      })
      .first();

  let tomorrowCell = findDateCell(tomorrowLabel);
  const nextMonthButton = page.locator(".DayPicker-NavButton--next");

  // Navigate if tomorrow is not currently rendered.
  for (let monthStep = 0; monthStep < 3; monthStep++) {
    if ((await tomorrowCell.count()) > 0) {
      break;
    }

    if (!(await nextMonthButton.isVisible().catch(() => false))) {
      break;
    }

    await nextMonthButton.click();
    await expect(calendar).toBeVisible();

    tomorrowCell = findDateCell(tomorrowLabel);
  }

  tomorrowCell = findDateCell(tomorrowLabel);

  await expect(tomorrowCell).toHaveCount(1);
  await expect(tomorrowCell).toBeEnabled();

  // Step 8: Select tomorrow's journey date.
  await tomorrowCell.click();

  console.log("Journey date selected:", tomorrowLabel);

  // Step 9: Select All Class from the Class dropdown.
  const classField = page.locator("#travelClass");
  const classWidget = page.locator('label[for="travelClass"]');
  const classDropdown = page.locator("ul.travelForPopup:visible");
  const allClassOption = classDropdown.locator('li[data-cy="ALL"]');

  await expect(classField).toBeVisible({ timeout: 10000 });
  await expect(classWidget).toBeVisible({ timeout: 10000 });
  await expect(classDropdown).toBeVisible({ timeout: 10000 });
  await expect(allClassOption).toBeVisible();

  await allClassOption.click();

  await expect(classField).toHaveValue("ALL");
  await expect(classDropdown).toBeHidden({ timeout: 10000 });

  console.log("Travel class selected: All Class");

  // Step 10: Search trains.
  await expect(searchButton).toBeVisible({ timeout: 15000 });
  await searchButton.click({ timeout: 15000 });

  // Step 11: Verify train results.
  const trainResults = page.locator('[data-testid="listing-card"]');

  await expect(trainResults.first()).toBeVisible({
    timeout: 60000,
  });

  await expect(trainResults).not.toHaveCount(0);

  console.log("Train results displayed:", await trainResults.count());
});
