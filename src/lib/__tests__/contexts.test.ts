import { buildContexts, contextsSignature, fallbackContext, needsChooser, resolveActive } from "../contexts";
import { MembershipRow, SchoolRow } from "../../api/types";

const schools: SchoolRow[] = [
  { id: "s1", name: "مدرسة الأولى", org_id: "o1", organizations: { name: "مجموعة أ" } },
  { id: "s2", name: "مدرسة الثانية", org_id: "o1", organizations: { name: "مجموعة أ" } },
  { id: "s3", name: "مدرسة أخرى", org_id: "o2", organizations: { name: "مجموعة ب" } },
];

const teacher: MembershipRow = { id: "m1", role: "teacher", org_id: "o1", school_id: "s1", department_id: null, schools: { name: "مدرسة الأولى" }, organizations: { name: "مجموعة أ" } };
const guardian: MembershipRow = { id: "m2", role: "guardian", org_id: "o1", school_id: "s2", department_id: null, schools: { name: "مدرسة الثانية" } };
const owner: MembershipRow = { id: "m3", role: "org_owner", org_id: "o1", school_id: null, department_id: null, organizations: { name: "مجموعة أ" } };

describe("buildContexts", () => {
  it("does not expose organization-owner contexts on mobile", () => {
    const c = buildContexts(false, [owner], schools);
    expect(c).toEqual([]);
  });

  it("does not synthesize mobile memberships for a platform owner", () => {
    const c = buildContexts(true, [], schools);
    expect(c).toEqual([]);
  });

  it("keeps only a mixed owner's actual student, guardian, and staff memberships", () => {
    const student = { ...teacher, id: "m4", role: "student" };
    expect(buildContexts(true, [owner, teacher, guardian, student], schools).map(c => c.role)).toEqual(["teacher", "guardian", "student"]);
  });

  it("uses the permission-template title for a membership when one exists", () => {
    const c = buildContexts(false, [teacher], schools, { m1: "منسق النشاط" });
    expect(c[0]?.title).toBe("منسق النشاط");
  });

  it("ignores roles the app does not know", () => {
    const c = buildContexts(false, [{ ...teacher, role: "unknown_role" }], schools);
    expect(c).toHaveLength(0);
  });
});

describe("active context", () => {
  const both = buildContexts(false, [teacher, guardian], schools);

  it("asks a person with two different roles to choose when nothing is saved", () => {
    expect(needsChooser(both)).toBe(true);
    expect(resolveActive(both, null)).toEqual({ active: null, mustChoose: true });
  });

  it("restores the saved context while it is still valid", () => {
    expect(resolveActive(both, "m2").active?.key).toBe("m2");
  });

  it("asks again when the saved context was removed", () => {
    expect(resolveActive(both, "removed").mustChoose).toBe(true);
  });

  it("opens directly with a single role", () => {
    const one = buildContexts(false, [teacher], schools);
    expect(resolveActive(one, null)).toEqual({ active: one[0], mustChoose: false });
  });

  it("falls back to the actual school membership even for a platform owner", () => {
    expect(fallbackContext(buildContexts(true, [teacher], schools))?.key).toBe("m1");
  });

  it("changes signature when a role is removed", () => {
    const one = buildContexts(false, [teacher], schools);
    expect(contextsSignature(both)).not.toBe(contextsSignature(one));
  });
});
