/**
 * Firestore ヘルパー
 *
 * 用途:
 * - Data Connect (PostgreSQL) では扱いにくいリアルタイム・非構造化データ
 * - 通知履歴、チャット、AI分析結果キャッシュ、設定など
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type QueryConstraint,
  type DocumentData,
  type WithFieldValue,
} from "firebase/firestore";
import { db } from "./firebase";

// ==================== コレクション名 ====================

export const COLLECTIONS = {
  NOTIFICATIONS: "notifications",
  ANALYSIS_RESULTS: "analysis_results",
  FARM_PROFILES: "farm_profiles",
  USER_SETTINGS: "user_settings",
  AUDIT_LOGS: "audit_logs",
  CHAT_MESSAGES: "chat_messages",
} as const;

// ==================== 汎用 CRUD ====================

export async function getDocument<T = DocumentData>(collectionName: string, docId: string) {
  const ref = doc(db, collectionName, docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T & { id: string };
}

export async function getDocuments<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = []
) {
  const ref = collection(db, collectionName);
  const q = constraints.length ? query(ref, ...constraints) : ref;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as (T & { id: string })[];
}

export async function setDocument<T extends WithFieldValue<DocumentData>>(
  collectionName: string,
  docId: string,
  data: T
) {
  await setDoc(doc(db, collectionName, docId), { ...data, updatedAt: serverTimestamp() });
}

export async function addDocument<T extends WithFieldValue<DocumentData>>(
  collectionName: string,
  data: T
) {
  const ref = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDocument<T extends Partial<DocumentData>>(
  collectionName: string,
  docId: string,
  data: T
) {
  await updateDoc(doc(db, collectionName, docId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteDocument(collectionName: string, docId: string) {
  await deleteDoc(doc(db, collectionName, docId));
}

// ==================== リアルタイム購読 ====================

export function subscribeToCollection<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[],
  callback: (data: (T & { id: string })[]) => void
) {
  const ref = collection(db, collectionName);
  const q = constraints.length ? query(ref, ...constraints) : ref;
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as (T & { id: string })[]);
  });
}

// ==================== ユースケース別ヘルパー ====================

/** ユーザー設定を取得 */
export async function getUserSettings(userId: string) {
  return getDocument(COLLECTIONS.USER_SETTINGS, userId);
}

/** ユーザー設定を保存 */
export async function saveUserSettings(userId: string, settings: Record<string, unknown>) {
  await setDocument(COLLECTIONS.USER_SETTINGS, userId, settings);
}

/** 通知を追加 */
export async function addNotification(notification: {
  userId: string;
  title: string;
  body: string;
  type: string;
  read?: boolean;
}) {
  return addDocument(COLLECTIONS.NOTIFICATIONS, { ...notification, read: false });
}

/** ユーザーの未読通知を購読 */
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: (DocumentData & { id: string })[]) => void
) {
  return subscribeToCollection(
    COLLECTIONS.NOTIFICATIONS,
    [where("userId", "==", userId), where("read", "==", false), orderBy("createdAt", "desc"), limit(20)],
    callback
  );
}

/** AI分析結果を保存 */
export async function saveAnalysisResult(
  greenhouseId: string,
  result: {
    type: string;
    summaryText: string;
    adviceText?: string;
    riskLevel?: string;
    actionItems?: string[];
  }
) {
  return addDocument(COLLECTIONS.ANALYSIS_RESULTS, { greenhouseId, ...result });
}

/** 監査ログを記録 */
export async function writeAuditLog(log: {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  detail?: Record<string, unknown>;
}) {
  return addDocument(COLLECTIONS.AUDIT_LOGS, log);
}

export { where, orderBy, limit, serverTimestamp };
