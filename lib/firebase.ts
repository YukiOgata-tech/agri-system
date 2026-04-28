import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const storage = getStorage(app);

declare global {
  var __agriFirestoreEmulatorEnabled: boolean | undefined;
}

if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_USE_FIRESTORE_EMULATOR === "true" &&
  !globalThis.__agriFirestoreEmulatorEnabled
) {
  connectFirestoreEmulator(
    db,
    process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST ?? "127.0.0.1",
    Number(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT ?? "8080")
  );
  globalThis.__agriFirestoreEmulatorEnabled = true;
}

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) getAnalytics(app);
  });
}
