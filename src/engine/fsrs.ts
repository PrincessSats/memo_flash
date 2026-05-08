// Simplified FSRS-4.5-inspired scheduler
// Targets 90% retention
// Uses streak-based difficulty mapping

import type { CardState, ReviewLog } from '../types';

const REQUEST_RETENTION = 0.9;
const MAX_INTERVAL = 365; // days

// Default parameters (simplified set)
const w = {
  initialStability: 0.4,
  difficultyDecay: -0.7,
  stabilityDecay: -0.2,
  retrievabilityWeight: 1.4,
  difficultyMean: 5.0,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function powerForgettingCurve(elapsedDays: number, stability: number): number {
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

export function nextInterval(s: number): number {
  return s * 9 * (1 / REQUEST_RETENTION - 1);
}

export function initCardState(cardId: string): CardState {
  const now = Date.now();
  return {
    cardId,
    stability: 0,
    difficulty: w.difficultyMean,
    reps: 0,
    lapses: 0,
    streak: 0,
    due: now,
    lastReview: undefined,
    suspended: false,
  };
}

export function scheduleReview(state: CardState, result: 'correct' | 'incorrect'): CardState {
  const now = Date.now();
  const elapsedDays = state.lastReview
    ? (now - state.lastReview) / (1000 * 60 * 60 * 24)
    : 0;

  const newState = { ...state };
  newState.lastReview = now;
  newState.reps += 1;

  if (result === 'incorrect') {
    newState.lapses += 1;
    newState.streak = 0;
    newState.stability = 0.5; // short retry
    newState.difficulty = clamp(newState.difficulty + 1.5, 1, 10);
    newState.due = now + 1000 * 60 * 1; // 1 minute later, or same session
    return newState;
  }

  newState.streak += 1;

  // Streak-based label mapping could be used for display:
  // newState.streak <= 1 ? 'hard' : newState.streak <= 4 ? 'good' : 'easy'

  // Streak bonus: longer streaks slightly boost stability gain
  const streakBonus = 1.0 + Math.log1p(newState.streak) * 0.05; // up to ~1.15

  if (state.reps === 0 || state.stability < 0.01) {
    // First successful review
    newState.stability = w.initialStability * 10; // ~4 days
    newState.difficulty = clamp(newState.difficulty - 0.2, 1, 10);
    newState.due = now + 1000 * 60 * 60 * 4; // 4 hours later
    return newState;
  }

  const retrievability = powerForgettingCurve(elapsedDays, state.stability);

  // Stability update (simplified FSRS SInc formula)
  const SInc = Math.exp(
    w.retrievabilityWeight * (11 - newState.difficulty) / 10 * (1 - retrievability)
  ) * streakBonus;

  newState.stability = state.stability * SInc;
  newState.difficulty = clamp(newState.difficulty - 0.3, 1, 10);

  const intervalDays = Math.min(nextInterval(newState.stability), MAX_INTERVAL);
  newState.due = now + intervalDays * 24 * 60 * 60 * 1000;

  return newState;
}

export function getDueCards(cardStates: CardState[]): CardState[] {
  const now = Date.now();
  return cardStates
    .filter((s) => !s.suspended && s.due <= now)
    .sort((a, b) => {
      // Prioritize cards with lower stability (harder / newer cards first)
      return (a.stability || 0) - (b.stability || 0);
    });
}

export function getTodayStats(logs: ReviewLog[], deckId?: string): { newLearned: number; reviews: number; correct: number; streak: number } {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const start = startOfDay.getTime();

  const todayLogs = logs.filter((l) => l.timestamp >= start && (!deckId || l.deckId === deckId));

  const newLearned = todayLogs.filter((l) => l.intervalBefore === 0 && l.result === 'correct').length;
  const reviews = todayLogs.length;
  const correct = todayLogs.filter((l) => l.result === 'correct').length;

  // Compute current daily streak
  const dates: Set<string> = new Set();
  for (const l of logs) {
    const d = new Date(l.timestamp);
    dates.add(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
  }
  let streak = 0;
  let check = new Date(startOfDay);
  while (dates.has(`${check.getFullYear()}-${check.getMonth() + 1}-${check.getDate()}`)) {
    streak++;
    check.setDate(check.getDate() - 1);
  }

  return { newLearned, reviews, correct, streak };
}
