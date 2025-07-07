// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {   getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  runTransaction,
  enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {   getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithRedirect, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyADcZrKGWwO12lpYT6NuYvd3c_XpFCa1kE",
  authDomain: "padlaot-stats.firebaseapp.com",
  projectId: "padlaot-stats",
  storageBucket: "padlaot-stats.appspot.com",
  messagingSenderId: "147162693072",
  appId: "1:147162693072:web:25f6786fe49651219f4dd5",
  measurementId: "G-46YMB61REP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Configure Google provider for better compatibility with GitHub Pages
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Add additional scopes if needed
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Enable Firestore offline persistence for better performance and caching
// This allows the app to work offline and reduces database reads by caching data locally
enableIndexedDbPersistence(db)
  .then(() => {
    console.log('✅ Firestore offline persistence enabled successfully');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Firestore persistence failed: Multiple tabs open, persistence can only be enabled in one tab at a time');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ Firestore persistence not supported in this browser');
    } else {
      console.error('❌ Error enabling Firestore persistence:', err);
    }
  });

export { app, db, auth, googleProvider };