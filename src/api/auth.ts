import { supabase } from "./client";
import { Portal } from "./types";

export const STAFF_DOMAIN = "staff.rikaz.app";
export const GUARDIAN_DOMAIN = "guardian.rikaz.app";
export const STUDENT_DOMAIN = "student.rikaz.app";

export function toLoginEmail(input: string): string {
  const v = input.trim();
  if (/^[\d\s+-]{6,}$/.test(v)) {
    return `${v.replace(/\D/g, "")}@${GUARDIAN_DOMAIN}`;
  }
  if (!v.includes("@") && /^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/.test(v)) {
    return `${v.toLowerCase()}@${STAFF_DOMAIN}`;
  }
  return v;
}

export function studentLoginEmail(nid: string): string {
  return `${nid.replace(/\D/g, "")}@${STUDENT_DOMAIN}`;
}

export function idLoginMessage(key: string): string {
  switch (key) {
    case "invalid": return "أدخل رقم هوية أو إقامة صحيحًا من 10 أرقام.";
    case "cooldown": return "انتظر دقيقة قبل طلب رمز جديد.";
    case "too_many": return "تجاوزت عدد طلبات الرمز. حاول بعد 15 دقيقة.";
    case "wrong": return "الرمز غير صحيح.";
    case "expired": return "انتهت صلاحية الرمز. اطلب رمزًا جديدًا.";
    case "used": return "هذا الرمز لم يعد صالحًا. اطلب رمزًا جديدًا.";
    case "locked": return "تجاوزت عدد المحاولات. حاول بعد 15 دقيقة.";
    case "send_failed": return "تعذر إرسال الرمز الآن. حاول لاحقًا أو تواصل مع الإدارة.";
    case "student_mismatch": return "تعذر الدخول بالبيانات المدخلة. تأكد من رقم الهوية ورقم الطالب.";
    case "not_found":
    case "no_account":
    case "no_phone":
      return "تعذر العثور على حساب مسجل بهذه الهوية. تواصل مع المدرسة.";
    default: return "حدث خطأ غير متوقع. حاول مرة أخرى.";
  }
}

// Student Login via ID and C-Smart ID
export async function studentSignIn(nid: string, csmart: string) {
  const cleanNid = nid.replace(/\D/g, "").slice(0, 10);
  const cleanCsmart = csmart.trim();
  if (cleanNid.length !== 10 || !cleanCsmart) {
    throw new Error(idLoginMessage("student_mismatch"));
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://czoaudsfbinpkwqsmhrd.supabase.co";
  
  // Call server function for student verification
  const response = await fetch(`${apiUrl}/api/public/auth/student-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nid: cleanNid, csmart: cleanCsmart }),
  });

  const res = await response.json();
  if (!response.ok || res.error || !res.token) {
    throw new Error(idLoginMessage(res.error || "student_mismatch"));
  }

  // Complete magiclink authentication in Supabase
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: res.token,
    type: "magiclink",
  });
  if (error) throw error;
  return data;
}

// Request OTP Code for Guardian / Staff
export async function requestIdCode(nid: string, portal: "guardian" | "staff") {
  const cleanNid = nid.replace(/\D/g, "").slice(0, 10);
  if (!/^[12]\d{9}$/.test(cleanNid)) {
    throw new Error(idLoginMessage("invalid"));
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://czoaudsfbinpkwqsmhrd.supabase.co";
  const response = await fetch(`${apiUrl}/api/public/auth/request-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nid: cleanNid, portal }),
  });

  const res = await response.json();
  if (!response.ok || res.error) {
    throw new Error(idLoginMessage(res.error || "send_failed"));
  }

  return {
    challenge: res.challenge,
    masked: res.masked,
  };
}

// Verify OTP Code and establish session
export async function verifyIdCode(challenge: string, code: string, portal: "guardian" | "staff") {
  const cleanCode = code.replace(/\D/g, "").slice(0, 6);
  if (cleanCode.length !== 6) {
    throw new Error(idLoginMessage("wrong"));
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://czoaudsfbinpkwqsmhrd.supabase.co";
  const response = await fetch(`${apiUrl}/api/public/auth/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge, code: cleanCode, portal }),
  });

  const res = await response.json();
  if (!response.ok || res.error || !res.token) {
    throw new Error(idLoginMessage(res.error || "wrong"));
  }

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: res.token,
    type: "magiclink",
  });
  if (error) throw error;
  return data;
}

// Password sign-in for staff / accounts with passwords
export async function passwordSignIn(identifier: string, password: string) {
  const email = toLoginEmail(identifier);
  let { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  // Fallback for student national ID
  if (error && /^[\d\s+-]{6,}$/.test(identifier.trim())) {
    const studentEmail = studentLoginEmail(identifier);
    const res = await supabase.auth.signInWithPassword({ email: studentEmail, password });
    if (!res.error) {
      data = res.data;
      error = null;
    }
  }

  if (error) {
    throw new Error("بيانات الدخول غير صحيحة. تحقق من اسم المستخدم وكلمة المرور.");
  }
  return data;
}
