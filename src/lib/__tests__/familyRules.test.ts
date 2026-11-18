jest.mock("../../api/client", () => ({ supabase: {} }));
import { canConsent, inbox, needsAck, plannedAt, recipientError, visitActions, type Conversation, type FamilyEvent, type Visit } from "../../api/family";
import { daysAgo, riyadhToday } from "../studentData";

const conv = (p: Partial<Conversation>): Conversation => ({ id: Math.random().toString(), title: "x", kind: "student", ...p });

describe("inbox", () => {
  const rows = [
    conv({ id: "s", kind: "student" }),
    conv({ id: "g", kind: "group", group_type: "custom" }),
    conv({ id: "sec", kind: "group", group_type: "section" }),
    conv({ id: "f", kind: "family" }),
    conv({ id: "a", kind: "student", archived: true }),
  ];
  it("student sees only own chats and non-class groups", () => expect(inbox(rows, "student", false).map((c) => c.id)).toEqual(["s", "g"]));
  it("guardian sees family chats but not class groups", () => expect(inbox(rows, "guardian", false).map((c) => c.id)).toEqual(["s", "g", "f"]));
  it("archive shows archived only", () => expect(inbox(rows, "student", true).map((c) => c.id)).toEqual(["a"]));
});

describe("pickup recipient", () => {
  const base = { mode: "one_time" as const, person: "", delegate: { name: "محمد أحمد علي", relationship: "عم", phone: "0551234567", id_last4: "1234", ack: true } };
  it("accepts a complete one-time delegate", () => expect(recipientError(base)).toBeNull());
  it("requires a three-part name", () => expect(recipientError({ ...base, delegate: { ...base.delegate, name: "محمد أحمد" } })).toMatch("ثلاثي"));
  it("requires 4 id digits", () => expect(recipientError({ ...base, delegate: { ...base.delegate, id_last4: "12" } })).toMatch("4"));
  it("requires the authorization acknowledgement", () => expect(recipientError({ ...base, delegate: { ...base.delegate, ack: false } })).toMatch("إقرار"));
  it("authorized mode needs a chosen person", () => expect(recipientError({ ...base, mode: "authorized" })).toBe("اختر المستلم المعتمد"));
  it("self needs nothing", () => expect(recipientError({ ...base, mode: "self", delegate: { ...base.delegate, name: "" } })).toBeNull());
});

describe("planned time is Riyadh time", () => {
  it("13:30 Riyadh = 10:30 UTC", () => expect(plannedAt("13:30", "2026-11-18")).toBe("2026-11-18T10:30:00.000Z"));
  it("rejects bad input", () => expect(plannedAt("25:00", "2026-11-18")).toBeNull());
});

describe("riyadh dates", () => {
  it("23:30 UTC is next day in Riyadh", () => expect(riyadhToday(new Date("2026-11-18T23:30:00Z"))).toBe("2026-11-19"));
  it("30 days ago", () => expect(daysAgo(30, new Date("2026-11-18T09:00:00Z"))).toBe("2026-10-19"));
});

describe("visit actions", () => {
  const v = (p: Partial<Visit>): Visit => ({ id: "1", rev: 1, school_id: "s", student_id: "x", student: null, host: null, slot_date: "", slot_time: "", status: "pending", source: "school", reason_cat: null, details: null, awaiting: null, conf_date: null, conf_time: null, decision_reason: null, ...p });
  it("awaiting guardian → confirm or decline", () => expect(visitActions(v({ awaiting: "guardian" }))).toEqual(["confirm", "decline"]));
  it("confirmed → cancel", () => expect(visitActions(v({ status: "confirmed" }))).toEqual(["cancel"]));
  it("completed → nothing", () => expect(visitActions(v({ status: "completed" }))).toEqual([]));
});

describe("trip consent", () => {
  const e = { status: "published", consent_required: true, student_id: "x", consent_deadline: "2026-11-20T00:00:00Z" } as FamilyEvent;
  it("open before deadline", () => expect(canConsent(e, Date.parse("2026-11-19T00:00:00Z"))).toBe(true));
  it("closed after deadline", () => expect(canConsent(e, Date.parse("2026-11-21T00:00:00Z"))).toBe(false));
  it("cancelled trip cannot be consented", () => expect(canConsent({ ...e, status: "cancelled" }, 0)).toBe(false));
});

describe("circular acknowledgement", () => {
  const c = { id: "c", title: "", body: null, status: "published", created_at: "", circular_recipients: [{ user_id: "me", opened_at: null, ack_required_version: 2 }], circular_acks: [{ user_id: "me", version: 1 }] };
  it("needs ack when latest required version not acknowledged", () => expect(needsAck(c, "me")).toBe(true));
  it("no ack needed once acknowledged", () => expect(needsAck({ ...c, circular_acks: [{ user_id: "me", version: 2 }] }, "me")).toBe(false));
});
