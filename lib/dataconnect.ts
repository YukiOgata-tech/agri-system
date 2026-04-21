"use client";

/**
 * Firebase Data Connect クライアント設定
 *
 * SDK生成手順:
 * 1. Firebase CLIをインストール: npm install -g firebase-tools
 * 2. エミュレータ起動: firebase emulators:start --only dataconnect
 * 3. SDK生成: firebase dataconnect:sdk:generate
 * 生成先: lib/dataconnect-generated/
 */

import { getDataConnect, connectDataConnectEmulator } from "firebase/data-connect";
import { app } from "./firebase";

let _dataConnect: ReturnType<typeof getDataConnect> | null = null;

export function getDataConnectClient() {
  if (!_dataConnect) {
    _dataConnect = getDataConnect(app, {
      connector: "example",
      location: "asia-northeast1",
      service: "agri-ai-saas-service",
    });

    if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
      try {
        connectDataConnectEmulator(_dataConnect, "localhost", 9399);
      } catch {
        // already connected
      }
    }
  }
  return _dataConnect;
}
