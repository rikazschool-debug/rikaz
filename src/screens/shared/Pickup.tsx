import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Button, Notice, TextField } from "../../components/ui";
import { Chips, DataState, Panel, Pill, SegmentTabs, SubScreen } from "../../components/StudentKit";
import {
  CANCELLABLE, cancelPickup, fetchAuthorizedPickups, fetchMyPickupRequests, fetchPickupChildren, fetchSelfStudent, fetchTimeline,
  PICKUP_KIND, PICKUP_STATUS, plannedAt, recipientError, submitPickup, type Recipient,
} from "../../api/family";
import { useAuth } from "../../hooks/useAuth";
import { errorText, useLoad } from "../../hooks/useLoad";
import { daysAgo, riyadhToday, schoolTime } from "../../lib/studentData";
import { COLORS, SPACING } from "../../theme/tokens";

/** سجل آخر 30 يومًا: الحضور، الخروج والعودة، طلبات الاستلام. */
export const Timeline: React.FC<{ studentId: string | null }> = ({ studentId }) => {
  const q = useLoad(() => (studentId ? fetchTimeline(studentId, daysAgo(30)) : Promise.resolve([])), [studentId]);
  return (
    <DataState loading={q.loading} error={q.error} missing={!q.loading && !studentId} empty={!q.data?.length} emptyTitle="لا توجد حركات خلال 30 يومًا" onRetry={q.reload}>
      <Panel>
        {(q.data ?? []).map((t, i) => (
          <View key={`${t.at}-${i}`} style={[styles.item, i > 0 && styles.border]}>
            <View style={[styles.mark, { backgroundColor: t.kind === "pickup" ? COLORS.accent : t.kind === "gate" ? COLORS.primary : COLORS.success }]} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{t.label}</AppText>
              <AppText variant="micro" color={COLORS.mutedForeground}>{`${schoolTime(t.at)}${t.note ? ` · ${t.note}` : ""}`}</AppText>
            </View>
          </View>
        ))}
      </Panel>
    </DataState>
  );
};

/** الطالب: عرض فقط (لا يقدّم طلبات)، كما في المنصة. */
export const StudentPickup: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const me = useLoad(fetchSelfStudent, []);
  return (
    <SubScreen title="الخروج والاستئذان" eyebrow="سجل آخر 30 يومًا" onBack={onBack}>
      <AppText variant="caption" color={COLORS.mutedForeground}>طلبات الاستلام والاستئذان يقدّمها ولي الأمر، وتظهر هنا مع حضورك وحركات خروجك.</AppText>
      {me.loading ? <DataState loading /> : <Timeline studentId={me.data} />}
    </SubScreen>
  );
};

type Tab = "quick" | "permission" | "mine" | "record";
const EMPTY: Recipient = { mode: "self", person: "", delegate: { name: "", relationship: "", phone: "", id_last4: "", ack: false } };

/** ولي الأمر: استلام سريع، استئذان، طلباتي، سجل الحضور. */
export const GuardianPickup: React.FC<{ onBack: () => void; initialChild?: string }> = ({ onBack, initialChild }) => {
  const { active } = useAuth();
  const [tab, setTab] = useState<Tab>("quick");
  const kids = useLoad(() => fetchPickupChildren(active?.schoolId ?? ""), [active?.schoolId]);
  const [child, setChild] = useState(initialChild ?? "");
  useEffect(() => { if (kids.data?.length && !kids.data.some((k) => k.student_id === child)) setChild(kids.data[0]!.student_id); }, [kids.data, child]);
  const persons = useLoad(() => (child ? fetchAuthorizedPickups(child) : Promise.resolve([])), [child]);
  const mine = useLoad(fetchMyPickupRequests, [tab === "mine"]);
  const [r, setR] = useState<Recipient>(EMPTY);
  const [reason, setReason] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const kid = kids.data?.find((k) => k.student_id === child);
  const d = r.delegate;
  const setD = (p: Partial<Recipient["delegate"]>) => setR({ ...r, delegate: { ...d, ...p } });

  const submit = async (kind: "quick" | "permission") => {
    setMsg(null);
    const bad = recipientError(r) ?? (kind === "permission" && !reason.trim() ? "اكتب سبب الاستئذان" : null) ?? (time && !plannedAt(time, riyadhToday()) ? "اكتب الوقت بصيغة 13:30" : null);
    if (bad) return setMsg({ tone: "error", text: bad });
    setBusy(true);
    try {
      await submitPickup({ student: child, kind, reason: reason.trim() || null, planned: time ? plannedAt(time, riyadhToday()) : null, recipient: r });
      setMsg({ tone: "success", text: kind === "quick" ? "أُرسل طلب الاستلام" : "قُدّم الاستئذان" });
      setR(EMPTY); setReason(""); setTime("");
    } catch (e) { setMsg({ tone: "error", text: errorText(e) }); } finally { setBusy(false); }
  };
  const cancel = async (id: string) => {
    try { await cancelPickup(id, null); mine.reload(); } catch (e) { setMsg({ tone: "error", text: errorText(e) }); }
  };

  const form = (kind: "quick" | "permission") => (
    <Panel style={styles.form}>
      <AppText variant="caption" color={COLORS.mutedForeground}>
        {kind === "quick" ? "للاستلام عند نهاية الدوام. يتحقق الاستقبال من وصول المستلم وصلاحيته قبل التجهيز والنداء." : "للخروج أثناء الدوام؛ يُرسل للمسؤول المخول للموافقة أو الرفض بسبب."}
      </AppText>
      {kid && !kid.can_pickup ? <Notice tone="error">حسابك غير مخوّل باستلام هذا الابن. تواصل مع المدرسة.</Notice> : null}
      <AppText variant="label" weight="bold">المستلم</AppText>
      {([["self", "سأستلم بنفسي"], ["authorized", "مستلم مفوّض معتمد سابقًا"], ["one_time", "تفويض شخص آخر لهذا الطلب"]] as const).map(([m, l]) => (
        <Pressable key={m} onPress={() => setR({ ...r, mode: m })} accessibilityRole="radio" accessibilityState={{ checked: r.mode === m }} style={styles.radioRow}>
          <View style={[styles.radio, r.mode === m && styles.radioOn]} />
          <AppText variant="body">{l}</AppText>
        </Pressable>
      ))}
      {r.mode === "authorized" ? (
        persons.data?.length ? <Chips label="المستلم المعتمد" value={r.person} onChange={(person) => setR({ ...r, person })} items={persons.data.map((p) => ({ key: p.id, label: `${p.full_name}${p.relationship ? ` (${p.relationship})` : ""}` }))} />
          : <AppText variant="caption" color={COLORS.mutedForeground}>لا يوجد مستلمون معتمدون لهذا الابن.</AppText>
      ) : null}
      {r.mode === "one_time" ? (
        <>
          <TextField label="الاسم الكامل للمفوَّض" value={d.name} onChangeText={(name) => setD({ name })} />
          <TextField label="صلة القرابة أو العلاقة" value={d.relationship} onChangeText={(relationship) => setD({ relationship })} />
          <TextField label="رقم الجوال" value={d.phone} onChangeText={(phone) => setD({ phone })} keyboardType="phone-pad" ltr />
          <TextField label="آخر 4 أرقام من الهوية" value={d.id_last4} onChangeText={(id_last4) => setD({ id_last4: id_last4.replace(/\D/g, "").slice(0, 4) })} keyboardType="number-pad" ltr />
          <Pressable onPress={() => setD({ ack: !d.ack })} accessibilityRole="checkbox" accessibilityState={{ checked: d.ack }} style={styles.radioRow}>
            <View style={[styles.box, d.ack && styles.radioOn]} />
            <AppText variant="caption" style={styles.flex}>{`أُقرّ بتفويض هذا الشخص باستلام ${kid?.name ?? "ابني"} لهذا الطلب فقط.`}</AppText>
          </Pressable>
        </>
      ) : null}
      {kind === "permission" ? <TextField label="السبب" value={reason} onChangeText={setReason} placeholder="مثال: موعد في المستشفى" /> : null}
      {kind === "permission" ? <TextField label="الموعد المتوقع (اختياري)" value={time} onChangeText={setTime} placeholder="13:30" keyboardType="numbers-and-punctuation" ltr /> : null}
      <Button title={kind === "quick" ? "طلب الاستلام" : "تقديم الاستئذان"} onPress={() => void submit(kind)} loading={busy} disabled={!kid?.can_pickup} />
    </Panel>
  );

  return (
    <SubScreen title="الخروج والاستئذان" eyebrow="استلام الأبناء" onBack={onBack}>
      <DataState loading={kids.loading} error={kids.error} empty={!kids.data?.length} emptyTitle="لا يوجد أبناء موثّقون في حسابك بهذه المدرسة" onRetry={kids.reload}>
        <Chips label="الأبناء" value={child} onChange={(c) => { setChild(c); setR(EMPTY); }} items={(kids.data ?? []).map((k) => ({ key: k.student_id, label: k.name }))} />
        <SegmentTabs label="الخروج والاستئذان" value={tab} onChange={(t) => { setTab(t); setMsg(null); }} items={[{ key: "quick", label: "استلام" }, { key: "permission", label: "استئذان" }, { key: "mine", label: "طلباتي" }, { key: "record", label: "السجل" }]} />
        {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
        {tab === "quick" || tab === "permission" ? form(tab) : null}
        {tab === "mine" ? (
          <DataState loading={mine.loading} error={mine.error} empty={!mine.data?.length} emptyTitle="لا توجد طلبات" onRetry={mine.reload}>
            <View style={styles.list}>
              {(mine.data ?? []).map((p) => (
                <Panel key={p.id} style={styles.form}>
                  <View style={styles.row}>
                    <AppText variant="bodyStrong" style={styles.flex}>{`${p.students?.full_name ?? ""} — ${PICKUP_KIND[p.kind] ?? p.kind}`}</AppText>
                    <Pill label={PICKUP_STATUS[p.status] ?? p.status} tone={["rejected", "cancelled"].includes(p.status) ? "muted" : p.status === "handed_over" ? "success" : "primary"} />
                  </View>
                  <AppText variant="micro" color={COLORS.mutedForeground}>{`${schoolTime(p.created_at)}${p.planned_at ? ` · الموعد ${schoolTime(p.planned_at)}` : ""}`}</AppText>
                  {p.reason ? <AppText variant="caption">{`السبب: ${p.reason}`}</AppText> : null}
                  {p.pickup_name ? <AppText variant="caption">{`المستلم: ${p.pickup_name}`}</AppText> : null}
                  {p.decision_note ? <AppText variant="caption" color={COLORS.mutedForeground}>{`ملاحظة المدرسة: ${p.decision_note}`}</AppText> : null}
                  {CANCELLABLE.includes(p.status) ? <Button title="إلغاء الطلب" variant="destructive" onPress={() => void cancel(p.id)} /> : null}
                </Panel>
              ))}
            </View>
          </DataState>
        ) : null}
        {tab === "record" ? <Timeline studentId={child || null} /> : null}
      </DataState>
    </SubScreen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  list: { gap: SPACING.md },
  form: { paddingVertical: SPACING.md, gap: SPACING.sm },
  item: { flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingVertical: SPACING.md },
  border: { borderTopWidth: 1, borderTopColor: COLORS.border },
  mark: { width: 10, height: 10, borderRadius: 5 },
  radioRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, minHeight: 44 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: COLORS.border },
  radioOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
});
