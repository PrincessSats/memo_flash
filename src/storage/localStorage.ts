import { supabase } from './supabaseClient';
import type { Card, CardState, Deck, ReviewLog } from '../types';

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id;
}

export async function loadDecks(): Promise<Deck[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', userId)
    .order('created', { ascending: false });

  if (error) {
    console.error('Error loading decks:', error);
    return [];
  }

  return (data || []).map(d => ({
    id: d.id,
    name: d.name,
    description: d.description,
    created: new Date(d.created).getTime(),
    cardCount: d.card_count || 0, // Note: schema.sql doesn't have card_count, will need to count cards
    dueCount: 0, // Calculated in hook
  }));
}

export async function saveDecks(decks: Deck[]) {
  const userId = await getUserId();
  if (!userId) return;

  const updates = decks.map(d => ({
    id: d.id,
    user_id: userId,
    name: d.name,
    description: d.description,
    created: new Date(d.created).toISOString(),
  }));

  const { error } = await supabase.from('decks').upsert(updates);
  if (error) console.error('Error saving decks:', error);
}

export async function loadCards(): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*');

  if (error) {
    console.error('Error loading cards:', error);
    return [];
  }

  return (data || []).map(c => ({
    id: c.id,
    deckId: c.deck_id,
    front: c.front,
    back: c.back,
    furigana: c.furigana,
    tags: c.tags,
    created: new Date(c.created).getTime(),
  }));
}

export async function saveCards(cards: Card[]) {
  const updates = cards.map(c => ({
    id: c.id,
    deck_id: c.deckId,
    front: c.front,
    back: c.back,
    furigana: c.furigana,
    tags: c.tags,
    created: new Date(c.created).toISOString(),
  }));

  const { error } = await supabase.from('cards').upsert(updates);
  if (error) throw new Error(error.message);
}

export async function addCards(newCards: Card[]) {
  const existing = await loadCards();
  const ids = new Set(existing.map(c => c.id));
  const uniqueNew = newCards.filter(c => !ids.has(c.id));
  
  if (uniqueNew.length > 0) {
    await saveCards(uniqueNew);
  }
  
  return [...existing, ...uniqueNew];
}

export async function loadStates(): Promise<CardState[]> {
  const { data, error } = await supabase
    .from('card_states')
    .select('*');

  if (error) {
    console.error('Error loading states:', error);
    return [];
  }

  return (data || []).map(s => ({
    cardId: s.card_id,
    stability: s.stability,
    difficulty: s.difficulty,
    reps: s.reps,
    lapses: s.lapses,
    streak: s.streak,
    due: new Date(s.due).getTime(),
    lastReview: s.last_review ? new Date(s.last_review).getTime() : undefined,
    suspended: s.suspended,
  }));
}

export async function saveStates(states: CardState[]) {
  const userId = await getUserId();
  const updates = states.map(s => ({
    card_id: s.cardId,
    user_id: userId,
    stability: s.stability,
    difficulty: s.difficulty,
    reps: s.reps,
    lapses: s.lapses,
    streak: s.streak,
    due: new Date(s.due).toISOString(),
    last_review: s.lastReview ? new Date(s.lastReview).toISOString() : null,
    suspended: s.suspended,
  }));

  const { error } = await supabase.from('card_states').upsert(updates, { onConflict: 'card_id' });
  if (error) throw new Error(error.message);
}

export async function updateState(state: CardState) {
  const userId = await getUserId();
  const { error } = await supabase
    .from('card_states')
    .upsert({
      card_id: state.cardId,
      user_id: userId,
      stability: state.stability,
      difficulty: state.difficulty,
      reps: state.reps,
      lapses: state.lapses,
      streak: state.streak,
      due: new Date(state.due).toISOString(),
      last_review: state.lastReview ? new Date(state.lastReview).toISOString() : null,
      suspended: state.suspended,
    }, { onConflict: 'card_id' });
  if (error) console.error('Error updating state:', error);
}

export async function loadLogs(): Promise<ReviewLog[]> {
  const { data, error } = await supabase
    .from('review_logs')
    .select('*')
    .order('created', { ascending: false });

  if (error) {
    console.error('Error loading logs:', error);
    return [];
  }

  return (data || []).map(l => ({
    id: l.id,
    cardId: l.card_id,
    deckId: l.deck_id,
    rating: l.rating as any,
    result: l.result as any,
    streakAfter: l.streak_after,
    intervalBefore: l.interval_before,
    intervalAfter: l.interval_after,
    elapsedDays: l.elapsed_days,
    timestamp: new Date(l.created).getTime(),
  }));
}

export async function saveLogs(logs: ReviewLog[]) {
  const userId = await getUserId();
  const updates = logs.map(l => ({
    id: l.id,
    card_id: l.cardId,
    deck_id: l.deckId,
    user_id: userId,
    rating: l.rating,
    result: l.result,
    streak_after: l.streakAfter,
    interval_before: l.intervalBefore,
    interval_after: l.intervalAfter,
    elapsed_days: l.elapsedDays,
    created: new Date(l.timestamp).toISOString(),
  }));

  const { error } = await supabase.from('review_logs').upsert(updates);
  if (error) console.error('Error saving logs:', error);
}

export async function addLog(log: ReviewLog) {
  const userId = await getUserId();
  const { error } = await supabase
    .from('review_logs')
    .insert({
      card_id: log.cardId,
      deck_id: log.deckId,
      user_id: userId,
      rating: log.rating,
      result: log.result,
      streak_after: log.streakAfter,
      interval_before: log.intervalBefore,
      interval_after: log.intervalAfter,
      elapsed_days: log.elapsedDays,
      created: new Date(log.timestamp).toISOString(),
    });
  if (error) console.error('Error adding log:', error);
}

export async function loadSetting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();

  if (!data) return fallback;
  try {
    return JSON.parse(data.value) as T;
  } catch {
    return data.value as unknown as T;
  }
}

export async function deleteDeckStorage(deckId: string) {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('decks')
    .delete()
    .eq('id', deckId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

export async function saveSetting<T>(key: string, value: T) {
  const userId = await getUserId();
  const valStr = typeof value === 'string' ? value : JSON.stringify(value);
  
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value: valStr, user_id: userId });
  
  if (error) console.error('Error saving setting:', error);
}

export async function clearAllData() {
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('decks').delete().eq('user_id', userId);
  await supabase.from('card_states').delete().eq('user_id', userId);
  await supabase.from('review_logs').delete().eq('user_id', userId);
  await supabase.from('settings').delete().eq('user_id', userId);
}
