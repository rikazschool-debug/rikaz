import { clipSeconds, fileKind, fmtSec } from "../chatFiles";
test("تصنيف المرفقات", () => {
  expect(fileKind({ mime: "audio/mp4" })).toBe("voice");
  expect(fileKind({ mime: "image/jpeg" })).toBe("image");
  expect(fileKind({ mime: "application/pdf" })).toBe("file");
  expect(fileKind({})).toBe("file");
});
test("مدة التسجيل ضمن حد المدرسة", () => {
  expect(clipSeconds(200, 120)).toBe(120);
  expect(clipSeconds(0, 120)).toBe(1);
  expect(fmtSec(75)).toBe("1:15");
});
