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
 * - 5 pts for correct outcome (Win/Loss/Draw)
 * - 1 pt extra for partial score (one team matches)
 * - 3 pts extra for total score (both teams match)
 */
export function calculateMatchPoints(predA: number, predB: number, realA: number, realB: number): number {
  let points = 0;

  // Outcome
  const predOutcome = predA > predB ? 'A' : (predA < predB ? 'B' : 'D');
  const realOutcome = realA > realB ? 'A' : (realA < realB ? 'B' : 'D');

  if (predOutcome === realOutcome) {
    points += 5;
    
    // Exact Score
    if (predA === realA && predB === realB) {
      points += 3;
    } else if (predA === realA || predB === realB) {
      // Partial Score (only if outcome was correct? Rules say "adicional si su acierto fue parcial")
      points += 1;
    }
  }

  return points;
}
