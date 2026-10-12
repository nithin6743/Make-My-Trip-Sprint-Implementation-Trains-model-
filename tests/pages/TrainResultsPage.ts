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

    expect(await this.trainCards.count()).toBeGreaterThan(0);
  }

  async getFirstDepartureTimes(limit: number): Promise<string[]> {
    const count = Math.min(await this.trainCards.count(), limit);
    const times: string[] = [];

    for (let i = 0; i < count; i++) {
      const departureTime = this.trainCards
        .nth(i)
        .locator('[class*="dateTimeInfo"]')
        .first()
        .locator('span[class*="timeText"]:not([data-testid="arrival-time"])')
        .first();

      await expect(departureTime).toBeVisible({
        timeout: 10000,
      });

      times.push(this.cleanText(await departureTime.innerText()));
    }

    return times;
  }

  async verifyDepartureAfter(
    hour: number,
    minute: number,
    limit: number,
  ): Promise<void> {
    const times = await this.getFirstDepartureTimes(limit);

    expect(times.length).toBeGreaterThan(0);

    const cutoff = hour * 60 + minute;
    const failures: string[] = [];

    times.forEach((time, index) => {
      if (this.parseTime(time) < cutoff) {
        failures.push(`Train ${index + 1}: ${time}`);
      }
    });

    expect(
      failures,
      `Trains departing before the cutoff:\n${failures.join("\n")}`,
    ).toEqual([]);
  }

  async verifyArrivalBefore(
    hour: number,
    minute: number,
    limit: number,
  ): Promise<void> {
    const count = Math.min(await this.trainCards.count(), limit);

    expect(count).toBeGreaterThan(0);

    const cutoff = hour * 60 + minute;
    const failures: string[] = [];

    for (let i = 0; i < count; i++) {
      const arrivalTime = this.trainCards
        .nth(i)
        .locator('[data-testid="arrival-time"]');

      await expect(arrivalTime).toBeVisible({
        timeout: 10000,
      });

      const time = this.cleanText(await arrivalTime.innerText());

      if (this.parseTime(time) >= cutoff) {
        failures.push(`Train ${i + 1}: ${time}`);
      }
    }

    expect(
      failures,
      `Trains arriving at or after the cutoff:\n${failures.join("\n")}`,
    ).toEqual([]);
  }

  async verifyAvailability(limit: number): Promise<void> {
    const count = Math.min(await this.trainCards.count(), limit);
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const labels = this.trainCards
        .nth(i)
        .locator('[data-testid="availability-text"]');

      const labelCount = await labels.count();
      expect(
        labelCount,
        `Train ${i + 1} has no availability labels`,
      ).toBeGreaterThan(0);

      const statuses = (await labels.allInnerTexts())
        .map((text) => text.trim())
        .filter(Boolean);

      console.log(`Train ${i + 1} availability: ${statuses.join(" | ")}`);

      expect(
        statuses.some(
          (status) =>
            /available/i.test(status) &&
            !/not available|unavailable/i.test(status),
        ),
        `Train ${i + 1} has no positive availability status: ${statuses.join(" | ")}`,
      ).toBeTruthy();
    }
  }

  async verifyJourneyClass(
    expectedClass: string,
    limit: number,
  ): Promise<void> {
    const count = Math.min(await this.trainCards.count(), limit);

    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const classLocators = this.trainCards
        .nth(i)
        .locator('[data-testid="class-info"]');

      await expect(classLocators.first()).toBeVisible({
        timeout: 10000,
      });

      const availableClasses = (await classLocators.allInnerTexts()).map(
        (value) => this.cleanText(value),
      );

      console.log(`Train ${i + 1} classes: ${availableClasses.join(", ")}`);

      expect(
        availableClasses,
        `Train ${i + 1} does not contain journey class ${expectedClass}. Found: ${availableClasses.join(", ")}`,
      ).toContain(expectedClass);
    }
  }

  private cleanText(value: string): string {
    return value
      .trim()
      .replace(/[,\s]+$/, "")
      .replace(/\s+/g, " ");
  }

  private parseTime(value: string): number {
    const normalized = this.cleanText(value);
    const match = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (!match) {
      throw new Error(
        `Unable to parse time "${value}". Expected format such as "06:30 PM".`,
      );
    }

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3].toUpperCase();

    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
      throw new Error(`Invalid time value: "${value}"`);
    }

    if (period === "AM") {
      if (hour === 12) {
        hour = 0;
      }
    } else if (hour !== 12) {
      hour += 12;
    }

    return hour * 60 + minute;
  }
}
