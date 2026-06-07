import { collection, query, where, getDocs, getDocsFromServer, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// In-memory cache for active IDs to avoid re-fetching on every save
let cachedMatchIds: Set<string> | null = null;
let cachedQuestionIds: Set<string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 seconds

// Debounce map per userId
const pendingSyncs: Map<string, ReturnType<typeof setTimeout>> = new Map();
const DEBOUNCE_MS = 800;

/**
 * Refreshes the cache of active match and parley question IDs.
 * Only re-fetches if the cache is stale.
 */
async function refreshCache(force = false) {
  const now = Date.now();
  if (!force && cachedMatchIds && cachedQuestionIds && (now - cacheTimestamp) < CACHE_TTL) {
    return { matchIds: cachedMatchIds, questionIds: cachedQuestionIds };
  }

  const [matchesSnap, parleySnap] = await Promise.all([
    getDocsFromServer(collection(db, 'matches')),
    getDocsFromServer(collection(db, 'parleyQuestions'))
  ]);

  cachedMatchIds = new Set(matchesSnap.docs.map(d => d.id));
  cachedQuestionIds = new Set(parleySnap.docs.map(d => d.id));
  cacheTimestamp = now;

  return { matchIds: cachedMatchIds, questionIds: cachedQuestionIds };
}

/**
 * Invalidates the cached IDs so next sync fetches fresh data.
 */
export function invalidateCompletionCache() {
  cachedMatchIds = null;
  cachedQuestionIds = null;
  cacheTimestamp = 0;
}

/**
 * Core sync logic — calculates and updates user predictions progress.
 * Uses getDocsFromServer to ensure fresh data from Firestore server.
 */
async function doSync(userId: string): Promise<{ predictionsCount: number; parleyCount: number; completed: boolean } | null> {
  if (!userId) return null;
  try {
    const { matchIds: activeMatchIds, questionIds: activeQuestionIds } = await refreshCache();

    // Fetch user predictions and parley answers from SERVER (not cache) in parallel
    const [predsSnap, parleySnap] = await Promise.all([
      getDocsFromServer(query(collection(db, 'predictions'), where('userId', '==', userId))),
      getDocsFromServer(query(collection(db, 'parleyAnswers'), where('userId', '==', userId)))
    ]);

    const predictionsCount = predsSnap.docs.filter(d => {
      const data = d.data();
      const hasScores = data.scoreA !== undefined && data.scoreA !== null && !isNaN(Number(data.scoreA)) &&
                         data.scoreB !== undefined && data.scoreB !== null && !isNaN(Number(data.scoreB));
      return hasScores && activeMatchIds.has(data.matchId);
    }).length;

    const parleyCount = parleySnap.docs.filter(d => {
      const data = d.data();
      const hasAnswer = data.answer !== undefined && data.answer !== null && String(data.answer).trim() !== '';
      return hasAnswer && activeQuestionIds.has(data.questionId);
    }).length;

    const targetMatches = activeMatchIds.size || 72;
    const targetParleys = activeQuestionIds.size || 8;
    const completed = predictionsCount === targetMatches && parleyCount === targetParleys;

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      predictionsCount,
      parleyCount,
      completed
    });

    console.log(`[CompletionSync] Synced userId ${userId}: ${predictionsCount}/${targetMatches} matches, ${parleyCount}/${targetParleys} parley. Completed: ${completed}`);
    return { predictionsCount, parleyCount, completed };
  } catch (error) {
    console.error(`[CompletionSync] Failed to sync completion for ${userId}:`, error);
    return null;
  }
}

/**
 * Public API: debounced sync for use after saving predictions.
 * Groups multiple rapid saves into a single Firestore sync.
 */
export function syncUserCompletionData(userId: string) {
  if (!userId) return;

  // Clear any pending sync for this user
  const existing = pendingSyncs.get(userId);
  if (existing) clearTimeout(existing);

  // Schedule debounced sync
  const timer = setTimeout(() => {
    pendingSyncs.delete(userId);
    doSync(userId);
  }, DEBOUNCE_MS);

  pendingSyncs.set(userId, timer);
}

/**
 * Immediate sync — used at registration time or when we need instant results.
 * Bypasses debounce.
 */
export async function syncUserCompletionDataImmediate(userId: string) {
  if (!userId) return null;

  // Clear any pending debounced sync
  const existing = pendingSyncs.get(userId);
  if (existing) {
    clearTimeout(existing);
    pendingSyncs.delete(userId);
  }

  return doSync(userId);
}
