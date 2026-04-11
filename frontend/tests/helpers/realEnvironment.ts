import { randomUUID } from "node:crypto";

import { type APIRequestContext, expect, type Page } from "@playwright/test";

import data from "../fixtures/data.json";
import { loginWithEmail, registerWithEmail } from "./authJourneys";

export interface TestUser {
  displayName: string;
  email: string;
  password: string;
}

function uniqueSuffix() {
  return `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

export function createTestUser(): TestUser {
  const suffix = uniqueSuffix();

  return {
    displayName: `${data.prefixes.displayName} ${suffix}`,
    email: `${data.prefixes.emailLocalPart}.${suffix}@example.com`,
    password: data.password,
  };
}

export function createWorkspaceName() {
  return `${data.prefixes.workspace} ${uniqueSuffix()}`;
}

export function createProjectName() {
  return `${data.prefixes.project} ${uniqueSuffix()}`;
}

export function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? data.apiBaseUrl).replace(
    /\/+$/,
    "",
  );
}

export async function assertApiAvailable(request: APIRequestContext) {
  const response = await request.get(`${getApiBaseUrl()}/auth/session`);

  expect([200, 401], await response.text()).toContain(response.status());
}

export async function registerUserViaApi(
  request: APIRequestContext,
  user: TestUser,
) {
  const response = await request.post(
    `${getApiBaseUrl()}/auth/email/register`,
    {
      data: {
        display_name: user.displayName,
        email: user.email,
        password: user.password,
      },
    },
  );

  expect(response.status(), await response.text()).toBe(201);
}

export async function registerUserThroughUi(page: Page, user: TestUser) {
  await page.goto(data.routes.register);
  await registerWithEmail(page, user);
  await expect(page).toHaveURL(/\/projects$/);
}

export async function loginUserThroughUi(page: Page, user: TestUser) {
  await page.goto(data.routes.login);
  await loginWithEmail(page, user);
  await expect(page).toHaveURL(/\/projects$/);
}

export async function expectProjectHubReady(
  page: Page,
  counts?: {
    projects?: number;
    workspaces?: number;
  },
) {
  await expect(
    page.getByRole("button", { name: "Create Project" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "New Workspace" }),
  ).toBeVisible();

  if (counts?.workspaces !== undefined) {
    await expect(
      page.getByText(`Workspaces: ${counts.workspaces}`, { exact: true }),
    ).toBeVisible();
  }

  if (counts?.projects !== undefined) {
    await expect(
      page.getByText(`Projects: ${counts.projects}`, { exact: true }),
    ).toBeVisible();
  }

  const defaultWorkspaceLabel = page.getByText(/^Default workspace:/);
  await expect(defaultWorkspaceLabel).toBeVisible();
}

export async function loginFreshUserToProjects(
  page: Page,
  request: APIRequestContext,
) {
  const user = createTestUser();

  await registerUserViaApi(request, user);
  await loginUserThroughUi(page, user);
  await expectProjectHubReady(page);

  return user;
}

export async function getHubCount(
  page: Page,
  label: "Projects" | "Workspaces",
) {
  const countLabel = page.getByText(new RegExp(`^${label}:\\s*\\d+$`));
  const rawText = await countLabel.textContent();
  const match = rawText?.match(/(\d+)$/);

  if (!match) {
    throw new Error(`Unable to parse ${label} count from "${rawText ?? ""}"`);
  }

  return Number(match[1]);
}

export async function createWorkspaceThroughUi(
  page: Page,
  workspaceName: string,
) {
  await page.getByRole("button", { name: "New Workspace" }).click();

  const workspaceDialog = page.getByRole("dialog");
  await expect(
    workspaceDialog.getByRole("heading", { name: "Create New Workspace" }),
  ).toBeVisible();
  await workspaceDialog.getByLabel("Workspace Name").fill(workspaceName);
  await workspaceDialog
    .getByRole("button", { name: "Create Workspace" })
    .click();

  await expect(
    page.getByRole("heading", { name: "Create New Workspace" }),
  ).toHaveCount(0);
}
