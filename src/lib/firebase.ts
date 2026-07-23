import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage } from "firebase/storage";
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
  apiKey: "AIzaSyCRFHtpCaaYg1cQXIIFuOE6rWgokZp5_Ho",
  authDomain: "project-6e03e9ed-73b5-4bf4-816.firebaseapp.com",
  projectId: "project-6e03e9ed-73b5-4bf4-816",
  storageBucket: "project-6e03e9ed-73b5-4bf4-816.firebasestorage.app",
  messagingSenderId: "574188400487",
  appId: "1:574188400487:web:11a0b6f64c775adc0f09c2",
  measurementId: "G-9ZDH0TRWNG",
};

// Initialize Firebase only once
const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

// Firebase Services
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Re-export Firebase Auth helpers
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
