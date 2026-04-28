import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { app } from "./firebase";

export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

export async function signUp(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  return credential.user;
}

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signInWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function updateAuthDisplayName(displayName: string) {
  if (!auth.currentUser) {
    throw new Error("ログイン中のユーザーが見つかりません");
  }
  await updateProfile(auth.currentUser, { displayName });
  return auth.currentUser;
}

export async function logOut() {
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
