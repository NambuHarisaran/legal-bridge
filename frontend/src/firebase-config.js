// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  setPersistence,
  browserLocalPersistence,
  updateProfile
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";

// Firebase web config is sourced from Vite env vars first.
// Fallback values keep local development working if env vars are not set yet.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBt-VRzwG_7JG_7itmgCBgSMRZyh9-hpl4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "legalbridge-v1.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "legalbridge-v1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "legalbridge-v1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "755684025340",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:755684025340:web:5c1c4052afd3e1262d8879",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-WT0LLW2BJC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable persistence
setPersistence(auth, browserLocalPersistence);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

export { 
  app, 
  analytics, 
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  googleProvider,
  signOut,
  updateProfile,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot
};
