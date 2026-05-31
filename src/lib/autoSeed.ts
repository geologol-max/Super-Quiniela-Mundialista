import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { OFFICIAL_2026_MATCHES_SEED, PARLEY_SEEDS } from './constants';

/**
 * Checks if the matches and parley questions collections are empty in Firestore.
 * If empty, seeds them with official Group Stage matches and Parley analytical questions.
 */
export async function autoSeedCollections(db: any) {
  try {
    // 1. Auto-seed matches
    const matchesSnap = await getDocs(collection(db, 'matches'));
    if (matchesSnap.empty) {
      console.log("[AutoSeed] Matches collection is empty. Seeding official calendar...");
      const batch = writeBatch(db);
      OFFICIAL_2026_MATCHES_SEED.forEach((match, idx) => {
        const matchId = `match_2026_${idx + 1}`;
        batch.set(doc(db, 'matches', matchId), match);
      });
      await batch.commit();
      console.log("[AutoSeed] Successfully seeded 72 group stage matches.");
    }

    // 2. Auto-seed parley questions
    const parleySnap = await getDocs(collection(db, 'parleyQuestions'));
    if (parleySnap.empty) {
      console.log("[AutoSeed] Parley questions collection is empty. Seeding templates...");
      const batch = writeBatch(db);
      PARLEY_SEEDS.forEach((q) => {
        batch.set(doc(db, 'parleyQuestions', q.id), q);
      });
      await batch.commit();
      console.log("[AutoSeed] Successfully seeded 8 parley questions.");
    }
  } catch (error) {
    console.error("[AutoSeed] Failed to auto-seed collections:", error);
  }
}
