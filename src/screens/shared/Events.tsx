import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Button, Notice, TextField } from "../../components/ui";
import { DataState, Panel, Pill, SegmentTabs, SubScreen } from "../../components/StudentKit";
import { APP_STATUS, canConsent, EVT_KIND, EVT_STATUS, fetchEvents, giveConsent, type FamilyEvent } from "../../api/family";
import { errorText, useLoad } from "../../hooks/useLoad";
import { schoolTime } from "../../lib/studentData";
import { COLORS, SPACING } from "../../theme/tokens";

const CONSENT: Record<string, string> = { approved: "موافق", declined: "غير موافق" };

/** الفعاليات والرحلات والدورات؛ موافقة الرحلات لولي الأمر فقط. */
export const Events: React.FC<{ onBack?: () => void; embedded?: boolean }> = ({ onBack, embedded }) => {
  const q = useLoad(fetchEvents, []);
  const [tab, setTab] = useState<"events" | "courses" | "apps">("events");
  const body = (
    <DataState loading={q.loading} error={q.error} onRetry={q.reload}>
      <SegmentTabs label="الفعاليات" value={tab} onChange={setTab} items={[{ key: "events", label: "الفعاليات" }, { key: "courses", label: "الدورات" }, { key: "apps", label: "طلباتي" }]} />
      {tab === "events" ? (
        q.data?.events.length ? <View style={styles.list}>{q.data.events.map((e) => <EventCard key={`${e.id}-${e.student_id ?? ""}`} e={e} guardian={!!q.data?.guardian} onDone={q.reload} />)}</View>
          : <DataState empty emptyTitle="لا توجد فعاليات حاليًا" />
      ) : null}
      {tab === "courses" ? (
        q.data?.courses.length ? (
          <View style={styles.list}>
            {q.data.courses.map((c) => (
              <Panel key={c.id} style={styles.card}>
                <AppText variant="bodyStrong" weight="extrabold">{c.title}</AppText>
                <AppText variant="micro" color={COLORS.mutedForeground}>{[c.school, c.location, c.trainer].filter(Boolean).join(" · ")}</AppText>
                {c.description ? <AppText variant="caption">{c.description}</AppText> : null}
                {c.sessions?.[0] ? <AppText variant="caption">{`تبدأ ${schoolTime(c.sessions[0].starts_at)}`}</AppText> : null}
                {c.reg_closes ? <AppText variant="micro" color={COLORS.mutedForeground}>{`يغلق التسجيل ${schoolTime(c.reg_closes)}`}</AppText> : null}
              </Panel>
            ))}
          </View>
        ) : <DataState empty emptyTitle="لا توجد دورات متاحة" />
      ) : null}
      {tab === "apps" ? (
        q.data?.apps.length ? (
          <Panel>
            {q.data.apps.map((a, i) => (
              <View key={a.id} style={[styles.app, i > 0 && styles.border]}>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={2}>{a.item}</AppText>
                  <AppText variant="micro" color={COLORS.mutedForeground}>{`${a.student ?? ""}${a.ref ? ` · ${a.ref}` : ""} · ${schoolTime(a.created_at)}`}</AppText>
                </View>
                <Pill label={APP_STATUS[a.status] ?? a.status} tone={a.status === "accepted" ? "success" : a.status === "rejected" ? "danger" : "primary"} />
              </View>
            ))}
          </Panel>
        ) : <DataState empty emptyTitle="لا توجد طلبات تسجيل" />
      ) : null}
    </DataState>
  );
  if (embedded) return <View style={styles.list}>{body}</View>;
  return <SubScreen title="الأنشطة والفعاليات" eyebrow="فعاليات المدرسة" onBack={onBack} refreshing={q.loading} onRefresh={q.reload}>{body}</SubScreen>;
};

const EventCard: React.FC<{ e: FamilyEvent; guardian: boolean; onDone: () => void }> = ({ e, guardian, onDone }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(e.consent?.decision ? "" : "");
  const [phone, setPhone] = useState("");
  const [ack, setAck] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const can = guardian && canConsent(e);
  const decide = async (decision: "approved" | "declined") => {
    setErr(null);
    if (decision === "approved" && e.need_emergency && (!name.trim() || !phone.trim())) return setErr("اكتب اسم ورقم جهة الطوارئ");
    if (decision === "approved" && e.need_medical && !ack) return setErr("الإقرار الصحي مطلوب");
    setBusy(true);
    try { await giveConsent(e, decision, { emergency_name: name, emergency_phone: phone, medical_ack: ack, medical_note: note }); setOpen(false); onDone(); } catch (x) { setErr(errorText(x)); } finally { setBusy(false); }
  };
  return (
    <Panel style={styles.card}>
      <View style={styles.row}>
        <AppText variant="bodyStrong" weight="extrabold" style={styles.flex}>{e.title}</AppText>
        <Pill label={e.status === "published" ? EVT_KIND[e.kind] ?? e.kind : EVT_STATUS[e.status] ?? e.status} tone={e.status === "cancelled" ? "danger" : "primary"} />
      </View>
      <AppText variant="micro" color={COLORS.mutedForeground}>{[e.student, e.school, e.location].filter(Boolean).join(" · ")}</AppText>
      {e.sessions?.map((s, i) => <AppText key={i} variant="caption">{`${s.title ? `${s.title}: ` : ""}${schoolTime(s.starts_at)}`}</AppText>)}
      {e.description ? <AppText variant="caption">{e.description}</AppText> : null}
      {e.conditions ? <AppText variant="micro" color={COLORS.mutedForeground}>{`الشروط: ${e.conditions}`}</AppText> : null}
      {e.status === "cancelled" && e.cancel_reason ? <Notice tone="warning">{`أُلغيت: ${e.cancel_reason}`}</Notice> : null}
      {e.consent_required ? (
        <AppText variant="caption" weight="bold" color={e.consent ? COLORS.primary : "#8a5a12"}>
          {`موافقة ولي الأمر: ${e.consent ? CONSENT[e.consent.decision] ?? e.consent.decision : "لم ترد بعد"}${e.consent_deadline ? ` · آخر موعد ${schoolTime(e.consent_deadline)}` : ""}`}
        </AppText>
      ) : null}
      {can && !open ? <Button title={e.consent ? "تعديل الموافقة" : "الرد على الموافقة"} variant="secondary" onPress={() => setOpen(true)} /> : null}
      {can && open ? (
        <View style={styles.list}>
          {e.need_emergency ? <><TextField label="اسم جهة الطوارئ" value={name} onChangeText={setName} /><TextField label="رقم جهة الطوارئ" value={phone} onChangeText={setPhone} keyboardType="phone-pad" ltr /></> : null}
          {e.need_medical ? (
            <>
              <Pressable onPress={() => setAck(!ack)} accessibilityRole="checkbox" accessibilityState={{ checked: ack }} style={styles.row}>
                <View style={[styles.box, ack && styles.on]} />
                <AppText variant="caption" style={styles.flex}>أُقرّ بأن ابني لائق صحيًا للمشاركة، وسأبلغ المدرسة بأي حالة تستدعي الانتباه.</AppText>
              </Pressable>
              <TextField label="ملاحظة صحية (اختياري)" value={note} onChangeText={setNote} />
            </>
          ) : null}
          {err ? <Notice tone="error">{err}</Notice> : null}
          <View style={styles.row}>
            <View style={styles.flex}><Button title="موافق" onPress={() => void decide("approved")} loading={busy} /></View>
            <View style={styles.flex}><Button title="غير موافق" variant="destructive" onPress={() => void decide("declined")} disabled={busy} /></View>
          </View>
        </View>
      ) : null}
    </Panel>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  list: { gap: SPACING.md },
  card: { paddingVertical: SPACING.md, gap: SPACING.xs },
  app: { flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingVertical: SPACING.md },
  border: { borderTopWidth: 1, borderTopColor: COLORS.border },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: COLORS.border },
  on: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
});
