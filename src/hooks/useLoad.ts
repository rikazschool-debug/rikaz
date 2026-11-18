import { useCallback, useEffect, useState } from "react";

/** تحميل بسيط قابل للإلغاء وإعادة المحاولة. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | null; loading: boolean; error: boolean; reload: () => void } {
  const [s, set] = useState<{ data: T | null; loading: boolean; error: boolean }>({ data: null, loading: true, error: false });
  const [n, setN] = useState(0);
  const reload = useCallback(() => setN((x) => x + 1), []);
  useEffect(() => {
    let alive = true;
    set((x) => ({ ...x, loading: true, error: false }));
    fn().then((data) => alive && set({ data, loading: false, error: false })).catch(() => alive && set({ data: null, loading: false, error: true }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, ...deps]);
  return { ...s, reload };
}

/** رسالة الخادم إن كانت عربية، وإلا رسالة عامة (لا تظهر تفاصيل تقنية للمستخدم). */
export function errorText(e: unknown, fallback = "تعذّر تنفيذ الطلب. حاول مرة أخرى."): string {
  const m = (e as { message?: string } | null)?.message ?? "";
  return /[\u0600-\u06FF]/.test(m) ? m : fallback;
}
