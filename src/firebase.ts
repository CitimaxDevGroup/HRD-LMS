// firebase.ts

// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, getDocs, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDmzsYGRv1qh2D5v1Sh1lu-eqMpdl838dw",
  authDomain: "dnd-hrdd.firebaseapp.com",
  projectId: "dnd-hrdd",
  storageBucket: "dnd-hrdd.firebasestorage.app",
  messagingSenderId: "995703480098",
  appId: "1:995703480098:web:3319d5b9ac8622ab538f7b",
  measurementId: "G-Z3C7WXMN4P"
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
