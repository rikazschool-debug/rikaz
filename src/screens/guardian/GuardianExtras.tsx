import React, { useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { AppText, Button, Notice, TextField } from "../../components/ui";
import { Chips, DataState, Panel, Pill, SubScreen } from "../../components/StudentKit";
import {
  ackCircular, createFamilyRequest, createVisit, fetchCirculars, fetchFamilyRequests, fetchSlots, fetchVisits, needsAck, openCircular,
  REQ_KIND, REQ_STATUS, VISIT_REASON, VISIT_SOURCE, VISIT_STATUS, visitAction, visitActions, type Circular, type Visit,
} from "../../api/family";
import { fetchOverview, type FamilyChild } from "../../api/student";
import { useAuth } from "../../hooks/useAuth";
import { errorText, useLoad } from "../../hooks/useLoad";
import { daysAgo, riyadhToday, schoolDate, schoolTime } from "../../lib/studentData";
import { COLORS, SPACING } from "../../theme/tokens";

/* ---------- التعاميم ---------- */
export const Circulars: React.FC = () => {
  const { active } = useAuth();
  const q = useLoad(() => fetchCirculars(active?.schoolId ?? ""), [active?.schoolId]);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const me = q.data?.me ?? null;
  const show = (c: Circular) => {
    setOpen(open === c.id ? null : c.id);
    const r = c.circular_recipients?.find((x) => x.user_id === me);
    if (r && !r.opened_at) void openCircular(c.id).catch(() => undefined);
  };
  const ack = async (c: Circular) => {
    setErr(null);
    try { await ackCircular(c.id); q.reload(); } catch (e) { setErr(errorText(e)); }
  };
  return (
    <DataState loading={q.loading} error={q.error} empty={!q.data?.rows.length} emptyTitle="لا توجد تعاميم" onRetry={q.reload}>
      {err ? <Notice tone="error">{err}</Notice> : null}
      <View style={styles.list}>
        {(q.data?.rows ?? []).map((c) => {
          const unread = !!c.circular_recipients?.find((x) => x.user_id === me && !x.opened_at);
          const need = needsAck(c, me);
          return (
            <Panel key={c.id} style={[styles.card, unread && styles.unread]}>
              <View style={styles.row}>
                <AppText variant="bodyStrong" weight="extrabold" style={styles.flex}>{c.title}</AppText>
                {need ? <Pill label="يتطلب إقرارًا" tone="accent" /> : null}
              </View>
              <AppText variant="micro" color={COLORS.mutedForeground}>{schoolTime(c.published_at ?? c.created_at)}</AppText>
              {open === c.id ? <AppText variant="body">{c.body ?? ""}</AppText> : null}
              <Button title={open === c.id ? "إخفاء" : "قراءة التعميم"} variant="ghost" onPress={() => show(c)} />
              {open === c.id && need ? <Button title="أقرّ بالاطلاع" onPress={() => void ack(c)} /> : null}
            </Panel>
          );
        })}
      </View>
    </DataState>
  );
};

/* ---------- طلبات ولي الأمر ---------- */
export const FamilyRequests: React.FC<{ kids: FamilyChild[]; onBack: () => void }> = ({ kids, onBack }) => {
  const { active } = useAuth();
  const q = useLoad(() => fetchFamilyRequests(active?.orgId ?? ""), [active?.orgId]);
  const [form, setForm] = useState(false);
  const [kid, setKid] = useState(kids[0]?.student_id ?? "");
  const [kind, setKind] = useState("data_change");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const submit = async () => {
    setBusy(true); setMsg(null);
    try { await createFamilyRequest(kid, kind, body.trim()); setMsg({ tone: "success", text: "تم تقديم الطلب" }); setForm(false); setBody(""); q.reload(); } catch (e) { setMsg({ tone: "error", text: errorText(e) }); } finally { setBusy(false); }
  };
  return (
    <SubScreen title="طلبات ولي الأمر" eyebrow="طلباتك للمدرسة" onBack={onBack} refreshing={q.loading} onRefresh={q.reload}>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      {!form ? <Button title="طلب جديد" onPress={() => setForm(true)} disabled={!kids.length} /> : (
        <Panel style={styles.card}>
          <AppText variant="label" weight="bold">الابن / الابنة</AppText>
          <Chips label="الأبناء" value={kid} onChange={setKid} items={kids.map((k) => ({ key: k.student_id, label: k.student ?? "" }))} />
          <AppText variant="label" weight="bold">نوع الطلب</AppText>
          <Chips label="نوع الطلب" value={kind} onChange={setKind} items={Object.entries(REQ_KIND).map(([key, label]) => ({ key, label }))} />
          <TextField label="تفاصيل الطلب" value={body} onChangeText={setBody} multiline maxLength={4000} />
          <View style={styles.row}>
            <View style={styles.flex}><Button title="تقديم الطلب" onPress={() => void submit()} loading={busy} disabled={!kid || body.trim().length < 3} /></View>
            <View style={styles.flex}><Button title="إلغاء" variant="secondary" onPress={() => setForm(false)} /></View>
          </View>
        </Panel>
      )}
      <DataState loading={q.loading && !q.data} error={q.error} empty={!q.data?.length} emptyTitle="لا توجد طلبات" onRetry={q.reload}>
        <View style={styles.list}>
          {(q.data ?? []).map((r) => (
            <Panel key={r.id} style={styles.card}>
              <View style={styles.row}>
                <AppText variant="bodyStrong" style={styles.flex}>{REQ_KIND[r.kind] ?? r.kind}</AppText>
                <Pill label={REQ_STATUS[r.status] ?? r.status} tone={r.status === "accepted" ? "success" : r.status === "rejected" ? "danger" : "primary"} />
              </View>
              <AppText variant="micro" color={COLORS.mutedForeground}>{[r.ref, r.students?.full_name, schoolDate(r.created_at)].filter(Boolean).join(" · ")}</AppText>
              <AppText variant="caption">{r.body}</AppText>
              {r.response ? <AppText variant="caption" style={styles.note}>{`رد المدرسة: ${r.response}`}</AppText> : null}
              {r.rejection_reason ? <AppText variant="caption" color={COLORS.destructive}>{`سبب الرفض: ${r.rejection_reason}`}</AppText> : null}
            </Panel>
          ))}
        </View>
      </DataState>
    </SubScreen>
  );
};

/* ---------- الزيارات ---------- */
export const Visits: React.FC<{ kids: FamilyChild[]; onBack: () => void }> = ({ kids, onBack }) => {
  const { active } = useAuth();
  const q = useLoad(() => fetchVisits(active?.schoolId ?? ""), [active?.schoolId]);
  const [form, setForm] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [reasonFor, setReasonFor] = useState<{ v: Visit; a: "decline" | "cancel" } | null>(null);
  const [reason, setReason] = useState("");
  const act = async (v: Visit, a: "confirm" | "decline" | "cancel", why?: string) => {
    setMsg(null);
    try { await visitAction(v, a, why); setReasonFor(null); setReason(""); q.reload(); } catch (e) { setMsg({ tone: "error", text: errorText(e) }); q.reload(); }
  };
  return (
    <SubScreen title="الزيارات" eyebrow="مواعيدك مع المدرسة" onBack={onBack} refreshing={q.loading} onRefresh={q.reload}>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      {form ? <VisitForm kids={kids} onClose={() => setForm(false)} onDone={() => { setForm(false); setMsg({ tone: "success", text: "أُرسل طلب الزيارة للمدرسة" }); q.reload(); }} />
        : <Button title="طلب زيارة للمدرسة" onPress={() => setForm(true)} disabled={!kids.length} />}
      <DataState loading={q.loading && !q.data} error={q.error} empty={!q.data?.length} emptyTitle="لا توجد زيارات" onRetry={q.reload}>
        <View style={styles.list}>
          {(q.data ?? []).map((v) => (
            <Panel key={v.id} style={styles.card}>
              <View style={styles.row}>
                <AppText variant="bodyStrong" style={styles.flex}>{`زيارة ${v.student ?? ""}`}</AppText>
                <Pill label={VISIT_STATUS[v.status] ?? v.status} tone={v.status === "confirmed" || v.status === "completed" ? "success" : ["rejected", "cancelled", "no_show", "expired"].includes(v.status) ? "muted" : "accent"} />
              </View>
              <AppText variant="caption">{`${v.status === "proposed" ? "الموعد المقترح" : "الموعد"}: ${v.slot_date} — ${String(v.slot_time).slice(0, 5)}`}</AppText>
              <AppText variant="micro" color={COLORS.mutedForeground}>{[VISIT_SOURCE[v.source], v.reason_cat ? VISIT_REASON[v.reason_cat] : null, v.host ? `يقابلك: ${v.host}` : null].filter(Boolean).join(" · ")}</AppText>
              {v.details ? <AppText variant="caption">{v.details}</AppText> : null}
              {v.decision_reason ? <AppText variant="micro" color={COLORS.mutedForeground}>{`ملاحظة: ${v.decision_reason}`}</AppText> : null}
              {reasonFor?.v.id === v.id ? (
                <>
                  <TextField label={reasonFor.a === "cancel" ? "سبب إلغاء الزيارة" : "سبب الاعتذار"} value={reason} onChangeText={setReason} />
                  <View style={styles.row}>
                    <View style={styles.flex}><Button title="تأكيد" variant="destructive" disabled={!reason.trim()} onPress={() => void act(v, reasonFor.a, reason.trim())} /></View>
                    <View style={styles.flex}><Button title="رجوع" variant="secondary" onPress={() => setReasonFor(null)} /></View>
                  </View>
                </>
              ) : (
                <View style={styles.row}>
                  {visitActions(v).map((a) => (
                    <View key={a} style={styles.flex}>
                      <Button title={a === "confirm" ? (v.status === "proposed" ? "قبول الموعد" : "تأكيد الموعد") : a === "decline" ? "اعتذار" : "إلغاء الزيارة"} variant={a === "confirm" ? "primary" : "secondary"} onPress={() => (a === "confirm" ? void act(v, a) : setReasonFor({ v, a }))} />
                    </View>
                  ))}
                </View>
              )}
            </Panel>
          ))}
        </View>
      </DataState>
    </SubScreen>
  );
};

const VisitForm: React.FC<{ kids: FamilyChild[]; onClose: () => void; onDone: () => void }> = ({ kids, onClose, onDone }) => {
  const [kid, setKid] = useState(kids[0]?.student_id ?? "");
  const school = kids.find((k) => k.student_id === kid)?.school_id ?? "";
  const slots = useLoad(() => (school ? fetchSlots(school, riyadhToday(), daysAgo(-21)) : Promise.resolve([])), [school]);
  const days = [...new Set((slots.data ?? []).filter((s) => s.free).map((s) => s.day))];
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  useEffect(() => { setDay(""); setTime(""); }, [school]);
  const [cat, setCat] = useState("academic");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    try { await createVisit({ student: kid, reason: cat, details: details.trim(), date: day, time }); onDone(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Panel style={styles.card}>
      <AppText variant="bodyStrong" weight="extrabold">طلب زيارة للمدرسة</AppText>
      <AppText variant="label" weight="bold">الابن / الابنة</AppText>
      <Chips label="الأبناء" value={kid} onChange={setKid} items={kids.map((k) => ({ key: k.student_id, label: k.student ?? "" }))} />
      <AppText variant="label" weight="bold">سبب الزيارة</AppText>
      <Chips label="السبب" value={cat} onChange={setCat} items={Object.entries(VISIT_REASON).map(([key, label]) => ({ key, label }))} />
      <TextField label="التفاصيل" value={details} onChangeText={setDetails} multiline />
      <AppText variant="label" weight="bold">اليوم والوقت</AppText>
      <DataState loading={slots.loading} error={slots.error} empty={!days.length} emptyTitle="لا توجد مواعيد متاحة خلال الأسابيع القادمة" onRetry={slots.reload}>
        <Chips label="اليوم" value={day} onChange={(d) => { setDay(d); setTime(""); }} items={days.map((d) => ({ key: d, label: d }))} />
        {day ? <Chips label="الوقت" value={time} onChange={setTime} items={(slots.data ?? []).filter((s) => s.day === day && s.free).map((s) => ({ key: s.at, label: String(s.at).slice(0, 5) }))} /> : null}
      </DataState>
      {err ? <Notice tone="error">{err}</Notice> : null}
      <View style={styles.row}>
        <View style={styles.flex}><Button title="إرسال الطلب" onPress={() => void save()} loading={busy} disabled={!kid || !day || !time} /></View>
        <View style={styles.flex}><Button title="إلغاء" variant="secondary" onPress={onClose} /></View>
      </View>
    </Panel>
  );
};

/* ---------- البيانات المالية للابن ---------- */
export const ChildFinance: React.FC<{ studentId: string; name: string; onBack: () => void }> = ({ studentId, name, onBack }) => {
  const q = useLoad(() => fetchOverview(studentId), [studentId]);
  const f = q.data?.finance;
  return (
    <SubScreen title="البيانات المالية" eyebrow={name} onBack={onBack}>
      <DataState loading={q.loading} error={q.error} empty={!f} emptyTitle="لا توجد بيانات مالية" onRetry={q.reload}>
        {f && !f.linked ? <Notice tone="info">لم يُربط الحساب المالي لهذا الابن بعد.</Notice> : null}
        {f?.linked ? (
          <Panel style={styles.card}>
            <AppText variant="caption" color={COLORS.mutedForeground}>الرصيد المتبقي</AppText>
            <AppText variant="title" weight="extrabold" color={COLORS.primary}>{`${f.balance ?? 0} ${f.currency ?? "ر.س"}`}</AppText>
            {f.synced_at ? <AppText variant="micro" color={COLORS.mutedForeground}>{`آخر تحديث ${schoolTime(f.synced_at)}`}</AppText> : null}
          </Panel>
        ) : null}
        {f?.payments?.length ? (
          <Panel>
            {f.payments.map((p, i) => (
              <View key={i} style={[styles.pay, i > 0 && styles.border]}>
                <AppText variant="bodyStrong" style={styles.flex}>{`${p.amount} ${f.currency ?? "ر.س"}`}</AppText>
                <AppText variant="micro" color={COLORS.mutedForeground}>{`${schoolDate(p.paid_at)}${p.ref ? ` · ${p.ref}` : ""}`}</AppText>
              </View>
            ))}
          </Panel>
        ) : null}
        {f?.banks?.length ? (
          <Panel style={styles.card}>
            <AppText variant="bodyStrong" weight="extrabold">الحسابات البنكية للمدرسة</AppText>
            {f.banks.map((b, i) => <AppText key={i} variant="caption" selectable>{`${b.bank} — ${b.holder}\n${b.iban}`}</AppText>)}
          </Panel>
        ) : null}
        {f?.links?.length ? f.links.map((l, i) => <Button key={i} title={l.label} variant="secondary" onPress={() => void Linking.openURL(l.url)} />) : null}
        {f?.note ? <AppText variant="caption" color={COLORS.mutedForeground}>{f.note}</AppText> : null}
      </DataState>
    </SubScreen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  list: { gap: SPACING.md },
  card: { paddingVertical: SPACING.md, gap: SPACING.xs },
  unread: { borderColor: COLORS.primary },
  note: { backgroundColor: COLORS.muted, borderRadius: 10, padding: SPACING.sm },
  pay: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingVertical: SPACING.md },
  border: { borderTopWidth: 1, borderTopColor: COLORS.border },
});
