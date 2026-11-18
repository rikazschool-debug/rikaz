import { countBy, groupHomework, isWeekend, itemValue, lessonsOn, monthGrid, monthRange, shiftMonth, type HomeworkRow, type Slot } from "../studentData";

const hw = (id: string, sub_status: string, due: string, extra: Partial<HomeworkRow> = {}): HomeworkRow => ({ id, title: id, subject: "رياضيات", sub_status, due_at: due, effective_due: due, ...extra });
const NOW = new Date("2026-11-18T12:00:00Z").getTime();

test("unsubmitted homework is due before its deadline and late after it", () => {
  const g = groupHomework([hw("a", "none", "2026-11-20T00:00:00Z"), hw("b", "none", "2026-11-10T00:00:00Z")], NOW);
  expect(g.due.map((r) => r.id)).toEqual(["a"]);
  expect(g.late.map((r) => r.id)).toEqual(["b"]);
});
test("an extended deadline keeps homework due", () => {
  const g = groupHomework([hw("a", "none", "2026-11-10T00:00:00Z", { effective_due: "2026-11-25T00:00:00Z" })], NOW);
  expect(g.due).toHaveLength(1);
});
test("submitted, resubmitted and paper count as done; returned is separate", () => {
  const g = groupHomework([hw("s", "submitted", "x"), hw("r", "resubmitted", "x"), hw("p", "paper", "x"), hw("ret", "returned", "x")], NOW);
  expect(g.done.map((r) => r.id)).toEqual(["s", "r", "p"]);
  expect(g.returned.map((r) => r.id)).toEqual(["ret"]);
});
test("removed or archived homework is never due", () => {
  const g = groupHomework([hw("a", "none", "2026-11-20T00:00:00Z", { removed: true }), hw("b", "none", "2026-11-20T00:00:00Z", { status: "archived" })], NOW);
  expect(g.due).toHaveLength(0);
});
test("Friday and Saturday are weekend", () => {
  expect(isWeekend("2026-11-20")).toBe(true);
  expect(isWeekend("2026-11-21")).toBe(true);
  expect(isWeekend("2026-11-22")).toBe(false);
});
test("November 2026 grid starts on Sunday with 30 days", () => {
  const g = monthGrid(2026, 10);
  expect(g[0]).toBe("2026-11-01");
  expect(g.filter(Boolean)).toHaveLength(30);
  expect(monthRange(2026, 10)).toEqual({ from: "2026-11-01", to: "2026-11-30" });
});
test("month navigation wraps across years", () => {
  expect(shiftMonth(2026, 11, 1)).toEqual({ y: 2027, m: 0 });
  expect(shiftMonth(2026, 0, -1)).toEqual({ y: 2025, m: 11 });
});
test("attendance counts by status only for recorded days", () => {
  expect(countBy([{ date: "a", status: "present", note: null }, { date: "b", status: "present", note: null }, { date: "c", status: "late", note: null }])).toEqual({ present: 2, late: 1 });
});
test("lessons of a day are ordered by period", () => {
  const s = (day: number, sort: number): Slot => ({ day, sort, period: `ح${sort}`, start: null, end: null, subject: "x", teacher: null });
  expect(lessonsOn([s(0, 3), s(1, 1), s(0, 1)], 0).map((x) => x.sort)).toEqual([1, 3]);
});
test("result items show score out of max or the entry status", () => {
  expect(itemValue({ name: "اختبار", status: "score", score: 18, max: 20 })).toBe("18 / 20");
  expect(itemValue({ name: "مشروع", status: "exempt" })).toBe("معفى");
});
