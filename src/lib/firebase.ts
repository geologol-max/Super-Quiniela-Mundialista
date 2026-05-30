import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, Firestore } from 'firebase/firestore';
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

const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || appletConfig.firestoreDatabaseId || "(default)";

const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistent cache, falling back to default if it fails
// (e.g., in incognito mode or environments where IndexedDB is restricted)
let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, databaseId);
} catch (e) {
  console.warn("Persistent cache unavailable, falling back to default Firestore:", e);
  try {
    db = initializeFirestore(app, {}, databaseId);
  } catch (e2) {
    // If initializeFirestore already called, getFirestore will return existing instance
    db = getFirestore(app, databaseId);
  }
}

export { db };
export const auth = getAuth(app);
