"use client";

export const authStorageKeys = {
  workspaceId: "ERD_WORKSPACE_ID",
  projectId: "ERD_PROJECT_ID",
  diagramId: "ERD_DIAGRAM_ID",
  shareSlug: "ERD_SHARE_SLUG",
} as const;

export interface StoredProjectContext {
  workspaceId: string | null;
  projectId: string | null;
  diagramId: string | null;
  shareSlug: string | null;
}

function getStorageValue(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(key);
  return value?.trim() ? value : null;
}

function setStorageValue(key: string, value: string | null | undefined) {
  if (typeof window === "undefined") {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, value);
}

export function getStoredProjectContext(): StoredProjectContext {
  return {
    workspaceId: getStorageValue(authStorageKeys.workspaceId),
    projectId: getStorageValue(authStorageKeys.projectId),
    diagramId: getStorageValue(authStorageKeys.diagramId),
    shareSlug: getStorageValue(authStorageKeys.shareSlug),
  };
}

export function setStoredProjectContext(
  context: Partial<StoredProjectContext>,
): StoredProjectContext {
  const current = getStoredProjectContext();
  const next = {
    workspaceId:
      "workspaceId" in context
        ? (context.workspaceId ?? null)
        : current.workspaceId,
    projectId:
      "projectId" in context ? (context.projectId ?? null) : current.projectId,
    diagramId:
      "diagramId" in context ? (context.diagramId ?? null) : current.diagramId,
    shareSlug:
      "shareSlug" in context ? (context.shareSlug ?? null) : current.shareSlug,
  };

  setStorageValue(authStorageKeys.workspaceId, next.workspaceId);
  setStorageValue(authStorageKeys.projectId, next.projectId);
  setStorageValue(authStorageKeys.diagramId, next.diagramId);
  setStorageValue(authStorageKeys.shareSlug, next.shareSlug);

  return next;
}

export function clearStoredProjectContext() {
  if (typeof window === "undefined") {
    return;
  }

  Object.values(authStorageKeys).forEach((storageKey) => {
    window.localStorage.removeItem(storageKey);
  });
}

export function getStoredShareSlug(): string | null {
  return getStorageValue(authStorageKeys.shareSlug);
}

export function getStoredProjectId(): string | null {
  return getStorageValue(authStorageKeys.projectId);
}

export function getBrowserCookie(cookieName: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";").map((value) => value.trim());
  const match = cookies.find((value) => value.startsWith(`${cookieName}=`));
  if (!match) {
    return null;
  }
  return decodeURIComponent(match.slice(cookieName.length + 1));
}
