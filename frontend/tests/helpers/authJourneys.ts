import { expect, type Locator, type Page } from "@playwright/test";

interface RegisterWithEmailInput {
  displayName?: string;
  email: string;
  password: string;
}

interface LoginWithEmailInput {
  email: string;
  password: string;
}

export async function registerWithEmail(
  page: Page,
  input: RegisterWithEmailInput,
) {
  if (input.displayName !== undefined) {
    await page.getByLabel("Display name").fill(input.displayName);
  }

  await page.getByLabel("Email").fill(input.email);
  await page.getByLabel("Password").fill(input.password);
  await page.getByRole("button", { name: "Create Account" }).click();
}

export async function loginWithEmail(page: Page, input: LoginWithEmailInput) {
  await page.getByLabel("Email").fill(input.email);
  await page.getByLabel("Password").fill(input.password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

export async function expectRequiredFieldValidation(locator: Locator) {
  await expect
    .poll(async () => {
      return locator.evaluate((field) => {
        const formField = field as HTMLInputElement;
        return formField.required;
      });
    })
    .toBe(true);

  await expect
    .poll(async () => {
      return locator.evaluate((field) => {
        const formField = field as HTMLInputElement;
        return formField.matches(":invalid");
      });
    })
    .toBe(true);
}
