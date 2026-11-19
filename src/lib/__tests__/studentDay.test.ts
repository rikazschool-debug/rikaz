import { currentOrNext, dueLabel, planDay, riyadhMinutes, summarize, toMinutes, upcomingWork } from "../studentDay";
import type { HomeworkRow, Slot } from "../studentData";

const slot = (sort: number, start: string, end: string, subject = `م${sort}`): Slot => ({ day: 0, period: `الحصة ${sort}`, sort, start, end, subject, teacher: null });
const DAY = [slot(1, "07:15:00", "08:00:00"), slot(2, "08:05:00", "08:50:00"), slot(3, "09:00:00", "09:45:00"), slot(4, "10:10:00", "10:55:00")];

test("times convert to minutes and Riyadh clock is UTC+3", () => {
  expect(toMinutes("09:45:00")).toBe(585);
  expect(toMinutes(null)).toBeNull();
  expect(riyadhMinutes(new Date("2026-11-19T06:20:00Z"))).toBe(9 * 60 + 20);
});

test("at 09:20 two lessons are done, the third is live with 25 minutes left", () => {
  const items = planDay(DAY, 9 * 60 + 20).filter((i) => i.kind === "lesson");
  expect(items.map((i) => i.kind === "lesson" && i.state)).toEqual(["done", "done", "now", "next"]);
  const live = items[2];
  expect(live.kind === "lesson" && live.minutesLeft).toBe(25);
  expect(summarize(DAY, 9 * 60 + 20)).toEqual({ total: 4, done: 2, remaining: 2 });
});

test("a gap of 25 minutes becomes a break; 5- and 10-minute changes do not", () => {
  const breaks = planDay(DAY, null).filter((i) => i.kind === "break");
  expect(breaks).toEqual([{ kind: "break", start: "09:45:00", end: "10:10:00", minutes: 25 }]);
});

test("another day shows no lesson state", () => {
  expect(planDay(DAY, null).every((i) => i.kind === "break" || i.state === "none")).toBe(true);
  expect(summarize(DAY, null).done).toBe(0);
});

test("before school the next lesson starts in N minutes; after school there is none", () => {
  expect(currentOrNext(DAY, 7 * 60)).toMatchObject({ live: false, startsIn: 15 });
  expect(currentOrNext(DAY, 11 * 60)).toBeNull();
});

const hw = (id: string, due: string, sub_status = "none"): HomeworkRow => ({ id, title: id, subject: "علوم", sub_status, due_at: due, effective_due: due });
const NOW = new Date("2026-11-19T06:00:00Z").getTime(); // 09:00 الرياض

test("due labels follow the Riyadh calendar day", () => {
  expect(dueLabel("2026-11-19T17:00:00Z", NOW).label).toBe("اليوم"); // 20:00 الرياض اليوم
  expect(dueLabel("2026-11-19T22:00:00Z", NOW).label).toBe("غدًا"); // 01:00 الرياض غدًا
  expect(dueLabel("2026-11-21T10:00:00Z", NOW).label).toBe("بعد يومين");
  expect(dueLabel("2026-11-18T10:00:00Z", NOW).label).toBe("فات موعده");
});

test("upcoming work excludes submitted and overdue items and sorts by due date", () => {
  const rows = [hw("c", "2026-11-25T10:00:00Z"), hw("a", "2026-11-19T17:00:00Z"), hw("x", "2026-11-19T17:00:00Z", "submitted"), hw("late", "2026-11-18T10:00:00Z")];
  expect(upcomingWork(rows, NOW).map((r) => r.id)).toEqual(["a", "c"]);
  expect(upcomingWork(rows, NOW, 0).map((r) => r.id)).toEqual(["a"]);
});

import { shortWhen } from "../studentDay";
test("chat times: yesterday shows «أمس», older than a week shows a date", () => {
  expect(shortWhen("2026-11-18T08:00:00Z", NOW)).toBe("أمس");
  expect(shortWhen("2026-11-19T05:00:00Z", NOW)).not.toBe("أمس");
  expect(shortWhen("2026-11-01T08:00:00Z", NOW)).toMatch(/\d/);
});

import { servicesLabel } from "../studentDay";
test("service counts use correct Arabic number forms", () => {
  expect(servicesLabel(1)).toBe("خدمة واحدة");
  expect(servicesLabel(2)).toBe("خدمتان");
  expect(servicesLabel(5)).toBe("5 خدمات");
  expect(servicesLabel(12)).toBe("12 خدمة");
});
