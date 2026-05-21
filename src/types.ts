export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  group: string;
  date: string;
  scoreA?: number;
  scoreB?: number;
  status: 'scheduled' | 'finished';
}

export interface Prediction {
  id?: string;
  userId: string;
  matchId: string;
  scoreA: number;
  scoreB: number;
  points?: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'participant';
  totalPoints: number;
}

export interface ParleyQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer?: string;
  points: number;
}

export interface ParleyAnswer {
  id?: string;
  userId: string;
  questionId: string;
  answer: string;
  points?: number;
}

export interface PodiumPrediction {
  userId: string;
  champion: string;
  runnerUp: string;
  third: string;
  fourth: string;
}

/**
 * Calculates points for a single prediction based on rules:
 * - 3 pts for exact score (e.g. Pred: 2-1, Real: 2-1)
 * - 1 pt for correct trend (winner or draw) but not exact score (e.g. Pred: 1-0, Real: 3-1)
 * - 0 pts for incorrect trend
 */
export function calculateMatchPoints(predA: number, predB: number, realA: number, realB: number): number {
  // Exact Score
  if (predA === realA && predB === realB) {
    return 3;
  }

  // Outcome/Trend
  const predOutcome = predA > predB ? 'A' : (predA < predB ? 'B' : 'D');
  const realOutcome = realA > realB ? 'A' : (realA < realB ? 'B' : 'D');

  if (predOutcome === realOutcome) {
    return 1;
  }

  return 0;
}

/**
 * Checks if a match is locked for predictions (15 minutes before start).
 */
export function isMatchLocked(matchDate: string): boolean {
  try {
    const now = new Date();
    const gameTime = new Date(matchDate);
    // Lock 15 minutes before the match starts
    const lockTime = new Date(gameTime.getTime() - 15 * 60 * 1000);
    return now >= lockTime;
  } catch (error) {
    console.error("Error parsing match date:", error);
    return false;
  }
}

