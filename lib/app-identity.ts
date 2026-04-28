"use client";

import type { User as FirebaseUser } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  executeMutation,
  executeQuery,
  mutationRef,
  queryRef,
} from "firebase/data-connect";
import { db } from "@/lib/firebase";
import { getDataConnectClient } from "@/lib/dataconnect";

const APP_USERS_COLLECTION = "app_users";
const ORGANIZATION_INVITES_COLLECTION = "organization_invites";

export type AppUserProfile = {
  authUid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  lastOrganizationId: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
};

export type AppIdentityUser = {
  id: string;
  authUid: string;
  email: string;
  displayName: string | null;
};

export type OrganizationMembership = {
  id: string;
  organizationId: string;
  organizationName: string;
  role: string;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  prefecture: string | null;
  city: string | null;
  status: string;
};

export type OrganizationMemberSummary = {
  id: string;
  role: string;
  invitationStatus: string;
  user: {
    id: string;
    authUid: string;
    email: string;
    displayName: string | null;
  };
};

export type OrganizationInvite = {
  code: string;
  organizationId: string;
  organizationName: string;
  role: string;
  invitedEmail: string | null;
  status: "active" | "revoked" | "exhausted";
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  createdAt: string;
  updatedAt: string;
  createdByAuthUid: string;
  createdByDisplayName: string | null;
};

export type SessionSnapshot = {
  profile: AppUserProfile;
  dataConnectUser: AppIdentityUser;
  memberships: OrganizationMembership[];
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
  activeRole: string | null;
  needsOnboarding: boolean;
};

export type CreateOrganizationInput = {
  organizationName: string;
  prefecture?: string;
  city?: string;
  primaryFarmName?: string;
};

export type CreateOrganizationInviteInput = {
  organizationId: string;
  organizationName: string;
  role: string;
  invitedEmail?: string;
  expiresInDays?: number;
  maxUses?: number;
  createdByAuthUid: string;
  createdByDisplayName?: string | null;
};

type DUser = {
  id: string;
  authUid: string;
  email: string;
  displayName?: string | null;
};

type QueryResultMap = {
  GetUserByAuthUid: { users: DUser[] };
  GetOrganizationMembersByAuthUid: {
    organizationMembers: Array<{
      id: string;
      role: string;
      organization: { id: string; name: string };
    }>;
  };
  GetOrganizationById: {
    organizations: Array<{
      id: string;
      name: string;
      prefecture?: string | null;
      city?: string | null;
      status: string;
    }>;
  };
  GetOrganizationMembersByOrganization: {
    organizationMembers: Array<{
      id: string;
      role: string;
      invitationStatus: string;
      user: {
        id: string;
        authUid: string;
        email: string;
        displayName?: string | null;
      };
    }>;
  };
};

type MutationResultMap = {
  CreateUser: { user_insert: string };
  UpdateUserProfile: { user_update: string };
  CreateOrganization: { organization_insert: string };
  CreateOrganizationMember: { organizationMember_insert: string };
  CreateFarm: { farm_insert: string };
};

type OperationName = keyof QueryResultMap;
type MutationName = keyof MutationResultMap;

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chars = Array.from(
    { length: 8 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)] ?? "A"
  );
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

async function runQuery<Name extends OperationName, Variables extends object>(
  name: Name,
  variables: Variables
): Promise<QueryResultMap[Name]> {
  const dc = getDataConnectClient();
  const ref = queryRef<QueryResultMap[Name], Variables>(dc, name, variables);
  const result = await executeQuery(ref);
  return result.data;
}

async function runMutation<Name extends MutationName, Variables extends object>(
  name: Name,
  variables: Variables
): Promise<MutationResultMap[Name]> {
  const dc = getDataConnectClient();
  const ref = mutationRef<MutationResultMap[Name], Variables>(dc, name, variables);
  const result = await executeMutation(ref);
  return result.data;
}

function profileDoc(authUid: string) {
  return doc(db, APP_USERS_COLLECTION, authUid);
}

function inviteDoc(code: string) {
  return doc(db, ORGANIZATION_INVITES_COLLECTION, normalizeInviteCode(code));
}

async function ensureFirestoreProfile(authUser: FirebaseUser): Promise<AppUserProfile> {
  const profileRef = profileDoc(authUser.uid);
  const snapshot = await getDoc(profileRef);
  const now = nowIso();
  const nextProfile: AppUserProfile = {
    authUid: authUser.uid,
    email: authUser.email ?? "",
    displayName: authUser.displayName ?? "",
    photoURL: authUser.photoURL ?? null,
    lastOrganizationId:
      (snapshot.exists() ? (snapshot.data().lastOrganizationId as string | null | undefined) : null) ??
      null,
    createdAt:
      (snapshot.exists() ? (snapshot.data().createdAt as string | undefined) : undefined) ?? now,
    updatedAt: now,
    lastLoginAt: now,
  };

  await setDoc(profileRef, nextProfile, { merge: true });
  return nextProfile;
}

async function getOrCreateDataConnectUser(authUser: FirebaseUser): Promise<AppIdentityUser> {
  const existing = await runQuery("GetUserByAuthUid", { authUid: authUser.uid });
  const found = existing.users[0];

  if (!found) {
    await runMutation("CreateUser", {
      authUid: authUser.uid,
      email: authUser.email ?? "",
      displayName: authUser.displayName ?? null,
      authProvider: authUser.providerData[0]?.providerId ?? "password",
    });
    const created = await runQuery("GetUserByAuthUid", { authUid: authUser.uid });
    const user = created.users[0];
    if (!user) {
      throw new Error("Data Connect ユーザーの作成に失敗しました");
    }
    return {
      id: user.id,
      authUid: user.authUid,
      email: user.email,
      displayName: user.displayName ?? null,
    };
  }

  await runMutation("UpdateUserProfile", {
    id: found.id,
    email: authUser.email ?? found.email,
    displayName: authUser.displayName ?? found.displayName ?? null,
    lastLoginAt: nowIso(),
  });

  return {
    id: found.id,
    authUid: found.authUid,
    email: authUser.email ?? found.email,
    displayName: authUser.displayName ?? found.displayName ?? null,
  };
}

async function getMembershipsByAuthUid(authUid: string): Promise<OrganizationMembership[]> {
  const result = await runQuery("GetOrganizationMembersByAuthUid", { authUid });
  return result.organizationMembers.map((member) => ({
    id: member.id,
    organizationId: member.organization.id,
    organizationName: member.organization.name,
    role: member.role,
  }));
}

async function persistLastOrganizationId(
  authUid: string,
  organizationId: string | null
): Promise<void> {
  await setDoc(
    profileDoc(authUid),
    {
      lastOrganizationId: organizationId,
      updatedAt: nowIso(),
    },
    { merge: true }
  );
}

export async function syncAppSession(
  authUser: FirebaseUser
): Promise<SessionSnapshot> {
  const profile = await ensureFirestoreProfile(authUser);
  const dataConnectUser = await getOrCreateDataConnectUser(authUser);
  const memberships = await getMembershipsByAuthUid(authUser.uid);
  const matchingMembership =
    memberships.find((member) => member.organizationId === profile.lastOrganizationId) ??
    memberships[0] ??
    null;

  if (
    matchingMembership?.organizationId !== profile.lastOrganizationId
  ) {
    await persistLastOrganizationId(authUser.uid, matchingMembership?.organizationId ?? null);
  }

  return {
    profile: {
      ...profile,
      lastOrganizationId: matchingMembership?.organizationId ?? null,
    },
    dataConnectUser,
    memberships,
    activeOrganizationId: matchingMembership?.organizationId ?? null,
    activeOrganizationName: matchingMembership?.organizationName ?? null,
    activeRole: matchingMembership?.role ?? null,
    needsOnboarding: memberships.length === 0,
  };
}

export async function setActiveOrganizationForUser(
  authUid: string,
  organizationId: string
): Promise<void> {
  await persistLastOrganizationId(authUid, organizationId);
}

export async function updateUserDisplayNameAcrossStores(
  authUser: FirebaseUser,
  displayName: string
): Promise<void> {
  const current = await runQuery("GetUserByAuthUid", { authUid: authUser.uid });
  const existing = current.users[0];
  const nextName = displayName.trim();

  await setDoc(
    profileDoc(authUser.uid),
    {
      displayName: nextName,
      updatedAt: nowIso(),
    },
    { merge: true }
  );

  if (existing) {
    await runMutation("UpdateUserProfile", {
      id: existing.id,
      email: authUser.email ?? existing.email,
      displayName: nextName || null,
      lastLoginAt: nowIso(),
    });
  }
}

export async function createOrganizationForUser(
  authUser: FirebaseUser,
  input: CreateOrganizationInput
): Promise<{ organizationId: string }> {
  const session = await syncAppSession(authUser);
  const organizationId = (
    await runMutation("CreateOrganization", {
      ownerId: session.dataConnectUser.id,
      name: input.organizationName.trim(),
      prefecture: input.prefecture?.trim() || null,
      city: input.city?.trim() || null,
    })
  ).organization_insert;

  await runMutation("CreateOrganizationMember", {
    organizationId,
    userId: session.dataConnectUser.id,
    role: "owner",
  });

  await runMutation("CreateFarm", {
    organizationId,
    name: input.primaryFarmName?.trim() || `${input.organizationName.trim()} 本園`,
    prefecture: input.prefecture?.trim() || null,
    city: input.city?.trim() || null,
    notes: "オンボーディングで作成",
  });

  await persistLastOrganizationId(authUser.uid, organizationId);
  return { organizationId };
}

export async function getOrganizationSummary(
  organizationId: string
): Promise<OrganizationSummary | null> {
  const result = await runQuery("GetOrganizationById", { organizationId });
  const organization = result.organizations[0];
  if (!organization) {
    return null;
  }
  return {
    id: organization.id,
    name: organization.name,
    prefecture: organization.prefecture ?? null,
    city: organization.city ?? null,
    status: organization.status,
  };
}

export async function getOrganizationMembers(
  organizationId: string
): Promise<OrganizationMemberSummary[]> {
  const result = await runQuery("GetOrganizationMembersByOrganization", {
    organizationId,
  });
  return result.organizationMembers.map((member) => ({
    id: member.id,
    role: member.role,
    invitationStatus: member.invitationStatus,
    user: {
      id: member.user.id,
      authUid: member.user.authUid,
      email: member.user.email,
      displayName: member.user.displayName ?? null,
    },
  }));
}

async function getInvite(code: string): Promise<OrganizationInvite | null> {
  const snapshot = await getDoc(inviteDoc(code));
  if (!snapshot.exists()) {
    return null;
  }
  const data = snapshot.data();
  return {
    code: normalizeInviteCode(snapshot.id),
    organizationId: data.organizationId as string,
    organizationName: data.organizationName as string,
    role: data.role as string,
    invitedEmail: (data.invitedEmail as string | null | undefined) ?? null,
    status: (data.status as OrganizationInvite["status"]) ?? "active",
    expiresAt: (data.expiresAt as string | null | undefined) ?? null,
    maxUses: (data.maxUses as number | null | undefined) ?? null,
    useCount: (data.useCount as number | undefined) ?? 0,
    createdAt: (data.createdAt as string | undefined) ?? "",
    updatedAt: (data.updatedAt as string | undefined) ?? "",
    createdByAuthUid: (data.createdByAuthUid as string | undefined) ?? "",
    createdByDisplayName:
      (data.createdByDisplayName as string | null | undefined) ?? null,
  };
}

export async function previewOrganizationInvite(
  code: string
): Promise<OrganizationInvite | null> {
  return getInvite(code);
}

export async function createOrganizationInvite(
  input: CreateOrganizationInviteInput
): Promise<OrganizationInvite> {
  const normalizedEmail = normalizeEmail(input.invitedEmail);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateInviteCode();
    const target = inviteDoc(code);
    const existing = await getDoc(target);
    if (existing.exists()) {
      continue;
    }

    const now = nowIso();
    const expiresAt =
      input.expiresInDays && input.expiresInDays > 0
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const invite: OrganizationInvite = {
      code,
      organizationId: input.organizationId,
      organizationName: input.organizationName,
      role: input.role,
      invitedEmail: normalizedEmail || null,
      status: "active",
      expiresAt,
      maxUses: input.maxUses && input.maxUses > 0 ? input.maxUses : 1,
      useCount: 0,
      createdAt: now,
      updatedAt: now,
      createdByAuthUid: input.createdByAuthUid,
      createdByDisplayName: input.createdByDisplayName ?? null,
    };

    await setDoc(target, invite);
    return invite;
  }

  throw new Error("招待コードの生成に失敗しました。再度お試しください。");
}

export async function listOrganizationInvites(
  organizationId: string
): Promise<OrganizationInvite[]> {
  const snapshot = await getDocs(
    query(
      collection(db, ORGANIZATION_INVITES_COLLECTION),
      where("organizationId", "==", organizationId)
    )
  );

  return snapshot.docs
    .map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        code: normalizeInviteCode(docSnapshot.id),
        organizationId: data.organizationId as string,
        organizationName: data.organizationName as string,
        role: data.role as string,
        invitedEmail: (data.invitedEmail as string | null | undefined) ?? null,
        status: (data.status as OrganizationInvite["status"]) ?? "active",
        expiresAt: (data.expiresAt as string | null | undefined) ?? null,
        maxUses: (data.maxUses as number | null | undefined) ?? null,
        useCount: (data.useCount as number | undefined) ?? 0,
        createdAt: (data.createdAt as string | undefined) ?? "",
        updatedAt: (data.updatedAt as string | undefined) ?? "",
        createdByAuthUid: (data.createdByAuthUid as string | undefined) ?? "",
        createdByDisplayName:
          (data.createdByDisplayName as string | null | undefined) ?? null,
      } satisfies OrganizationInvite;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function revokeOrganizationInvite(code: string): Promise<void> {
  await updateDoc(inviteDoc(code), {
    status: "revoked",
    updatedAt: nowIso(),
  });
}

function assertInviteUsable(invite: OrganizationInvite, authUser: FirebaseUser) {
  if (invite.status !== "active") {
    throw new Error("この招待コードは現在利用できません");
  }
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
    throw new Error("この招待コードの有効期限は切れています");
  }
  if (invite.maxUses != null && invite.useCount >= invite.maxUses) {
    throw new Error("この招待コードの利用回数上限に達しています");
  }
  if (
    invite.invitedEmail &&
    normalizeEmail(authUser.email) !== normalizeEmail(invite.invitedEmail)
  ) {
    throw new Error("この招待コードは別のメールアドレス向けに発行されています");
  }
}

export async function joinOrganizationWithInvite(
  authUser: FirebaseUser,
  rawCode: string
): Promise<{ organizationId: string }> {
  const invite = await getInvite(rawCode);
  if (!invite) {
    throw new Error("招待コードが見つかりません");
  }
  assertInviteUsable(invite, authUser);

  const session = await syncAppSession(authUser);
  const existingMembership = session.memberships.find(
    (member) => member.organizationId === invite.organizationId
  );

  if (existingMembership) {
    await persistLastOrganizationId(authUser.uid, invite.organizationId);
    return { organizationId: invite.organizationId };
  }

  await runMutation("CreateOrganizationMember", {
    organizationId: invite.organizationId,
    userId: session.dataConnectUser.id,
    role: invite.role,
  });

  await runTransaction(db, async (transaction) => {
    const target = inviteDoc(invite.code);
    const snapshot = await transaction.get(target);
    if (!snapshot.exists()) {
      throw new Error("招待コードが見つかりません");
    }
    const currentInvite = {
      ...invite,
      ...(snapshot.data() as Partial<OrganizationInvite>),
      code: normalizeInviteCode(snapshot.id),
    } as OrganizationInvite;
    assertInviteUsable(currentInvite, authUser);

    const nextUseCount = (currentInvite.useCount ?? 0) + 1;
    const exhausted =
      currentInvite.maxUses != null && nextUseCount >= currentInvite.maxUses;

    transaction.update(target, {
      useCount: nextUseCount,
      status: exhausted ? "exhausted" : currentInvite.status,
      updatedAt: nowIso(),
    });
  });

  await persistLastOrganizationId(authUser.uid, invite.organizationId);
  return { organizationId: invite.organizationId };
}
