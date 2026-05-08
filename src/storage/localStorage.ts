import type { Card, CardState, Deck, ReviewLog } from '../types';

const DECKS_KEY = 'mm_decks';
const CARDS_KEY = 'mm_cards';
const STATES_KEY = 'mm_states';
const LOGS_KEY = 'mm_logs';
const SETTINGS_KEY = 'mm_settings';

export function loadDecks(): Deck[] {
  try { return JSON.parse(localStorage.getItem(DECKS_KEY) || '[]'); } catch { return []; }
}
export function saveDecks(decks: Deck[]) { localStorage.setItem(DECKS_KEY, JSON.stringify(decks)); }

export function loadCards(): Card[] {
  try { return JSON.parse(localStorage.getItem(CARDS_KEY) || '[]'); } catch { return []; }
}
export function saveCards(cards: Card[]) { localStorage.setItem(CARDS_KEY, JSON.stringify(cards)); }
export function addCards(newCards: Card[]) {
  const existing = loadCards();
  const ids = new Set(existing.map(c => c.id));
  const merged = [...existing, ...newCards.filter(c => !ids.has(c.id))];
  saveCards(merged);
  return merged;
}

export function loadStates(): CardState[] {
  try { return JSON.parse(localStorage.getItem(STATES_KEY) || '[]'); } catch { return []; }
}
export function saveStates(states: CardState[]) { localStorage.setItem(STATES_KEY, JSON.stringify(states)); }
export function updateState(state: CardState) {
  const all = loadStates();
  const idx = all.findIndex(s => s.cardId === state.cardId);
  if (idx >= 0) all[idx] = state; else all.push(state);
  saveStates(all);
}

export function loadLogs(): ReviewLog[] {
  try { return JSON.parse(localStorage.getItem(LOGS_KEY) || '[]'); } catch { return []; }
}
export function saveLogs(logs: ReviewLog[]) { localStorage.setItem(LOGS_KEY, JSON.stringify(logs)); }
export function addLog(log: ReviewLog) {
  const logs = loadLogs(); logs.push(log); saveLogs(logs);
}

export function loadSetting<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const obj = JSON.parse(raw);
    return key in obj ? obj[key] : fallback;
  } catch { return fallback; }
}
export function saveSetting<T>(key: string, value: T) {
  let obj: Record<string, any> = {};
  try { obj = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch {}
  obj[key] = value;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj));
}

export function clearAllData() {
  localStorage.removeItem(DECKS_KEY);
  localStorage.removeItem(CARDS_KEY);
  localStorage.removeItem(STATES_KEY);
  localStorage.removeItem(LOGS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
}
