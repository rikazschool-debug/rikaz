import { supabase } from "./client";

/** بيانات الملف الشخصي كما تعيدها المنصة (my_profile) — قراءة فقط. */
export interface MyProfile {
  full_name?: string | null;
  national_id?: string | null;
  phone?: string | null;
  email?: string | null;
  section?: string | null;
}

export async function fetchMyProfile(schoolId: string | null | undefined): Promise<MyProfile | null> {
  if (!schoolId) return null;
  const { data, error } = await supabase.rpc("my_profile" as never, { _school: schoolId } as never);
  if (error) throw error;
  return (data as unknown as MyProfile) ?? null;
}
