import { Page, Locator, expect } from "@playwright/test";

export class TrainResultsPage {
  readonly page: Page;
  readonly trainCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.trainCards = page.locator('[data-testid="listing-card"]');
  }

  async verifyResultsDisplayed(): Promise<void> {
    await expect(this.trainCards.first()).toBeVisible({
      timeout: 60000,
    });
  }

  async verifyFirstDepartureAfter(
    cutoffHour: number,
    cutoffMinute: number,
  ): Promise<void> {
    const locator = this.trainCards
      .first()
      .locator('[class*="dateTimeInfo"]')
      .first()
      .locator('span[class*="timeText"]:not([data-testid="arrival-time"])')
      .first();

    await expect(locator).toBeVisible({ timeout: 15000 });

    const text = this.cleanText(await locator.innerText());
    const actual = this.parseTime(text);
    const cutoff = cutoffHour * 60 + cutoffMinute;

    console.log(`First train departure: ${text}`);

    expect(
      actual,
      `First train departs before ${cutoffHour}:00: ${text}`,
    ).toBeGreaterThanOrEqual(cutoff);
  }

  async verifyFirstArrivalBefore(
    cutoffHour: number,
    cutoffMinute: number,
  ): Promise<void> {
    const locator = this.trainCards
      .first()
      .locator('[data-testid="arrival-time"]');

    await expect(locator).toBeVisible({ timeout: 15000 });

    const text = this.cleanText(await locator.innerText());
    const actual = this.parseTime(text);
    const cutoff = cutoffHour * 60 + cutoffMinute;

    console.log(`First train arrival: ${text}`);

    expect(
      actual,
      `First train arrives at or after ${cutoffHour}:00: ${text}`,
    ).toBeLessThan(cutoff);
  }

  async verifyFirstTrainAvailability(): Promise<void> {
    const labels = this.trainCards
      .first()
      .locator('[data-testid="availability-text"]');

    await expect(labels.first()).toBeVisible({ timeout: 15000 });

    const statuses = (await labels.allInnerTexts())
      .map((text) => this.cleanText(text))
      .filter(Boolean);

    console.log(`First train availability: ${statuses.join(" | ")}`);

    const hasAvailableStatus = statuses.some(
      (status) =>
        /\bavailable\b/i.test(status) &&
        !/\bnot available\b|\bunavailable\b/i.test(status),
    );

    expect(
      hasAvailableStatus,
      `No positive availability status found: ${statuses.join(" | ")}`,
    ).toBeTruthy();
  }

  async verifyFirstTrainClass(expectedClass: string): Promise<void> {
    const labels = this.trainCards
      .first()
      .locator('[data-testid="class-info"]');

    await expect(labels.first()).toBeVisible({ timeout: 15000 });

    const classes = (await labels.allInnerTexts()).map((text) =>
      this.cleanText(text),
    );

    console.log(`First train classes: ${classes.join(", ")}`);

    expect(
      classes,
      `Expected class ${expectedClass}; found ${classes.join(", ")}`,
    ).toContain(expectedClass);
  }

  private cleanText(value: string): string {
    return value
      .trim()
      .replace(/[,\s]+$/, "")
      .replace(/\s+/g, " ");
  }

  private parseTime(value: string): number {
    const match = this.cleanText(value).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (!match) {
      throw new Error(`Cannot parse time "${value}"`);
    }

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3].toUpperCase();

    if (hour < 1 || hour > 12 || minute > 59) {
      throw new Error(`Invalid time "${value}"`);
    }

    if (period === "AM") {
      if (hour === 12) hour = 0;
    } else if (hour !== 12) {
      hour += 12;
    }

    return hour * 60 + minute;
  }
}
