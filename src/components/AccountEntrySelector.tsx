import React from "react";
import { GraduationCap, School, Users } from "lucide-react-native";
import { Segmented, SegmentOption } from "./ui";

export type AccountEntry = "student" | "guardian" | "staff";

const OPTIONS: SegmentOption<AccountEntry>[] = [
  { key: "staff", label: "الكادر التعليمي", icon: School },
  { key: "student", label: "الطالب", icon: GraduationCap },
  { key: "guardian", label: "ولي الأمر", icon: Users },
];

export const ENTRY_CONTENT: Record<AccountEntry, { title: string; description: string }> = {
  student: { title: "الدخول إلى حساب الطالب", description: "رقم الهوية أو الإقامة ورقم الطالب في C‑Smart" },
  guardian: { title: "الدخول إلى حساب ولي الأمر", description: "رمز تحقق عبر واتساب إلى الجوال المسجل لدى المدرسة" },
  staff: { title: "الدخول إلى حساب الكادر التعليمي", description: "رمز تحقق عبر واتساب إلى الجوال المسجل لدى المدرسة" },
};

export function AccountEntrySelector({ value, onChange }: { value: AccountEntry; onChange: (value: AccountEntry) => void }) {
  return <Segmented label="نوع الحساب" options={OPTIONS} value={value} onChange={onChange} />;
}