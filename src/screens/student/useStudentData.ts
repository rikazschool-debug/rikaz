import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchMyStudentId } from "../../api/student";
import { useAuth } from "../../hooks/useAuth";

export type Load<T> = { data: T | null; loading: boolean; error: boolean; reload: () => void };

/**
 * الطالب المعروض: غير محدد = الطالب صاحب الجلسة، ومحدد = ابن ولي الأمر المختار.
 * الخادم (is_guardian_of / is_student_self) هو من يقرر السماح في الحالتين.
 */
const ScopeCtx = createContext<{ studentId: string; schoolId: string } | null>(null);
export const StudentScope: React.FC<{ studentId: string; schoolId: string; children: React.ReactNode }> = ({ studentId, schoolId, children }) =>
  React.createElement(ScopeCtx.Provider, { value: { studentId, schoolId } }, children);
export const useStudentScope = () => useContext(ScopeCtx);

/** يحمّل بيانات الطالب من المنصة للمدرسة النشطة؛ يعيد التحميل عند تبديل الحساب أو الابن. */
export function useStudentQuery<T>(fn: (schoolId: string, studentId: string) => Promise<T>, deps: unknown[] = []): Load<T> & { missing: boolean } {
  const { active } = useAuth();
  const scope = useContext(ScopeCtx);
  const schoolId = scope?.schoolId ?? active?.schoolId ?? null;
  const fixed = scope?.studentId ?? null;
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: boolean; missing: boolean }>({ data: null, loading: true, error: false, missing: false });
  const [n, setN] = useState(0);
  const reload = useCallback(() => setN((x) => x + 1), []);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: false }));
    (async () => {
      if (!schoolId) return alive && setState({ data: null, loading: false, error: false, missing: true });
      const id = fixed ?? (await fetchMyStudentId(schoolId));
      if (!id) return alive && setState({ data: null, loading: false, error: false, missing: true });
      const data = await fn(schoolId, id);
      if (alive) setState({ data, loading: false, error: false, missing: false });
    })().catch(() => alive && setState({ data: null, loading: false, error: true, missing: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, fixed, n, ...deps]);
  return { ...state, reload };
}
