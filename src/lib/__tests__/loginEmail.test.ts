import { toLoginEmail } from "../loginEmail";
test("رقم الهوية يتحول إلى حساب ولي الأمر كما في الموقع", () => expect(toLoginEmail("1012345678")).toBe("1012345678@guardian.rikaz.app"));
test("الجوال بالمسافات والعلامة", () => expect(toLoginEmail("+966 50 123 4567")).toBe("966501234567@guardian.rikaz.app"));
test("اسم المستخدم للكادر بحروف صغيرة", () => expect(toLoginEmail("Ahmed.Ali")).toBe("ahmed.ali@staff.rikaz.app"));
test("البريد يبقى كما هو", () => expect(toLoginEmail("T@School.sa")).toBe("t@school.sa"));
