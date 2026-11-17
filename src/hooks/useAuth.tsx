import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../api/client";
import { ActiveContext, MembershipItem, Role, ROLE_LABELS, SchoolPerms } from "../api/types";
import { fetchSchoolPerms, fetchUserMemberships, setActiveContext as rpcSetActiveContext } from "../api/context";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  memberships: MembershipItem[];
  activeContext: ActiveContext | null;
  switchContext: (schoolId: string, role: Role, schoolName: string, orgId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [memberships, setMemberships] = useState<MembershipItem[]>([]);
  const [activeContext, setActiveContextState] = useState<ActiveContext | null>(null);

  // Restore session on app startup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        initUserContext(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        initUserContext(session.user.id);
      } else {
        // Zero-leakage cleanup on logout or session expiration
        setActiveContextState(null);
        setMemberships([]);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function initUserContext(userId: string) {
    try {
      setLoading(true);
      const items = await fetchUserMemberships(userId);
      setMemberships(items);

      if (items.length > 0) {
        // Select first active membership by default or trigger choose-role
        const first = items[0];
        if (first.school_id) {
          await switchContext(first.school_id, first.role, first.school_name || "", first.org_id);
        }
      }
    } catch (err) {
      console.error("Failed to load user memberships:", err);
    } finally {
      setLoading(false);
    }
  }

  // Switch context with complete zero-leakage cache clearance
  async function switchContext(schoolId: string, role: Role, schoolName: string, orgId: string) {
    try {
      // 1. Clear previous permissions and context state first
      setActiveContextState(null);

      // 2. Set context on backend
      await rpcSetActiveContext(schoolId, role);

      // 3. Fetch exact active permissions for this specific school
      const perms = await fetchSchoolPerms(schoolId);

      // 4. Update active context state
      setActiveContextState({
        orgId,
        schoolId,
        schoolName,
        role,
        roleLabel: ROLE_LABELS[role] || role,
        permissions: perms,
      });
    } catch (err) {
      console.error("Context switch error:", err);
    }
  }

  async function refreshPermissions() {
    if (!activeContext?.schoolId) return;
    const perms = await fetchSchoolPerms(activeContext.schoolId);
    setActiveContextState(prev => prev ? { ...prev, permissions: perms } : null);
  }

  async function signOut() {
    try {
      setLoading(true);
      // Zero-leakage: wipe all local states immediately
      setActiveContextState(null);
      setMemberships([]);
      setUser(null);
      setSession(null);
      await supabase.auth.signOut();
    } catch (err) {
      console.error("SignOut error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        memberships,
        activeContext,
        switchContext,
        signOut,
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
