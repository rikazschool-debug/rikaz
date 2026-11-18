import { changedMarks, countMarks, dutyActions, evalScore, nextMark, slotsByDay } from "../teacherData";

test("لمس الطالب ينقله بين الحالات بالترتيب ويعود إلى حاضر", () => {
  expect(nextMark("present")).toBe("absent");
  expect(nextMark("absent")).toBe("late");
  expect(nextMark("late")).toBe("excused");
  expect(nextMark("excused")).toBe("present");
});

test("عدّ الحضور والغياب", () => {
  expect(countMarks({ a: "present", b: "absent", c: "absent" })).toEqual({ present: 1, absent: 2, late: 0, excused: 0 });
});

test("يُرسل ما تغيّر فقط", () => {
  const orig = [{ student_id: "a", status: "present" as const }, { student_id: "b", status: "present" as const }];
  expect(changedMarks(orig, { a: "present", b: "late" })).toEqual([{ student_id: "b", status: "late" }]);
});

test("لا أستطيع التقييم لا تُحسب صفرًا في المتوسط", () => {
  expect(evalScore(["q1", "q2", "q3"], { q1: 5, q2: "na" })).toEqual({ answered: 2, total: 3, avg: 5 });
});

test("المناوبة: الإقرار قبل الاستلام والتوثيق في يومها فقط", () => {
  expect(dutyActions({ status: "assigned", ack_at: null, exec_status: "pending", date: "2026-11-19" }, "2026-11-18")).toEqual({ ack: true, exec: false });
  expect(dutyActions({ status: "assigned", ack_at: "x", exec_status: "pending", date: "2026-11-18" }, "2026-11-18")).toEqual({ ack: false, exec: true });
  expect(dutyActions({ status: "cancelled", ack_at: null, exec_status: "pending", date: "2026-11-18" }, "2026-11-18")).toEqual({ ack: false, exec: false });
});

test("ترتيب الحصص حسب اليوم ثم الحصة", () => {
  const s = (id: string, day: number, sort: number) => ({ id, day, sort, period: "", start: null, end: null, subject: "", section: "", room: "" });
  const m = slotsByDay([s("c", 1, 2), s("a", 0, 1), s("b", 1, 1)]);
  expect([...m.keys()]).toEqual([0, 1]);
  expect(m.get(1)!.map((x) => x.id)).toEqual(["b", "c"]);
});
