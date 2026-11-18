import { toRiyadhPick, blankQuestion, examArgs, examFormError, validateQuestions, withType, type ExamForm } from "../examRules";
import { hwFormError, hwPayload, type HwForm } from "../homeworkRules";

const future = { d: "2099-01-10", t: "10:00" };
const q = (over = {}) => ({ ...blankQuestion(), prompt: "س", options: ["أ", "ب", "ج", "د"], ...over });
const form = (over: Partial<ExamForm> = {}): ExamForm => ({ course_id: "c", title: "اختبار", instructions: "", delivery: "online", from: null, due: future, duration: "45", count: "1", audience: "all", students: [], ...over });

describe("test questions", () => {
  it("requires a correct choice and complete options", () => {
    expect(validateQuestions([q({ options: ["أ", ""] })], "online")).toBe("أكمل بدائل السؤال 1");
    expect(validateQuestions([q({ correct: [] })], "online")).toBe("حدد الإجابة الصحيحة للسؤال 1");
    expect(validateQuestions([q()], "online")).toBeNull();
  });
  it("single choice allows only one correct answer", () => {
    expect(validateQuestions([q({ correct: [0, 1] })], "online")).toBe("حدد الإجابة الصحيحة للسؤال 1");
    expect(validateQuestions([q({ type: "multiple", correct: [0, 1] })], "online")).toBeNull();
  });
  it("written questions need a model answer", () => {
    expect(validateQuestions([withType(q(), "essay")], "online")).toBe("أكمل الإجابة النموذجية للسؤال 1");
  });
  it("bubble sheets accept only one-answer questions, max 35", () => {
    expect(validateQuestions([q({ type: "multiple", correct: [0] })], "bubble")).toBe("التظليل يحتاج إجابة واحدة لكل سؤال");
    expect(validateQuestions(Array.from({ length: 36 }, () => q()), "bubble")).toBe("ورقة التظليل تستوعب 35 سؤالًا كحد أقصى");
  });
  it("true/false gets fixed two options", () => {
    expect(withType(q(), "truefalse").options).toEqual(["صح", "خطأ"]);
  });
});

describe("test form", () => {
  it("selected audience needs at least one student", () => {
    expect(examFormError(form({ audience: "selected" }), [q()])).toBe("اختر طالبًا واحدًا على الأقل");
  });
  it("max score equals the sum of question points", () => {
    const a = examArgs(form(), [q({ points: 3 }), q({ points: 2 })]);
    expect(a._d.max_score).toBe(5);
    expect(a._d.max_attempts).toBe(1);
  });
  it("end must be after start", () => {
    expect(examFormError(form({ from: { d: "2099-01-11", t: "10:00" } }), [q()])).toBe("النهاية يجب أن تكون بعد بداية الاختبار");
  });
});

describe("homework audience and criteria", () => {
  const hw = (over: Partial<HwForm> = {}): HwForm => ({ course_id: "c", title: "و", instructions: "", types: ["text"], from: null, due: future, late_policy: "none", late_until: null, graded: true, max_score: "10", allow_resubmit: false, max_attempts: "2", ...over });
  it("criteria must add up to the full score", () => {
    expect(hwFormError(hw({ criteria: [{ label: "الفكرة", max: "6" }, { label: "اللغة", max: "3" }] }))).toBe("مجموع درجات المعايير يجب أن يساوي الدرجة الكاملة");
    expect(hwFormError(hw({ criteria: [{ label: "الفكرة", max: "6" }, { label: "اللغة", max: "4" }] }))).toBeNull();
  });
  it("selected students are sent only for the selected audience", () => {
    expect(hwPayload(hw({ audience: "selected", students: ["s1"] })).students).toEqual(["s1"]);
    expect(hwPayload(hw({ audience: "all", students: ["s1"] })).students).toEqual([]);
    expect(hwFormError(hw({ audience: "selected", students: [] }))).toBe("اختر طالبًا واحدًا على الأقل");
  });
});

describe("school time picker", () => {
  it("shows a stored time in Riyadh time and converts back", () => {
    expect(toRiyadhPick("2099-01-10T20:59:00.000Z")).toEqual({ d: "2099-01-10", t: "23:59" });
  });
});
