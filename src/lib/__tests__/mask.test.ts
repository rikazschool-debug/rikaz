import { maskNationalId, maskPhone, schoolWeek } from "../mask";

test("national id keeps first 2 and last 3 digits", () => {
  expect(maskNationalId("1012345482")).toBe("10•••••482");
});
test("phone shows +966, first and last 3 digits", () => {
  expect(maskPhone("0551234217")).toBe("+966 5••••••217".replace("••••••", "•••••"));
  expect(maskPhone("966551234217")).toBe("+966 5•••••217");
});
test("empty values stay empty", () => {
  expect(maskNationalId(null)).toBeNull();
  expect(maskPhone("")).toBeNull();
});
test("school week is Sunday to Thursday and marks today", () => {
  const w = schoolWeek(new Date(2026, 10, 18)); // Wednesday 18 Nov 2026
  expect(w.map((d) => d.day)).toEqual([15, 16, 17, 18, 19]);
  expect(w[3].isToday).toBe(true);
});
test("on Friday the next school week is shown", () => {
  const w = schoolWeek(new Date(2026, 10, 20));
  expect(w[0].day).toBe(22);
});
