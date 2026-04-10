import { expect, test } from "@playwright/test";

import data from "./fixtures/data.json";
import {
  expectRequiredFieldValidation,
  loginWithEmail,
  registerWithEmail,
} from "./helpers/authJourneys";
import {
  assertApiAvailable,
  createTestUser,
  expectProjectHubReady,
  registerUserViaApi,
} from "./helpers/realEnvironment";

test.describe("Authentication", () => {
  test.beforeEach(async ({ request }) => {
    await assertApiAvailable(request);
  });

  test("validated pages load with the expected entry points", async ({
    page,
  }) => {
    await page.goto(data.routes.home);
    await expect(
      page.getByRole("heading", {
        name: "Architect the data first before development gets expensive.",
      }),
    ).toBeVisible();

    await page.goto(data.routes.login);
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();

    await page.goto(data.routes.register);
    await expect(
      page.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();

    await page.goto(data.routes.projects);
    await expect(
      page.getByRole("heading", { name: "Session expired" }),
    ).toBeVisible();
  });

  test("create account supports the happy path and blocks empty required fields", async ({
    page,
  }) => {
    const user = createTestUser();

    await page.goto(data.routes.register);
    await page.getByRole("button", { name: "Create Account" }).click();

    await expectRequiredFieldValidation(page.getByLabel("Email"));
    await expectRequiredFieldValidation(page.getByLabel("Password"));

    await registerWithEmail(page, user);

    await expect(page).toHaveURL(/\/projects$/);
    await expectProjectHubReady(page);
  });

  test("login supports happy path, wrong password, and empty field validation", async ({
    page,
    request,
  }) => {
    const user = createTestUser();

    await registerUserViaApi(request, user);
    await page.goto(data.routes.login);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expectRequiredFieldValidation(page.getByLabel("Email"));
    await expectRequiredFieldValidation(page.getByLabel("Password"));

    await loginWithEmail(page, {
      email: user.email,
      password: data.wrongPassword,
    });
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();

    await loginWithEmail(page, user);

    await expect(page).toHaveURL(/\/projects$/);
    await expectProjectHubReady(page);
  });
});
