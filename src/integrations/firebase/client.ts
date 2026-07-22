// Firebase web client init. `apiKey` is a PUBLIC identifier, not a secret.
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile,
  signOut as fbSignOut,
  onIdTokenChanged,
  type User as FirebaseUser,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAcH6RvRQMi81FEg5b3P4dtVpxV1M-vJ1Y", // olkv-a8199 public web key
  authDomain: "olkv-a8199.firebaseapp.com",
  projectId: "olkv-a8199",
  storageBucket: "olkv-a8199.firebasestorage.app",
  messagingSenderId: "97575529926",
  appId: "1:97575529926:web:28f398e0f3c8921faf16c7",
  measurementId: "G-9YH9SXMK31",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile,
  fbSignOut,
  onIdTokenChanged,
};
export type { FirebaseUser };
