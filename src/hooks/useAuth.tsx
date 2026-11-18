import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../api/client";
import { fetchProfileName, fetchSchoolPerms, loadContexts, setActiveContext } from "../api/context";
import { AppContext, SchoolPerms } from "../api/types";
import { contextsSignature, resolveActive } from "../lib/contexts";
import { clearActiveKey, readActiveKey, saveActiveKey } from "../lib/storage";
import { CONFIG } from "../config";
import {
  authFailureSummary,
  authDiagnosticDetails,
  logAuthDiagnostic,
  type AuthFailureSummary,
} from "../lib/authDiagnostics";

type Status = "loading" | "signedOut" | "signedIn";

interface AuthValue {
  status: Status;
  session: Session | null;
  fullName: string | null;
  contexts: AppContext[];
  /** الصفة النشطة؛ null حتى يختار من لديه أكثر من دور */
  active: AppContext | null;
  mustChoose: boolean;
  contextsLoading: boolean;
  contextsError: boolean;
  contextFailure: AuthFailureSummary | null;
  /** صلاحيات المدرسة النشطة؛ null أثناء التحميل أو عند عدم وجود مدرسة */
  perms: SchoolPerms | null;
  switching: boolean;
  /** هل يملك الشخص مفتاح صلاحية في المدرسة النشطة؟ (عرض فقط؛ الخادم يعيد التحقق في كل إجراء) */
  can: (permKey: string) => boolean;
  chooseContext: (key: string) => Promise<void>;
  reloadContexts: () => Promise<void>;
  signOut: () => Promise<boolean>;
}

const Ctx = createContext<AuthValue | null>(null);
const REFRESH_MS = 30_000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [contexts, setContexts] = useState<AppContext[]>([]);
  const [active, setActive] = useState<AppContext | null>(null);
  const [mustChoose, setMustChoose] = useState(false);
  const [contextsLoading, setContextsLoading] = useState(false);
  const [contextsError, setContextsError] = useState(false);
  const [contextFailure, setContextFailure] = useState<AuthFailureSummary | null>(null);
  const [perms, setPerms] = useState<SchoolPerms | null>(null);
  const [switching, setSwitching] = useState(false);

  const userIdRef = useRef<string | null>(null);
  const sigRef = useRef<string | null>(null);
  const activeRef = useRef<AppContext | null>(null);
  // رقم تسلسلي لكل تبديل: أي نتيجة متأخرة من صفة سابقة تُهمل ولا تختلط بالحالية
  const switchSeq = useRef(0);

  const resetAll = useCallback(() => {
    switchSeq.current++;
    userIdRef.current = null;
    sigRef.current = null;
    activeRef.current = null;
    setFullName(null);
    setContexts([]);
    setActive(null);
    setMustChoose(false);
    setPerms(null);
    setContextsError(false);
    setContextFailure(null);
    setSwitching(false);
  }, []);

  /** تفعيل صفة: مسح صلاحيات الصفة السابقة أولًا، ثم إبلاغ الخادم، ثم جلب صلاحيات المدرسة الجديدة */
  const applyContext = useCallback(async (c: AppContext) => {
    const seq = ++switchSeq.current;
    setPerms(null);
    setSwitching(true);
    activeRef.current = c;
    setActive(c);
    setMustChoose(false);
    if (!CONFIG.readOnlyLoginTest) await saveActiveKey(c.key);
    try {
      if (CONFIG.readOnlyLoginTest) {
        setPerms(null);
        logAuthDiagnostic("active-context", "skipped");
        return;
      }
      await setActiveContext(c);
      const p = c.schoolId ? await fetchSchoolPerms(c.schoolId) : {};
      if (seq === switchSeq.current) setPerms(p);
    } catch (error) {
      const failure = authFailureSummary(error, "active-context");
      logAuthDiagnostic(failure.stage, "failure", { status: failure.status });
      if (seq === switchSeq.current) {
        setPerms({});
        setContextFailure(failure);
      }
    } finally {
      if (seq === switchSeq.current) setSwitching(false);
    }
  }, []);

  const refreshContexts = useCallback(
    async (userId: string, initial: boolean) => {
      if (initial) setContextsLoading(true);
      try {
        const list = await loadContexts(userId);
        if (userIdRef.current !== userId) return; // خرج المستخدم أثناء التحميل
        const sig = contextsSignature(list);
        const changed = sigRef.current !== null && sigRef.current !== sig;
        sigRef.current = sig;
        setContexts(list);
        setContextsError(false);
        setContextFailure(null);
        if (initial || changed) {
          const current = activeRef.current;
          const stillValid = current ? list.find((c) => c.key === current.key) : undefined;
          if (stillValid && !initial) {
            // الصفات تغيّرت والصفة الحالية باقية: إعادة جلب صلاحياتها تحت النطاق الجديد
            await applyContext(stillValid);
          } else {
            const saved = initial && !CONFIG.readOnlyLoginTest ? await readActiveKey() : null;
            const { active: next, mustChoose: choose } = resolveActive(list, saved);
            if (next) await applyContext(next);
            else {
              switchSeq.current++;
              activeRef.current = null;
              setActive(null);
              setPerms(null);
              setMustChoose(choose);
              if (!CONFIG.readOnlyLoginTest) await clearActiveKey();
            }
          }
        }
      } catch (error) {
        const failure = authFailureSummary(error, "context-load");
        logAuthDiagnostic(failure.stage, "failure", { status: failure.status });
        setContextFailure(failure);
        if (initial) setContextsError(true);
      } finally {
        if (initial) setContextsLoading(false);
      }
    },
    [applyContext],
  );

  const onSession = useCallback(
    (s: Session | null) => {
      setSession(s);
      const uid = s?.user?.id ?? null;
      if (!uid) {
        resetAll();
        setStatus("signedOut");
        return;
      }
      setStatus("signedIn");
      if (userIdRef.current === uid) return; // تجديد الرمز لنفس الشخص
      resetAll();
      userIdRef.current = uid;
      void fetchProfileName(uid).then((n) => userIdRef.current === uid && setFullName(n));
      void refreshContexts(uid, true);
    },
    [refreshContexts, resetAll],
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => onSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => onSession(s));
    return () => data.subscription.unsubscribe();
  }, [onSession]);

  // إعادة التحقق من الأدوار دوريًا وعند العودة للتطبيق: الدور المسحوب يتوقف فورًا دون انتظار تسجيل الخروج
  useEffect(() => {
    if (status !== "signedIn") return;
    const tick = () => userIdRef.current && void refreshContexts(userIdRef.current, false);
    const timer = setInterval(tick, REFRESH_MS);
    const sub = AppState.addEventListener("change", (st) => st === "active" && tick());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [status, refreshContexts]);

  const chooseContext = useCallback(
    async (key: string) => {
      const c = contexts.find((x) => x.key === key);
      if (!c) return;
      if (activeRef.current?.key === key && !mustChoose) return;
      await applyContext(c);
    },
    [contexts, applyContext, mustChoose],
  );

  const reloadContexts = useCallback(async () => {
    if (userIdRef.current) await refreshContexts(userIdRef.current, true);
  }, [refreshContexts]);

  const signOut = useCallback(async () => {
    // Sign out this app instance only: the test must not revoke server sessions elsewhere.
    await clearActiveKey();
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        logAuthDiagnostic("session", "failure", authDiagnosticDetails(error));
        return false;
      }
      resetAll();
      setSession(null);
      setStatus("signedOut");
      return true;
    } catch (error) {
      logAuthDiagnostic("session", "failure", authDiagnosticDetails(error));
      return false;
    }
  }, [resetAll]);

  const can = useCallback((k: string) => !!perms?.[k], [perms]);

  const value = useMemo<AuthValue>(
    () => ({ status, session, fullName, contexts, active, mustChoose, contextsLoading, contextsError, contextFailure, perms, switching, can, chooseContext, reloadContexts, signOut }),
    [status, session, fullName, contexts, active, mustChoose, contextsLoading, contextsError, contextFailure, perms, switching, can, chooseContext, reloadContexts, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
