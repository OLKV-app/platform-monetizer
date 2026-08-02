// Firebase web client init re-exported from centralized firebase config.
import {
  app as firebaseApp,
  auth as firebaseAuth,
  storage,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  firebaseSignOut as fbSignOut,
  onAuthStateChanged as onIdTokenChanged,
  type FirebaseUser,
} from "@/lib/firebase";

export {
  firebaseApp,
  firebaseAuth,
  storage,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  fbSignOut,
  onIdTokenChanged,
};

export type { FirebaseUser };
