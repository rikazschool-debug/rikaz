import { filterRows, needsGrade, readyToPublish, safeLink, scoreError, submitLabel, type TargetRow } from "../homeworkRules";

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
