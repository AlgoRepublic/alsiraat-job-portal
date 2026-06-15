import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  pickPreferredPlatformOrganisation,
  serializeOrganisationForPayload,
} from "./platformOrganisation.js";

describe("platformOrganisation", () => {
  it("pickPreferredPlatformOrganisation prefers Al Siraat over Central", () => {
    const picked = pickPreferredPlatformOrganisation([
      { _id: "1", name: "Partner", isCentralOrg: false, isAlSiraatOrg: false },
      { _id: "2", name: "Central", isCentralOrg: true, isAlSiraatOrg: false },
      { _id: "3", name: "College", isCentralOrg: false, isAlSiraatOrg: true },
    ]);
    assert.equal(picked?._id, "3");
  });

  it("pickPreferredPlatformOrganisation falls back to Central", () => {
    const picked = pickPreferredPlatformOrganisation([
      { _id: "1", name: "Partner", isCentralOrg: false, isAlSiraatOrg: false },
      { _id: "2", name: "Central", isCentralOrg: true, isAlSiraatOrg: false },
    ]);
    assert.equal(picked?._id, "2");
  });

  it("serializeOrganisationForPayload includes flags", () => {
    const out = serializeOrganisationForPayload({
      _id: "abc",
      name: "Test",
      isCentralOrg: true,
      isAlSiraatOrg: false,
    });
    assert.equal(out?.isCentralOrg, true);
    assert.equal(out?.isAlSiraatOrg, false);
  });
});
