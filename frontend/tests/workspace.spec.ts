import { expect, test } from "@playwright/test";

import {
  assertApiAvailable,
  createWorkspaceName,
  createWorkspaceThroughUi,
  expectProjectHubReady,
  getHubCount,
  loginFreshUserToProjects,
} from "./helpers/realEnvironment";

test.describe("Workspace", () => {
  test.beforeEach(async ({ request }) => {
    await assertApiAvailable(request);
  });

  test("authenticated user can create a workspace with unique data", async ({
    page,
    request,
  }) => {
    const workspaceName = createWorkspaceName();

    await loginFreshUserToProjects(page, request);
    const initialWorkspaceCount = await getHubCount(page, "Workspaces");

    await createWorkspaceThroughUi(page, workspaceName);

    await expectProjectHubReady(page, { projects: 0 });
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
    await projectDialog.getByRole("button", { name: "Cancel" }).click();
  });
});
