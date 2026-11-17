import { sectionsFor } from "../sections";

describe("sectionsFor", () => {
  it("shows a student only student sections", () => {
    const s = sectionsFor("student", null);
    expect(s).toEqual(expect.arrayContaining(["classrooms", "homework", "tests", "schedule", "pickup", "communication", "notifications", "events", "support"]));
    expect(s).not.toContain("circulars");
    expect(s).not.toContain("family_requests");
    expect(s).not.toContain("attendance");
    expect(s).not.toContain("students");
  });

  it("shows a guardian family sections including requests, evaluation, and circulars", () => {
    const s = sectionsFor("guardian", null);
    expect(s).toEqual(expect.arrayContaining(["family_requests", "evaluation", "remedial_plans", "circulars", "pickup", "family_visits"]));
    expect(s).not.toContain("comm_groups");
    expect(s).not.toContain("admin");
  });

  it("ignores school permissions for family roles", () => {
    expect(sectionsFor("guardian", { "gate.operate": true, "health.view": true })).not.toContain("health");
  });

  it("gives a teacher the teaching sections and staff tools, but not management", () => {
    const s = sectionsFor("teacher", {});
    expect(s).toEqual(expect.arrayContaining(["classrooms", "homework", "tests", "attendance", "admin", "duties", "meetings", "comm_groups", "student_guidance", "supervision"]));
    expect(s).not.toContain("academic");
    expect(s).not.toContain("students");
    expect(s).not.toContain("comm_manage");
  });

  it("removes homework and tests when the school stops them for this person", () => {
    const s = sectionsFor("teacher", { "bt_homework.view": false });
    expect(s).not.toContain("homework");
    expect(s).not.toContain("tests");
  });

  it("adds sections granted by school permissions", () => {
    const s = sectionsFor("nurse", { "gate.operate": true, "people_family.view": true });
    expect(s).toEqual(expect.arrayContaining(["health", "attendance", "station", "students", "guardians"]));
  });

  it("shows the vice principal no attendance section unless granted", () => {
    expect(sectionsFor("vice_principal", {})).not.toContain("attendance");
    expect(sectionsFor("vice_principal", { "attendance.view": true })).toContain("attendance");
  });

  it("hides class visits for staff with evaluation permissions", () => {
    const s = sectionsFor("principal", { "ev_forms.view": true });
    expect(s).toContain("evaluation");
    expect(s).not.toContain("visits");
  });

  it("shows owners nothing on mobile", () => {
    expect(sectionsFor("org_owner", {})).toEqual([]);
    expect(sectionsFor("platform_admin", {})).toEqual([]);
  });
});
