import { useState, useEffect, useCallback } from 'react';
import type { Deck, Card, CardState, ReviewLog } from '../types';
import * as storage from '../storage/localStorage';
import { initCardState, getDueCards, getTodayStats } from '../engine/fsrs';
import { v4 } from '../utils/uuid';

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [states, setStates] = useState<CardState[]>([]);
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDecks(storage.loadDecks());
    setCards(storage.loadCards());
    setStates(storage.loadStates());
    setLogs(storage.loadLogs());
    setLoaded(true);
  }, []);

  const persist = useCallback((next: {
    decks?: Deck[];
    cards?: Card[];
    states?: CardState[];
    logs?: ReviewLog[];
  }) => {
    if (next.decks) { setDecks(next.decks); storage.saveDecks(next.decks); }
    if (next.cards) { setCards(next.cards); storage.saveCards(next.cards); }
    if (next.states) { setStates(next.states); storage.saveStates(next.states); }
    if (next.logs) { setLogs(next.logs); storage.saveLogs(next.logs); }
  }, []);

  const createDeck = useCallback((name: string, description?: string) => {
    const deck: Deck = {
      id: v4(),
      name,
      description,
      created: Date.now(),
      cardCount: 0,
      dueCount: 0,
    };
    const next = [...decks, deck];
    persist({ decks: next });
    return deck;
  }, [decks, persist]);

  const importCards = useCallback((deckId: string, newCards: Card[]) => {
    const withDeck = newCards.map((c) => ({ ...c, deckId }));
    const nextCards = storage.addCards(withDeck);
    const newStates = withDeck.map((c) => initCardState(c.id));
    const nextStates = [...states, ...newStates];
    storage.saveStates(nextStates);

    const deck = decks.find((d) => d.id === deckId);
    if (deck) {
      const updated = decks.map((d) =>
        d.id === deckId
          ? { ...d, cardCount: nextCards.filter((c) => c.deckId === deckId).length }
          : d
      );
      persist({ decks: updated, cards: nextCards, states: nextStates });
    } else {
      persist({ cards: nextCards, states: nextStates });
    }
  }, [decks, states, persist]);

  const getDeckStats = useCallback((deckId: string) => {
    const due = getDueCards(states.filter((s) => {
      const card = cards.find((c) => c.id === s.cardId);
      return card && card.deckId === deckId;
    }));
    const today = getTodayStats(logs, deckId);
    return { dueCount: due.length, ...today };
  }, [states, cards, logs]);

  const logReview = useCallback((log: ReviewLog, nextState: CardState) => {
    const nextLogs = [...logs, log];
    const idx = states.findIndex((s) => s.cardId === nextState.cardId);
    const nextStates = idx >= 0
      ? states.map((s) => (s.cardId === nextState.cardId ? nextState : s))
      : [...states, nextState];
    storage.addLog(log);
    storage.saveStates(nextStates);
    setLogs(nextLogs);
    setStates(nextStates);
  }, [logs, states]);

  const deleteDeck = useCallback((deckId: string) => {
    const nextDecks = decks.filter((d) => d.id !== deckId);
    const nextCards = cards.filter((c) => c.deckId !== deckId);
    const nextStates = states.filter((s) => !nextCards.some((c) => c.id === s.cardId));
    const nextLogs = logs.filter((l) => l.deckId !== deckId);
    persist({ decks: nextDecks, cards: nextCards, states: nextStates, logs: nextLogs });
  }, [decks, cards, states, logs, persist]);

  return { decks, cards, states, logs, loaded, createDeck, importCards, getDeckStats, logReview, deleteDeck };
}
