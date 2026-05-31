import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Calculates and updates user predictions progress and completion status.
 * There are exactly 72 group stage matches and 8 parley questions.
 */
export async function syncUserCompletionData(userId: string) {
  if (!userId) return null;
  try {
    // 1. Fetch user predictions
    const predsSnap = await getDocs(query(collection(db, 'predictions'), where('userId', '==', userId)));
    const validPreds = predsSnap.docs.filter(d => {
      const data = d.data();
      return (
        data.scoreA !== undefined && data.scoreA !== null && !isNaN(Number(data.scoreA)) &&
        data.scoreB !== undefined && data.scoreB !== null && !isNaN(Number(data.scoreB))
      );
    });
    const predictionsCount = validPreds.length;

    // 2. Fetch user parley answers
    const parleySnap = await getDocs(query(collection(db, 'parleyAnswers'), where('userId', '==', userId)));
    const validParleys = parleySnap.docs.filter(d => {
      const data = d.data();
      return data.answer !== undefined && data.answer !== null && String(data.answer).trim() !== '';
    });
    const parleyCount = validParleys.length;

    // 3. Determine completion
    // Requirements: 72 predictions of Group Stage matches + 8 Parley analytical answers
    const completed = predictionsCount === 72 && parleyCount === 8;

    // 4. Update the User profile document in Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      predictionsCount,
      parleyCount,
      completed
    });

    console.log(`[CompletionSync] Synced userId ${userId}: ${predictionsCount}/72 matches, ${parleyCount}/8 parley. Completed: ${completed}`);
    return { predictionsCount, parleyCount, completed };
  } catch (error) {
    console.error(`[CompletionSync] Failed to sync completion for ${userId}:`, error);
    return null;
  }
}
