"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { useAuth } from "@/components/providers/auth-provider";
import {
  createOrganizationForUser,
  type AppIdentityUser,
  type AppUserProfile,
  type CreateOrganizationInput,
  getOrganizationMembers,
  getOrganizationSummary,
  joinOrganizationWithInvite,
  type OrganizationMemberSummary,
  type OrganizationMembership,
  previewOrganizationInvite,
  type OrganizationInvite,
  type OrganizationSummary,
  setActiveOrganizationForUser,
  syncAppSession,
} from "@/lib/app-identity";

type AppSessionContextValue = {
  authUser: FirebaseUser | null;
  profile: AppUserProfile | null;
  dataConnectUser: AppIdentityUser | null;
  memberships: OrganizationMembership[];
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
  activeRole: string | null;
  activeOrganization: OrganizationSummary | null;
  activeOrganizationMembers: OrganizationMemberSummary[];
  loading: boolean;
  organizationLoading: boolean;
  error: string | null;
  needsOnboarding: boolean;
  refreshSession: () => Promise<void>;
  setActiveOrganization: (organizationId: string) => Promise<void>;
  createOrganization: (input: CreateOrganizationInput) => Promise<void>;
  joinWithInvite: (inviteCode: string) => Promise<void>;
  previewInvite: (inviteCode: string) => Promise<OrganizationInvite | null>;
};

const AppSessionContext = createContext<AppSessionContextValue | null>(null);

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [dataConnectUser, setDataConnectUser] = useState<AppIdentityUser | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(null);
  const [activeOrganizationName, setActiveOrganizationName] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [activeOrganization, setActiveOrganization] = useState<OrganizationSummary | null>(null);
  const [activeOrganizationMembers, setActiveOrganizationMembers] = useState<
    OrganizationMemberSummary[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [organizationLoading, setOrganizationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(
    async (currentUser: FirebaseUser | null, currentAuthLoading: boolean) => {
      if (currentAuthLoading) {
        return;
      }

      if (!currentUser) {
        setProfile(null);
        setDataConnectUser(null);
        setMemberships([]);
        setActiveOrganizationIdState(null);
        setActiveOrganizationName(null);
        setActiveRole(null);
        setActiveOrganization(null);
        setActiveOrganizationMembers([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const snapshot = await syncAppSession(currentUser);
        setProfile(snapshot.profile);
        setDataConnectUser(snapshot.dataConnectUser);
        setMemberships(snapshot.memberships);
        setActiveOrganizationIdState(snapshot.activeOrganizationId);
        setActiveOrganizationName(snapshot.activeOrganizationName);
        setActiveRole(snapshot.activeRole);
      } catch (sessionError) {
        setError(
          sessionError instanceof Error
            ? sessionError.message
            : "セッションの初期化に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await loadSession(user, authLoading);
      if (cancelled) {
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, loadSession, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadOrganization() {
      if (!activeOrganizationId) {
        setActiveOrganization(null);
        setActiveOrganizationMembers([]);
        return;
      }

      setOrganizationLoading(true);
      try {
        const [organization, members] = await Promise.all([
          getOrganizationSummary(activeOrganizationId),
          getOrganizationMembers(activeOrganizationId),
        ]);
        if (cancelled) return;
        setActiveOrganization(organization);
        setActiveOrganizationMembers(members);
      } catch (orgError) {
        if (cancelled) return;
        setError(
          orgError instanceof Error
            ? orgError.message
            : "組織情報の取得に失敗しました"
        );
      } finally {
        if (!cancelled) {
          setOrganizationLoading(false);
        }
      }
    }

    void loadOrganization();

    return () => {
      cancelled = true;
    };
  }, [activeOrganizationId]);

  const refreshSession = useCallback(async () => {
    await loadSession(user, authLoading);
  }, [authLoading, loadSession, user]);

  const switchActiveOrganization = useCallback(async (organizationId: string) => {
    if (!user) {
      throw new Error("ログインが必要です");
    }
    await setActiveOrganizationForUser(user.uid, organizationId);
    await refreshSession();
  }, [refreshSession, user]);

  const createOrganization = useCallback(async (input: CreateOrganizationInput) => {
    if (!user) {
      throw new Error("ログインが必要です");
    }
    await createOrganizationForUser(user, input);
    await refreshSession();
  }, [refreshSession, user]);

  const joinWithInvite = useCallback(async (inviteCode: string) => {
    if (!user) {
      throw new Error("ログインが必要です");
    }
    await joinOrganizationWithInvite(user, inviteCode);
    await refreshSession();
  }, [refreshSession, user]);

  const previewInvite = useCallback(async (inviteCode: string) => {
    if (!inviteCode.trim()) {
      return null;
    }
    return previewOrganizationInvite(inviteCode);
  }, []);

  const value = useMemo<AppSessionContextValue>(
    () => ({
      authUser: user,
      profile,
      dataConnectUser,
      memberships,
      activeOrganizationId,
      activeOrganizationName,
      activeRole,
      activeOrganization,
      activeOrganizationMembers,
      loading: authLoading || loading,
      organizationLoading,
      error,
      needsOnboarding: !authLoading && !loading && !!user && memberships.length === 0,
      refreshSession,
      setActiveOrganization: switchActiveOrganization,
      createOrganization,
      joinWithInvite,
      previewInvite,
    }),
    [
      user,
      profile,
      dataConnectUser,
      memberships,
      activeOrganizationId,
      activeOrganizationName,
      activeRole,
      activeOrganization,
      activeOrganizationMembers,
      authLoading,
      loading,
      organizationLoading,
      error,
      refreshSession,
      switchActiveOrganization,
      createOrganization,
      joinWithInvite,
      previewInvite,
    ]
  );

  return (
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  );
}

export function useAppSession() {
  const context = useContext(AppSessionContext);
  if (!context) {
    throw new Error("useAppSession must be used within AppSessionProvider");
  }
  return context;
}
