import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyChbyeEQbEHgR-ae5Q0UdjI245wQLIDlb0", // Corrigido para o número 0 (zero)
  authDomain: "sistema-barber.firebaseapp.com",
  projectId: "sistema-barber",
  storageBucket: "sistema-barber.firebasestorage.app",
  messagingSenderId: "35449274324",
  appId: "1:35449274324:web:62c638650ff9aceda1a041"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);