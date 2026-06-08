import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import appletConfig from './firebase-applet-config.json';

const app = initializeApp(appletConfig);
const db = getFirestore(app, appletConfig.firestoreDatabaseId);

async function fullDiagnostic() {
  console.log("=".repeat(60));
  console.log("DIAGNÓSTICO COMPLETO DE FIRESTORE");
  console.log("Base de datos:", appletConfig.firestoreDatabaseId);
  console.log("Proyecto:", appletConfig.projectId);
  console.log("Hora:", new Date().toISOString());
  console.log("=".repeat(60));

  // 1. Users
  console.log("\n📋 COLECCIÓN: users");
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    console.log(`   Documentos encontrados: ${usersSnap.size}`);
    usersSnap.forEach(doc => {
      const d = doc.data();
      console.log(`   [${doc.id.substring(0, 15)}...] ${d.name || 'SIN NOMBRE'} | ${d.email || 'SIN EMAIL'} | role=${d.role || 'N/A'} | pts=${d.totalPoints || 0} | preds=${d.predictionsCount || 0} | parley=${d.parleyCount || 0} | completed=${d.completed || false}`);
    });
  } catch (e: any) {
    console.log(`   ❌ ERROR: ${e?.code || ''} ${e?.message || e}`);
  }

  // 2. Predictions
  console.log("\n📋 COLECCIÓN: predictions");
  try {
    const predsSnap = await getDocs(collection(db, 'predictions'));
    console.log(`   Documentos encontrados: ${predsSnap.size}`);
    const userIds = new Set<string>();
    predsSnap.forEach(doc => {
      const d = doc.data();
      if (d.userId) userIds.add(d.userId);
    });
    console.log(`   Usuarios únicos con pronósticos: ${userIds.size}`);
    userIds.forEach(uid => console.log(`   - ${uid}`));
  } catch (e: any) {
    console.log(`   ❌ ERROR: ${e?.code || ''} ${e?.message || e}`);
  }

  // 3. ParleyAnswers
  console.log("\n📋 COLECCIÓN: parleyAnswers");
  try {
    const parleySnap = await getDocs(collection(db, 'parleyAnswers'));
    console.log(`   Documentos encontrados: ${parleySnap.size}`);
    const userIds = new Set<string>();
    parleySnap.forEach(doc => {
      const d = doc.data();
      if (d.userId) userIds.add(d.userId);
    });
    console.log(`   Usuarios únicos con parley: ${userIds.size}`);
    userIds.forEach(uid => console.log(`   - ${uid}`));
  } catch (e: any) {
    console.log(`   ❌ ERROR: ${e?.code || ''} ${e?.message || e}`);
  }

  // 4. Matches
  console.log("\n📋 COLECCIÓN: matches");
  try {
    const matchesSnap = await getDocs(collection(db, 'matches'));
    console.log(`   Documentos encontrados: ${matchesSnap.size}`);
  } catch (e: any) {
    console.log(`   ❌ ERROR: ${e?.code || ''} ${e?.message || e}`);
  }

  // 5. ParleyQuestions
  console.log("\n📋 COLECCIÓN: parleyQuestions");
  try {
    const parleyQSnap = await getDocs(collection(db, 'parleyQuestions'));
    console.log(`   Documentos encontrados: ${parleyQSnap.size}`);
  } catch (e: any) {
    console.log(`   ❌ ERROR: ${e?.code || ''} ${e?.message || e}`);
  }

  // 6. Podiums
  console.log("\n📋 COLECCIÓN: podiums");
  try {
    const podiumsSnap = await getDocs(collection(db, 'podiums'));
    console.log(`   Documentos encontrados: ${podiumsSnap.size}`);
  } catch (e: any) {
    console.log(`   ❌ ERROR: ${e?.code || ''} ${e?.message || e}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("FIN DEL DIAGNÓSTICO");
  console.log("=".repeat(60));

  // Force exit after 5 seconds
  setTimeout(() => process.exit(0), 5000);
}

fullDiagnostic();
