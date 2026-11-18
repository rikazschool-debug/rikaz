import { enterDuration, MOTION, pressScale } from "../motion";

describe("motion rules", () => {
  it("shows content instantly when reduce motion is on", () => {
    expect(enterDuration(true)).toBe(0);
  });
  it("uses a short entrance otherwise", () => {
    expect(enterDuration(false)).toBe(MOTION.enterMs);
    expect(MOTION.enterMs).toBeLessThanOrEqual(300);
  });
  it("never scales pressed controls when reduce motion is on", () => {
    expect(pressScale(true, true)).toBe(1);
  });
  it("scales pressed controls slightly otherwise", () => {
    expect(pressScale(true, false)).toBe(0.97);
    expect(pressScale(false, false)).toBe(1);
  });
});
