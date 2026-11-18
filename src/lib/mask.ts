/** إخفاء جزئي لرقم الهوية والجوال في واجهة الحساب. */
export function maskNationalId(v: string | null | undefined): string | null {
  const d = (v ?? "").replace(/\D/g, "");
  if (d.length < 6) return d || null;
  return `${d.slice(0, 2)}${"•".repeat(d.length - 5)}${d.slice(-3)}`;
}

export function maskPhone(v: string | null | undefined): string | null {
  let d = (v ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("966")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length < 5) return null;
  return `+966 ${d.charAt(0)}${"•".repeat(d.length - 4)}${d.slice(-3)}`;
}

/** تواريخ أيام الدراسة (الأحد–الخميس) للأسبوع الحالي. */
export function schoolWeek(today: Date): { label: string; day: number; isToday: boolean }[] {
  const labels = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس"];
  const start = new Date(today);
  const dow = today.getDay(); // 0 = الأحد
  const offset = dow <= 4 ? dow : dow - 7; // الجمعة والسبت ← الأسبوع القادم
  start.setDate(today.getDate() - offset);
  return labels.map((label, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { label, day: d.getDate(), isToday: d.toDateString() === today.toDateString() };
  });
}
