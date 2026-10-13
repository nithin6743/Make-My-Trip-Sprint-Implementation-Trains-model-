import { test, expect, Page } from "@playwright/test";
import * as XLSX from "xlsx";
import path from "path";
import { LoginPopup } from "./pages/LoginPopup";

const excelFilePath = path.resolve(
  __dirname,
  "test-data",
  "TC-07-pnr-data.xlsx",
);

const expectedMessage = "This PNR is either not generated or flushed";

// Step 1: Read PNR values from the first Excel worksheet.
function readPnrData(): string[] {
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("The Excel workbook contains no worksheets.");
  }

  console.log(`Reading PNR data from worksheet: ${sheetName}`);

  const worksheet = workbook.Sheets[sheetName];

  const rows: { PNR?: string | number }[] = XLSX.utils.sheet_to_json(
    worksheet,
    {
      defval: "",
    },
  );

  const pnrList = rows
    .map((row) => String(row.PNR ?? "").trim())
    .filter((pnr) => /^\d{10}$/.test(pnr));

  if (pnrList.length === 0) {
    throw new Error(
      `No 10-digit PNR values found in worksheet "${sheetName}". ` +
        "Check that the column header is PNR.",
    );
  }

  return pnrList;
}

// Step 2: Select one random PNR from Excel.
function getRandomPnr(): string {
  const pnrList = readPnrData();
  const randomIndex = Math.floor(Math.random() * pnrList.length);

  return pnrList[randomIndex];
}

// Step 3: Navigate from Flights to Check PNR Status.
async function navigateToPnrStatus(page: Page): Promise<void> {
  await page.goto("https://www.makemytrip.com/flights/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // Close the login popup if visible.
  const loginPopup = new LoginPopup(page);
  await loginPopup.closeIfVisible();

  // Navigate to Trains.
  await page
    .getByRole("link", { name: /^Trains$/i })
    .first()
    .click();

  await expect(page).toHaveURL(/railways/i, {
    timeout: 30000,
  });

  // Select Check PNR Status.
  const pnrStatusOption = page.getByText("Check PNR Status", {
    exact: true,
  });

  await expect(pnrStatusOption).toBeVisible({
    timeout: 30000,
  });

  await pnrStatusOption.click();

  // Verify that the PNR input is available.
  await expect(page.locator("#pnr")).toBeVisible({
    timeout: 30000,
  });
}

test.describe("TC-07 - Excel-driven PNR validation", () => {
  test("Verify a random 10-digit PNR displays the expected response", async ({
    page,
  }) => {
    test.setTimeout(120000);

    // Step 4: Get a random PNR from Excel.
    const pnr = getRandomPnr();

    console.log(`Selected PNR from Excel: ${pnr}`);

    // Step 5: Open the PNR Status section.
    await navigateToPnrStatus(page);

    // Step 6: Enter the PNR.
    const pnrInput = page.locator("#pnr");

    await pnrInput.fill(pnr);
    await expect(pnrInput).toHaveValue(pnr);

    // Step 7: Click the CHECK STATUS anchor element.
    const checkStatusLink = page.locator('a[data-cy="checkStatusButton"]');

    await expect(checkStatusLink).toBeVisible({
      timeout: 15000,
    });

    await checkStatusLink.click();

    // Step 8: Wait for the error response card.
    const errorCard = page.locator(".card.textCenter.errorCard");

    await expect(errorCard).toBeVisible({
      timeout: 45000,
    });

    // Step 9: Verify the PNR in the response paragraph.
    // The same data-cy attribute also exists on an input,
    // so target the paragraph specifically to avoid strict mode errors.
    const displayedPnr = page.locator('p[data-cy="pnrNumber"]');

    await expect(displayedPnr).toContainText(pnr, {
      timeout: 15000,
    });

    // Step 10: Verify the exact website response.
    const responseMessage = page.locator('[data-cy="pnrFlushedTxt"]');

    await expect(responseMessage).toHaveText(expectedMessage, {
      timeout: 15000,
    });

    console.log(`PASS: Displayed PNR matches ${pnr}.`);
    console.log(`PASS: Response message matches "${expectedMessage}".`);
  });
});
