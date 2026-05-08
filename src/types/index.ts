export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  furigana?: string;
  tags?: string[];
  created: number;
}

export interface CardState {
  cardId: string;
  stability: number;      // days where R=90%
  difficulty: number;     // 1-10
  reps: number;           // total reviews
  lapses: number;         // total failures
  streak: number;         // consecutive successes
  due: number;            // timestamp ms
  lastReview?: number;    // timestamp ms
  suspended: boolean;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  deckId: string;
  rating: 'again' | 'hard' | 'good' | 'easy' | 'auto'; // auto = system decided
  result: 'correct' | 'incorrect';
  streakAfter: number;
  intervalBefore: number; // days
  intervalAfter: number;  // days
  elapsedDays: number;    // days since last review
  timestamp: number;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  created: number;
  cardCount: number;
  dueCount: number;
  lastStudied?: number;
}

export interface StudySettings {
  dailyNewCardLimit: number;
  dailyReviewLimit: number;
  showFurigana: boolean;
  nightMode: boolean;
}

export type QuizType = 'meaning' | 'reading' | 'listening';
export type CardMode = 'multiple-choice' | 'type-answer';

export type RatingLabel = 'again' | 'hard' | 'good' | 'easy';

export function streakToLabel(streak: number, result: 'correct' | 'incorrect'): RatingLabel {
  if (result === 'incorrect') return 'again';
  if (streak <= 1) return 'hard';
  if (streak <= 4) return 'good';
  return 'easy';
}

export function labelToIntervalMultiplier(label: RatingLabel): number {
  switch (label) {
    case 'again': return 0;
    case 'hard': return 1.2;
    case 'good': return 2.5;
    case 'easy': return 4.0;
  }
}
