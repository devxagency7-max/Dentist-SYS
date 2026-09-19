/* ==========================================================================
   Firebase bootstrap — initializes the app, Firestore, and Auth once per
   page. Load the Firebase compat SDK <script> tags (app, firestore, auth)
   BEFORE this file, then this file BEFORE any page script that uses
   `firebase.firestore()` / `firebase.auth()` / the FB helper below.
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyDCsHrEsdF4kPZVPwuj7SKdUvFxZxSp8Lk",
  authDomain: "dentist-sys.firebaseapp.com",
  projectId: "dentist-sys",
  storageBucket: "dentist-sys.firebasestorage.app",
  messagingSenderId: "210584676482",
  appId: "1:210584676482:web:5ac0dfb87d30c9038d6c9b",
  measurementId: "G-7MNSB92FC7",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
const functions = firebase.apps.length && firebase.functions ? firebase.functions() : null;
