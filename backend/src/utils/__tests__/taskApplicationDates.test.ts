import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  APPLICATION_WINDOW_NOT_YET_OPEN_FILTER,
  applicationWindowActiveFilter,
  applicationWindowApplyBlockMessage,
  buildApplicationWindowStatusFilters,
  getApplicationWindowStatus,
  isApplicationWindowOpen,
} from "../taskApplicationDates.js";

const today = new Date("2026-06-11T12:00:00");

describe("application window status", () => {
  it("treats unset dates as always open", () => {
    assert.equal(getApplicationWindowStatus(undefined, undefined, today), "open");
    assert.equal(isApplicationWindowOpen(undefined, undefined, today), true);
    assert.equal(applicationWindowApplyBlockMessage(undefined, undefined, today), null);
  });

  it("blocks before open date", () => {
    const futureOpen = new Date("2026-06-15");
    assert.equal(getApplicationWindowStatus(futureOpen, undefined, today), "not_yet_open");
    assert.equal(
      applicationWindowApplyBlockMessage(futureOpen, undefined, today),
      "Applications are not open yet.",
    );
  });

  it("blocks after close date", () => {
    const pastClose = new Date("2026-06-01");
    assert.equal(getApplicationWindowStatus(undefined, pastClose, today), "closed");
    assert.equal(
      applicationWindowApplyBlockMessage(undefined, pastClose, today),
      "Applications for this task have closed.",
    );
  });

  it("allows when today is inside the window", () => {
    const open = new Date("2026-06-01");
    const close = new Date("2026-06-30");
    assert.equal(getApplicationWindowStatus(open, close, today), "open");
    assert.equal(isApplicationWindowOpen(open, close, today), true);
  });

  it("includes open and close boundaries on the calendar day", () => {
    const openToday = new Date("2026-06-11");
    const closeToday = new Date("2026-06-11");
    assert.equal(getApplicationWindowStatus(openToday, closeToday, today), "open");
  });
});

describe("applicationWindowActiveFilter", () => {
  it("returns a compound filter for open and close bounds", () => {
    const filter = applicationWindowActiveFilter(today) as { $and: unknown[] };
    assert.ok(Array.isArray(filter.$and));
    assert.equal(filter.$and.length, 2);
  });
});

describe("buildApplicationWindowStatusFilters", () => {
  it("maps NotYetOpen to published and pending tasks with a future application open date", () => {
    const { isApplicationWindowFilter, filters } =
      buildApplicationWindowStatusFilters(APPLICATION_WINDOW_NOT_YET_OPEN_FILTER, {
        now: today,
      });
    assert.equal(isApplicationWindowFilter, true);
    assert.equal(filters.length, 1);
    assert.deepEqual(filters[0], {
      status: { $in: ["Published", "Pending"] },
      applicationOpenDate: { $gt: new Date("2026-06-11T23:59:59.999") },
    });
  });

  it("passes lifecycle statuses through unchanged", () => {
    const { isApplicationWindowFilter, filters } =
      buildApplicationWindowStatusFilters("Pending", { now: today });
    assert.equal(isApplicationWindowFilter, false);
    assert.deepEqual(filters, [{ status: "Pending" }]);
  });
});
