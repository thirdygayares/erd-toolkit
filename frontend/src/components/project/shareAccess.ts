export type ShareAccessOption =
  | "onlyMe"
  | "onlySelectedPeople"
  | "anyoneWithLink";

export interface ProjectVisibilityPayload {
  visibility: "public" | "private";
  allow_anonymous_edit: boolean;
}

export function getAvailableShareAccessOptions(
  isAuthenticated: boolean,
): ShareAccessOption[] {
  if (!isAuthenticated) {
    return ["anyoneWithLink"];
  }

  return ["onlyMe", "anyoneWithLink"];
}

export function toShareAccessOption(
  visibility: "public" | "private",
): ShareAccessOption {
  return visibility === "public" ? "anyoneWithLink" : "onlyMe";
}

export function toVisibilityPayload(
  access: ShareAccessOption,
): ProjectVisibilityPayload | null {
  if (access === "onlySelectedPeople") {
    return null;
  }

  if (access === "onlyMe") {
    return {
      visibility: "private",
      allow_anonymous_edit: false,
    };
  }

  return {
    visibility: "public",
    allow_anonymous_edit: true,
  };
}
