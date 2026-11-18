import { examAnswers, toggleChoice, unanswered, filterRows, needsGrade, readyToPublish, safeLink, scoreError, submitLabel, type TargetRow } from "../homeworkRules";

const row = (p: Partial<TargetRow>): TargetRow => ({ student_id: "s", name: "أ", sub: null, atts: [], grade: null, ...p });
const sub = (status: string, n = 1) => ({ id: "x", status, attempt_count: n });

describe("homework grading rules", () => {
  test("a submitted, ungraded attempt needs grading", () => expect(needsGrade(row({ sub: sub("submitted") }))).toBe(true));
  test("a returned submission does not need grading", () => expect(needsGrade(row({ sub: sub("returned") }))).toBe(false));
  test("no attempt is not counted as needing a grade (never becomes zero)", () => expect(needsGrade(row({ sub: sub("draft", 0) }))).toBe(false));
  test("a test result publishes only after approval", () => {
    const g = { id: "g", status: "graded" };
    expect(readyToPublish(row({ grade: g }), true)).toBe(false);
    expect(readyToPublish(row({ grade: { ...g, exam_approved_at: "t" } }), true)).toBe(true);
    expect(readyToPublish(row({ grade: g }), false)).toBe(true);
  });
  test("pending late joiners are hidden from the list", () => {
    expect(filterRows([row({ join_status: "pending" }), row({})], "all", false)).toHaveLength(1);
  });
  test("score must be between 0 and the maximum", () => {
    expect(scoreError("11", 10)).not.toBeNull();
    expect(scoreError("-1", 10)).not.toBeNull();
    expect(scoreError("7.5", 10)).toBeNull();
  });
  test("only web links open", () => {
    expect(safeLink("javascript:alert(1)")).toBeNull();
    expect(safeLink("https://a.sa/x")).toBe("https://a.sa/x");
  });
  test("button says resubmit after the first attempt", () => expect(submitLabel(1)).toBe("إعادة التسليم"));
});

describe("online test answers", () => {
  const qs = [{ type: "single" }, { type: "multiple" }, { type: "essay" }];
  test("unanswered questions are sent empty in question order", () => expect(examAnswers(qs, { 0: [2] })).toEqual([[2], [], ""]));
  test("single choice keeps only the latest option", () => expect(toggleChoice("single", [1], 3)).toEqual([3]));
  test("multiple choice toggles options", () => { expect(toggleChoice("multiple", [1], 3)).toEqual([1, 3]); expect(toggleChoice("multiple", [1, 3], 1)).toEqual([3]); });
  test("counts unanswered questions", () => expect(unanswered(qs, { 0: [0], 2: "  " })).toBe(2));
});

import { hwFormError, hwPayload, riyadhIso, type HwForm } from "../homeworkRules";
describe("new homework form", () => {
  const now = Date.parse("2026-11-18T09:00:00Z");
  const ok: HwForm = { course_id: "c", title: "واجب", instructions: "", types: ["text"], from: null, due: { d: "2026-11-20", t: "20:00" }, late_policy: "none", late_until: null, graded: true, max_score: "10", allow_resubmit: false, max_attempts: "2" };
  test("school time is Riyadh (+03:00)", () => expect(riyadhIso({ d: "2026-11-20", t: "20:00" })).toBe("2026-11-20T17:00:00.000Z"));
  test("valid form passes", () => expect(hwFormError(ok, now)).toBeNull());
  test("due date in the past is refused", () => expect(hwFormError({ ...ok, due: { d: "2026-11-17", t: "08:00" } }, now)).not.toBeNull());
  test("late deadline must follow the due date", () => expect(hwFormError({ ...ok, late_policy: "until", late_until: { d: "2026-11-19", t: "08:00" } }, now)).not.toBeNull());
  test("at least one submission type", () => expect(hwFormError({ ...ok, types: [] }, now)).not.toBeNull());
  test("no resubmission means one attempt", () => expect(hwPayload(ok).max_attempts).toBe(1));
  test("ungraded homework sends no score", () => expect(hwPayload({ ...ok, graded: false }).max_score).toBeNull());
});
