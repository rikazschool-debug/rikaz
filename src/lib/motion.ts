/** قواعد الحركة المشتركة: حركة قصيرة وهادئة، وتُلغى تمامًا عند تفعيل "تقليل الحركة". */
export const MOTION = {
  enterMs: 220,
  enterOffset: 8,
  pressScale: 0.97,
} as const;

/** مدة الظهور: صفر عند تقليل الحركة حتى يظهر المحتوى فورًا. */
export function enterDuration(reduceMotion: boolean): number {
  return reduceMotion ? 0 : MOTION.enterMs;
}

/** تصغير بسيط عند الضغط؛ لا تصغير عند تقليل الحركة. */
export function pressScale(pressed: boolean, reduceMotion: boolean): number {
  return pressed && !reduceMotion ? MOTION.pressScale : 1;
}
