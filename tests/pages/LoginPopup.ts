import { Page, Locator, expect } from "@playwright/test";

export class LoginPopup {
  readonly page: Page;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.closeButton = page.locator('[data-cy="closeModal"]:visible').first();
  }

  async closeIfVisible(): Promise<void> {
    try {
      await this.closeButton.waitFor({
        state: "visible",
        timeout: 10000,
      });
    } catch {
      // No visible login popup appeared within 10 seconds.
      return;
    }

    console.log("Login popup detected. Closing it.");

    await this.closeButton.click({ timeout: 10000 });

    await expect(this.closeButton).toBeHidden({
      timeout: 10000,
    });

    console.log("Login popup closed successfully.");
  }
}
