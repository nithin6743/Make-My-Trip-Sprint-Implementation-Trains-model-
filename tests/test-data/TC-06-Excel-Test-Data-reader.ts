import * as XLSX from "xlsx";
import path from "path";

export interface FilterScenario {
  testCaseId: string;
  filterName: string;
  filterSelector: string;
  expectedValue: string;
  enabled: boolean;
}

export function getEnabledFilterScenarios(): FilterScenario[] {
  const workbookPath = path.resolve(
    process.cwd(),
    "tests",
    "test-data",
    "TC-06-Excel-Test-Data.xlsx",
  );

  const workbook = XLSX.readFile(workbookPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!worksheet) {
    throw new Error("No worksheet found in the TC-06 Excel workbook.");
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });

  const scenarios: FilterScenario[] = rows
    .filter((row) => String(row["TestCaseID"] ?? "").trim() !== "")
    .map((row, index) => {
      const testCaseId = String(row["TestCaseID"]).trim();
      const filterName = String(row["FilterName"] ?? "").trim();
      const filterSelector = String(row["FilterSelector"] ?? "").trim();
      const expectedValue = String(row["ExpectedValue"] ?? "")
        .trim()
        .toLowerCase();
      const enabledValue = String(row["Enabled"] ?? "")
        .trim()
        .toLowerCase();

      if (!filterName || !filterSelector || !expectedValue) {
        throw new Error(`Excel row ${index + 2} is missing a required value.`);
      }

      return {
        testCaseId,
        filterName,
        filterSelector,
        expectedValue,
        enabled: ["yes", "true", "1"].includes(enabledValue),
      };
    });

  const enabledScenarios = scenarios.filter((scenario) => scenario.enabled);

  if (enabledScenarios.length === 0) {
    throw new Error("No enabled filter scenarios found in Excel.");
  }

  console.log(
    "Enabled scenarios from Excel:",
    enabledScenarios.map((scenario) => scenario.testCaseId).join(", "),
  );

  return enabledScenarios;
}
