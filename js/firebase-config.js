import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCDtwadbNuMaGCkvgFhRcVuhmPKq1G4CI",
  authDomain: "mielopolis-b7a63.firebaseapp.com",
  projectId: "mielopolis-b7a63",
  storageBucket: "mielopolis-b7a63.firebasestorage.app",
  messagingSenderId: "62789527679",
  appId: "1:62789527679:web:a0d4ba859b19cc88fa774a",
  measurementId: "G-SVZ9TWS04K"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db, firebaseConfig };
