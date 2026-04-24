/**
 * Firebase Storage ヘルパー
 *
 * 用途:
 * - 圃場・ハウスの写真
 * - 病害虫の証拠写真
 * - CSV/Excelインポートファイル
 * - レポートPDF
 */

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  type UploadTask,
} from "firebase/storage";
import { storage } from "./firebase";

// ==================== パス設計 ====================
// farms/{farmId}/greenhouses/{greenhouseId}/photos/{filename}
// farms/{farmId}/disease-incidents/{incidentId}/{filename}
// users/{userId}/imports/{filename}
// reports/{orgId}/{filename}

export const storagePaths = {
  greenhousePhoto: (farmId: string, greenhouseId: string, filename: string) =>
    `farms/${farmId}/greenhouses/${greenhouseId}/photos/${filename}`,

  diseasePhoto: (farmId: string, incidentId: string, filename: string) =>
    `farms/${farmId}/disease-incidents/${incidentId}/${filename}`,

  importFile: (userId: string, filename: string) =>
    `users/${userId}/imports/${Date.now()}_${filename}`,

  reportFile: (orgId: string, filename: string) =>
    `reports/${orgId}/${filename}`,

  avatarPhoto: (userId: string) =>
    `avatars/${userId}/avatar`,
};

// ==================== アップロード ====================

export interface UploadProgress {
  progress: number;   // 0-100
  downloadURL?: string;
  error?: Error;
}

/**
 * ファイルをアップロードし、進捗を返す
 */
export function uploadFile(
  path: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const task: UploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    task.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.(pct);
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}

/**
 * 画像ファイルをアップロード（バリデーション付き）
 */
export async function uploadImage(
  path: string,
  file: File,
  options: { maxSizeMB?: number; onProgress?: (pct: number) => void } = {}
): Promise<string> {
  const { maxSizeMB = 10, onProgress } = options;

  if (!file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選択してください");
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`ファイルサイズは${maxSizeMB}MB以下にしてください`);
  }

  return uploadFile(path, file, onProgress);
}

/**
 * CSVファイルをアップロード
 */
export async function uploadCSV(
  path: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
    throw new Error("CSV または Excel ファイルを選択してください");
  }
  return uploadFile(path, file, onProgress);
}

// ==================== ダウンロード・削除 ====================

export async function getFileURL(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path));
}

export async function deleteFile(path: string): Promise<void> {
  await deleteObject(ref(storage, path));
}

export async function listFiles(path: string): Promise<{ name: string; fullPath: string }[]> {
  const result = await listAll(ref(storage, path));
  return result.items.map((item) => ({ name: item.name, fullPath: item.fullPath }));
}

// ==================== ユースケース別ヘルパー ====================

/** ハウス写真をアップロードして URL を返す */
export async function uploadGreenhousePhoto(
  farmId: string,
  greenhouseId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const ext = file.name.split(".").pop();
  const filename = `${Date.now()}.${ext}`;
  const path = storagePaths.greenhousePhoto(farmId, greenhouseId, filename);
  return uploadImage(path, file, { onProgress });
}

/** 病害虫写真をアップロードして URL を返す */
export async function uploadDiseasePhoto(
  farmId: string,
  incidentId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const ext = file.name.split(".").pop();
  const filename = `${Date.now()}.${ext}`;
  const path = storagePaths.diseasePhoto(farmId, incidentId, filename);
  return uploadImage(path, file, { onProgress });
}

/** インポートファイルをアップロード */
export async function uploadImportFile(
  userId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const path = storagePaths.importFile(userId, file.name);
  return uploadCSV(path, file, onProgress);
}

/** アバター画像をアップロード */
export async function uploadAvatar(
  userId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const path = storagePaths.avatarPhoto(userId);
  return uploadImage(path, file, { maxSizeMB: 2, onProgress });
}
