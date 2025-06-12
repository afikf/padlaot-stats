// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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

export { app, db };