import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import appletConfig from './firebase-applet-config.json';

const app = initializeApp(appletConfig);
const db = getFirestore(app, appletConfig.firestoreDatabaseId);

async function check() {
  try {
    console.log("Connecting to Firestore database:", appletConfig.firestoreDatabaseId);
    
    console.log("\nChecking 'users' collection...");
    const usersSnap = await getDocs(collection(db, 'users'));
    console.log("Found", usersSnap.size, "users:");
    usersSnap.forEach(doc => {
      console.log(`- ID: ${doc.id}, Data:`, JSON.stringify(doc.data(), null, 2));
    });

    console.log("\nChecking 'matches' collection...");
    const matchesSnap = await getDocs(collection(db, 'matches'));
    console.log("Found", matchesSnap.size, "matches.");

    console.log("\nChecking 'predictions' collection...");
    const predictionsSnap = await getDocs(collection(db, 'predictions'));
    console.log("Found", predictionsSnap.size, "predictions.");
  } catch (error) {
    console.error("Error querying Firestore:", error);
  }
}

check();
