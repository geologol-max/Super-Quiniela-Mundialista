import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
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

// Initialize Firestore with persistent local cache support
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, databaseId);

export const auth = getAuth(app);



