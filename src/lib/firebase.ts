import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

// Use environment variables if available, otherwise fall back to the applet sandbox config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || appletConfig.measurementId || "",
};

const databaseId = "(default)";

const app = initializeApp(firebaseConfig);

// Initialize Firestore with default in-memory cache only.
// IMPORTANT: We intentionally do NOT use persistentLocalCache/persistentMultipleTabManager
// because it stores data in IndexedDB and causes stale reads — new participants
// who register from other devices/browsers won't appear in the leaderboard
// until the cache is manually invalidated. The default in-memory cache is sufficient
// for performance and always reflects the latest server state on page reload.
let db: Firestore;
try {
  db = initializeFirestore(app, {}, databaseId);
} catch (e) {
  // If initializeFirestore was already called, getFirestore will return the existing instance
  console.warn("Firestore already initialized, using existing instance:", e);
  db = getFirestore(app, databaseId);
}

export { db };
export const auth = getAuth(app);
