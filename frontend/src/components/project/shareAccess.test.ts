import { describe, expect, it } from "vitest";

import {
  getAvailableShareAccessOptions,
  toShareAccessOption,
  toVisibilityPayload,
} from "./shareAccess";

describe("share access mapping", () => {
  it("maps private visibility to Only me", () => {
    expect(toShareAccessOption("private")).toBe("onlyMe");
  });

  it("maps public visibility to Anyone with the link", () => {
    expect(toShareAccessOption("public")).toBe("anyoneWithLink");
  });

  it("maps Only me to private payload", () => {
    expect(toVisibilityPayload("onlyMe")).toEqual({
      visibility: "private",
      allow_anonymous_edit: false,
    });
  });

  it("maps Anyone with the link to public payload", () => {
    expect(toVisibilityPayload("anyoneWithLink")).toEqual({
      visibility: "public",
      allow_anonymous_edit: true,
    });
  });

  it("returns null for Only selected people until ACL support exists", () => {
    expect(toVisibilityPayload("onlySelectedPeople")).toBeNull();
  });

  it("shows only Anyone with the link for guests", () => {
    expect(getAvailableShareAccessOptions(false)).toEqual(["anyoneWithLink"]);
  });

  it("shows Only me and Anyone with the link for authenticated users", () => {
    expect(getAvailableShareAccessOptions(true)).toEqual([
      "onlyMe",
      "anyoneWithLink",
    ]);
  });
});
