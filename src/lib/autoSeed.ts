import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { OFFICIAL_2026_MATCHES_SEED, PARLEY_SEEDS } from './constants';

const SEED_LOCK_KEY = 'quiniela_seed_lock';

/**
 * Checks if the matches and parley questions collections need seeding.
 * Seeds if:
 *   - matches collection has fewer than 72 documents (re-seed aggressively)
 *   - parleyQuestions collection is empty
 * 
 * Uses a sessionStorage lock to prevent duplicate calls within the same browser session.
 */
export async function autoSeedCollections(db: any) {
  // Prevent duplicate seeding within the same session
  if (typeof sessionStorage !== 'undefined') {
    const lockValue = sessionStorage.getItem(SEED_LOCK_KEY);
    if (lockValue === 'done') {
      return; // Already seeded in this session
    }
  }

  try {
    // Fetch both collections in parallel for speed
    const [matchesSnap, parleySnap] = await Promise.all([
      getDocs(collection(db, 'matches')),
      getDocs(collection(db, 'parleyQuestions'))
    ]);

    const needsMatchSeed = matchesSnap.size < 72;
    const needsParleySeed = parleySnap.empty;

    if (!needsMatchSeed && !needsParleySeed) {
      // Everything is seeded, mark session as done
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(SEED_LOCK_KEY, 'done');
      }
      return;
    }

    // Seed matches if needed
    if (needsMatchSeed) {
      console.log(`[AutoSeed] Matches collection has ${matchesSnap.size}/72 docs. Re-seeding official calendar...`);
      const batch = writeBatch(db);

      // Delete existing matches to prevent duplicates
      matchesSnap.docs.forEach(d => {
        batch.delete(doc(db, 'matches', d.id));
      });

      // Add all official World Cup 2026 matches
      OFFICIAL_2026_MATCHES_SEED.forEach((match, idx) => {
        const matchId = `match_2026_${idx + 1}`;
        batch.set(doc(db, 'matches', matchId), match);
      });

      await batch.commit();
      console.log("[AutoSeed] Successfully seeded 72 group stage matches.");
    }

    // Seed parley questions if needed
    if (needsParleySeed) {
      console.log("[AutoSeed] Parley questions collection is empty. Seeding templates...");
      const batch = writeBatch(db);
      PARLEY_SEEDS.forEach((q) => {
        batch.set(doc(db, 'parleyQuestions', q.id), q);
      });
      await batch.commit();
      console.log("[AutoSeed] Successfully seeded 8 parley questions.");
    }

    // Mark session as done after successful seeding
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SEED_LOCK_KEY, 'done');
    }
  } catch (error) {
    console.error("[AutoSeed] Failed to auto-seed collections:", error);
  }
}
