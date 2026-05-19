// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA7aJ0PgeeFm-TiH-FVvNh6lJKxKAXVI-Q",
  authDomain: "beevoice-35c4b.firebaseapp.com",
  databaseURL: "https://beevoice-35c4b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "beevoice-35c4b",
  storageBucket: "beevoice-35c4b.firebasestorage.app",
  messagingSenderId: "7478054211",
  appId: "1:7478054211:web:4b5429dfbb57789c7d73f6",
  measurementId: "G-VWG1DPQ8S4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
