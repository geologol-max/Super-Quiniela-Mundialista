import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Calculates and updates user predictions progress and completion status.
 * Counts only predictions and parley answers for matches and questions that currently exist in the database.
 */
export async function syncUserCompletionData(userId: string) {
  if (!userId) return null;
  try {
    // 1. Get all active match IDs to filter out orphaned predictions
    const matchesSnap = await getDocs(collection(db, 'matches'));
    const activeMatchIds = new Set(matchesSnap.docs.map(d => d.id));

    // 2. Get all active parley question IDs to filter out orphaned answers
    const parleyQuestionsSnap = await getDocs(collection(db, 'parleyQuestions'));
    const activeQuestionIds = new Set(parleyQuestionsSnap.docs.map(d => d.id));

    // 3. Fetch user predictions and filter by active matches
    const predsSnap = await getDocs(query(collection(db, 'predictions'), where('userId', '==', userId)));
    const validPreds = predsSnap.docs.filter(d => {
      const data = d.data();
      const hasScores = data.scoreA !== undefined && data.scoreA !== null && !isNaN(Number(data.scoreA)) &&
                         data.scoreB !== undefined && data.scoreB !== null && !isNaN(Number(data.scoreB));
      return hasScores && activeMatchIds.has(data.matchId);
    });
    const predictionsCount = validPreds.length;

    // 4. Fetch user parley answers and filter by active questions
    const parleySnap = await getDocs(query(collection(db, 'parleyAnswers'), where('userId', '==', userId)));
    const validParleys = parleySnap.docs.filter(d => {
      const data = d.data();
      const hasAnswer = data.answer !== undefined && data.answer !== null && String(data.answer).trim() !== '';
      return hasAnswer && activeQuestionIds.has(data.questionId);
    });
    const parleyCount = validParleys.length;

    // 5. Determine completion against current database sizes (defaulting to 72 and 8)
    const targetMatches = activeMatchIds.size || 72;
    const targetParleys = activeQuestionIds.size || 8;
    const completed = predictionsCount === targetMatches && parleyCount === targetParleys;

    // 6. Update the User profile document in Firestore
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
