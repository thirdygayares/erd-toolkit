import { expect, test } from "@playwright/test";

import data from "./fixtures/data.json";
import {
  assertApiAvailable,
  createProjectName,
  createWorkspaceName,
  createWorkspaceThroughUi,
  expectProjectHubReady,
  getHubCount,
  loginFreshUserToProjects,
} from "./helpers/realEnvironment";

test.describe("Project", () => {
  test.beforeEach(async ({ request }) => {
    await assertApiAvailable(request);
  });

  test("authenticated user can create, list, redirect to, and directly access a project", async ({
    page,
    request,
  }) => {
    const workspaceName = createWorkspaceName();
    const projectName = createProjectName();

    await loginFreshUserToProjects(page, request);
    const initialWorkspaceCount = await getHubCount(page, "Workspaces");
    const initialProjectCount = await getHubCount(page, "Projects");

    await createWorkspaceThroughUi(page, workspaceName);
    await expect
      .poll(() => getHubCount(page, "Workspaces"))
      .toBe(initialWorkspaceCount + 1);

    await page.getByRole("button", { name: "Create Project" }).click();

    const projectDialog = page.getByRole("dialog");
    await expect(
      projectDialog.getByRole("heading", { name: "Create New Project" }),
    ).toBeVisible();
    await projectDialog
      .getByLabel("Workspace")
      .selectOption({ label: workspaceName });
    await projectDialog.getByLabel("Project Name").fill(projectName);
    await projectDialog
      .getByLabel("Description (optional)")
      .fill(data.projectDescription);
    await projectDialog.getByLabel("Visibility").selectOption("private");
    await projectDialog.getByRole("button", { name: "Create Project" }).click();

    await expect(page).toHaveURL(/\/project\/[0-9a-f-]+$/);
    const projectId = page.url().split("/project/")[1];

    await expect(page.getByTitle("Double-click to rename project")).toHaveText(
      projectName,
    );

    await page.goto(data.routes.projects);
    await expectProjectHubReady(page);
    await expect
      .poll(() => getHubCount(page, "Projects"))
      .toBe(initialProjectCount + 1);
    await expect(page.getByText(projectName, { exact: true })).toHaveCount(1);

    await page.goto(`/project/${projectId}`);
    await expect(page).toHaveURL(new RegExp(`/project/${projectId}$`));
    await expect(page.getByTitle("Double-click to rename project")).toHaveText(
      projectName,
    );
  });
});
