// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore"; // Keep for backward compatibility
import { getDatabase } from "firebase/database"; // Add for Realtime Database

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAiamf1sbG3PRNQC16xnyOAQPP7h_toxIw",
  authDomain: "expo-c372b.firebaseapp.com",
  projectId: "expo-c372b",
  storageBucket: "expo-c372b.firebasestorage.app",
  messagingSenderId: "258068395091",
  appId: "1:258068395091:web:09f08ac4f9091034a002a6",
  measurementId: "G-D1JZ0X8BSD",
  databaseURL: "https://expo-c372b-default-rtdb.firebaseio.com", // Add your RTDB URL
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
const db = getFirestore(app); // Keep for backward compatibility
const rtdb = getDatabase(app); // Initialize Realtime Database

export { auth, db, rtdb };
