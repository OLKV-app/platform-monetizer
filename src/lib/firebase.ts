import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  updateProfile,
} from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyBjryYFJ2owb7C0PQX3_zJ8QoXV6e1Eqk4",
  authDomain: "olkv-a8199.firebaseapp.com",
  projectId: "olkv-a8199",
  storageBucket: "olkv-a8199.firebasestorage.app",
  messagingSenderId: "97575529926",
  appId: "1:97575529926:web:28f398e0f3c8921faf16c7",
  measurementId: "G-9YH9SXMK31",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  firebaseSignOut,
  onAuthStateChanged,
  FirebaseUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  updateProfile,
};
