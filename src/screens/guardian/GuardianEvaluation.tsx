import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Star } from "lucide-react-native";
import { AppText, Button, Notice, TextField } from "../../components/ui";
import { Chips, DataState, Panel, SubScreen } from "../../components/StudentKit";
import { fetchEvalChildren, fetchEvalTeachers, saveEval, type EvalTeacher } from "../../api/teacher";
import { errorText, useLoad } from "../../hooks/useLoad";
import { evalScore } from "../../lib/teacherData";
import { schoolDate } from "../../lib/studentData";
import { COLORS, SPACING } from "../../theme/tokens";

/** تقييم ولي الأمر لمعلمي ابنه الحاليين (ev_g_*) — نفس نموذج المنصة وخصوصيتها. */
export const GuardianEvaluation: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const kids = useLoad(fetchEvalChildren, []);
  const [kid, setKid] = useState("");
  useEffect(() => { if (!kid && kids.data?.length) setKid(kids.data[0]!.id); }, [kids.data, kid]);
  const data = useLoad(() => (kid ? fetchEvalTeachers(kid) : Promise.resolve(null)), [kid]);
  const [open, setOpen] = useState<EvalTeacher | null>(null);
  const [ans, setAns] = useState<Record<string, number | "na">>({});
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const form = data.data?.form;

  async function save() {
    if (!open || !form) return;
    setBusy(true); setMsg(null);
    try { await saveEval(kid, open.teacher_id, ans, comment); setOpen(null); setMsg({ tone: "success", text: "حُفظ تقييمك ويمكنك تعديله لاحقًا" }); data.reload(); }
    catch (e) { setMsg({ tone: "error", text: errorText(e) }); } finally { setBusy(false); }
  }

  if (open && form) {
    const sc = evalScore(form.items.map((i) => i.code), ans);
    return (
      <SubScreen title={`تقييم ${open.name}`} eyebrow={open.subjects} onBack={() => setOpen(null)}>
        <Notice tone="info">المقياس من ١ (ضعيف جدًا) إلى ٥ (ممتاز). التقييم ليس مجهولًا: يطّلع عليه مدير المدرسة ومالك المؤسسة فقط، ولا يراه المعلم.</Notice>
        {form.items.map((it, n) => (
          <Panel key={it.code} style={styles.card}>
            <AppText variant="bodyStrong">{`${n + 1}. ${it.text}`}</AppText>
            {it.desc ? <AppText variant="micro" color={COLORS.mutedForeground}>{it.desc}</AppText> : null}
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((v) => {
                const on = typeof ans[it.code] === "number" && (ans[it.code] as number) >= v;
                return (
                  <Pressable key={v} accessibilityRole="button" accessibilityLabel={`${v} من 5`} accessibilityState={{ selected: ans[it.code] === v }} hitSlop={6} onPress={() => setAns((a) => ({ ...a, [it.code]: v }))}>
                    <Star size={30} color={COLORS.accent} fill={on ? COLORS.accent : "transparent"} />
                  </Pressable>
                );
              })}
            </View>
            {it.na ? (
              <Pressable accessibilityRole="button" accessibilityState={{ selected: ans[it.code] === "na" }} onPress={() => setAns((a) => ({ ...a, [it.code]: "na" }))}>
                <AppText variant="label" weight="bold" color={ans[it.code] === "na" ? COLORS.primary : COLORS.mutedForeground}>لا أستطيع التقييم</AppText>
              </Pressable>
            ) : null}
          </Panel>
        ))}
        <TextField label="تعليق (اختياري) — يراه المدير والمالك فقط" value={comment} onChangeText={setComment} multiline />
        <AppText variant="caption">{`أُجيب ${sc.answered} من ${sc.total}${sc.avg != null ? ` · المتوسط ${sc.avg} من 5` : ""}`}</AppText>
        {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
        <Button title="حفظ التقييم" loading={busy} disabled={!sc.answered} onPress={() => void save()} />
      </SubScreen>
    );
  }

  return (
    <SubScreen title="تقييم المعلمين" eyebrow="معلمو ابنك الحاليون" onBack={onBack} refreshing={data.loading} onRefresh={data.reload}>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <DataState loading={kids.loading} error={kids.error} empty={!kids.data?.length} emptyTitle="لا يوجد أبناء مرتبطون بحسابك بعلاقة موثقة" onRetry={kids.reload}>
        {(kids.data?.length ?? 0) > 1 ? <Chips label="الأبناء" value={kid} onChange={setKid} items={(kids.data ?? []).map((k) => ({ key: k.id, label: k.name }))} /> : null}
        <DataState loading={data.loading} error={data.error} empty={!data.data?.teachers.length} emptyTitle="لا يوجد معلمون حاليون لهذا الابن" onRetry={data.reload}>
          <View style={styles.list}>
            {(data.data?.teachers ?? []).map((t) => (
              <Panel key={t.teacher_id} style={styles.card}>
                <AppText variant="bodyStrong" weight="extrabold">{t.name}</AppText>
                <AppText variant="micro" color={COLORS.mutedForeground}>{t.subjects}</AppText>
                <AppText variant="caption">{t.rating ? `قيّمته — آخر تعديل ${schoolDate(t.rating.updated_at.slice(0, 10))}` : "لم تقيّمه بعد"}</AppText>
                <Button title={t.rating ? "تعديل التقييم" : "تقييم"} variant={t.rating ? "secondary" : "primary"} onPress={() => { setMsg(null); setOpen(t); setAns(t.rating?.answers ?? {}); setComment(t.rating?.comment ?? ""); }} />
              </Panel>
            ))}
          </View>
        </DataState>
      </DataState>
    </SubScreen>
  );
};

const styles = StyleSheet.create({
  list: { gap: SPACING.sm },
  card: { paddingVertical: SPACING.md, gap: SPACING.sm },
  stars: { flexDirection: "row", gap: SPACING.sm },
});
