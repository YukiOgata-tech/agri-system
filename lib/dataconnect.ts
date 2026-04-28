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

const DATACONNECT_EMULATOR_HOST =
  process.env.NEXT_PUBLIC_DATACONNECT_EMULATOR_HOST ?? "localhost";
const DATACONNECT_EMULATOR_PORT = Number(
  process.env.NEXT_PUBLIC_DATACONNECT_EMULATOR_PORT ?? "9400"
);

type DataConnectClient = ReturnType<typeof getDataConnect>;

declare global {
  var __agriDataConnectClient: DataConnectClient | undefined;
  var __agriDataConnectEmulatorEnabled: boolean | undefined;
}

export function getDataConnectClient() {
  if (!globalThis.__agriDataConnectClient) {
    globalThis.__agriDataConnectClient = getDataConnect(app, {
      connector: "example",
      location: "asia-northeast1",
      service: "agri-ai-saas-service",
    });
  }

  if (
    process.env.NODE_ENV === "development" &&
    typeof window !== "undefined" &&
    !globalThis.__agriDataConnectEmulatorEnabled
  ) {
    connectDataConnectEmulator(
      globalThis.__agriDataConnectClient,
      DATACONNECT_EMULATOR_HOST,
      DATACONNECT_EMULATOR_PORT
    );
    globalThis.__agriDataConnectEmulatorEnabled = true;
  }

  return globalThis.__agriDataConnectClient;
}
