import { useEffect, useState } from "react";
import { fetchMyProfile, type MyProfile } from "../../api/profile";
import { useAuth } from "../../hooks/useAuth";

/** ملف الطالب من المنصة؛ يبقى فارغًا عند التعذر ولا يمنع عرض الشاشة. */
export function useStudentProfile() {
  const { active } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [failed, setFailed] = useState(false);
  const schoolId = active?.schoolId ?? null;
  useEffect(() => {
    let alive = true;
    setFailed(false);
    fetchMyProfile(schoolId)
      .then((p) => alive && setProfile(p))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [schoolId]);
  return { profile, failed };
}
