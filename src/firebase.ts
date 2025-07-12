// firebase.ts

// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, getDocs, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC19bqYsOuXhmGNW_sDkz-Q76h9ZNjPwfw",
  authDomain: "dnd-hrd.firebaseapp.com",
  projectId: "dnd-hrd",
  storageBucket: "dnd-hrd.firebasestorage.app",
  messagingSenderId: "230470715841",
  appId: "1:230470715841:web:85a549eaab27e20fbd4740",
  measurementId: "G-LR6615LPGX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Auth and Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Export instances and commonly used auth/firestore functions
export {
  app,
  analytics,
  auth,
  db,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
};
