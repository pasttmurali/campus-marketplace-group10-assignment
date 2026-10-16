import { getApp, getApps, initializeApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FirebaseAuth from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
};

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);
export const firebaseApp = firebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;
export const auth = firebaseApp
  ? Platform.OS === "web"
    ? FirebaseAuth.getAuth(firebaseApp)
    : FirebaseAuth.initializeAuth(firebaseApp, {
        // Firebase exposes this only from its React Native entry point; its
        // generic TypeScript declaration does not currently include it.
        persistence: (FirebaseAuth as typeof FirebaseAuth & {
          getReactNativePersistence: (storage: typeof AsyncStorage) => FirebaseAuth.Persistence;
        }).getReactNativePersistence(AsyncStorage),
      })
  : null;
export const db = firebaseApp ? getDatabase(firebaseApp) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;
