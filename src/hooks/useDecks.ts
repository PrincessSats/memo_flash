import { useState, useEffect, useCallback } from 'react';
import type { Deck, Card, CardState, ReviewLog } from '../types';
import * as storage from '../storage/localStorage';
import { initCardState, getDueCards, getTodayStats } from '../engine/fsrs';
import { v4 } from '../utils/uuid';
import { expandCardsToTaskVariants } from '../utils/studyTasks';

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [states, setStates] = useState<CardState[]>([]);
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [d, c, s, l] = await Promise.all([
        storage.loadDecks(),
        storage.loadCards(),
        storage.loadStates(),
        storage.loadLogs(),
      ]);
      const expandedCards = expandCardsToTaskVariants(c);
      const addedCards = expandedCards.filter((card) => !c.some((existing) => existing.id === card.id));
      const addedStates = addedCards.map((card) => initCardState(card.id));
      if (addedCards.length > 0) {
        await storage.saveCards(addedCards);
        await storage.saveStates(addedStates);
      }

      const expandedStates = [...s, ...addedStates];
      const cardCounts = new Map<string, number>();
      expandedCards.forEach((card) => cardCounts.set(card.deckId, (cardCounts.get(card.deckId) ?? 0) + 1));
      setDecks(d.map((deck) => ({ ...deck, cardCount: cardCounts.get(deck.id) ?? 0 })));
      setCards(expandedCards);
      setStates(expandedStates);
      setLogs(l);
      setLoaded(true);
    }
    loadData();
  }, []);

  const persist = useCallback(async (next: {
    decks?: Deck[];
    cards?: Card[];
    states?: CardState[];
    logs?: ReviewLog[];
  }) => {
    if (next.decks) { 
      setDecks(next.decks); 
      await storage.saveDecks(next.decks); 
    }
    if (next.cards) { 
      setCards(next.cards); 
      await storage.saveCards(next.cards); 
    }
    if (next.states) { 
      setStates(next.states); 
      await storage.saveStates(next.states); 
    }
    if (next.logs) { 
      setLogs(next.logs); 
      await storage.saveLogs(next.logs); 
    }
  }, []);

  const createDeck = useCallback(async (name: string, description?: string) => {
    const deck: Deck = {
      id: v4(),
      name,
      description,
      created: Date.now(),
      cardCount: 0,
      dueCount: 0,
    };
    const next = [...decks, deck];
    await persist({ decks: next });
    return deck;
  }, [decks, persist]);

  const importCards = useCallback(async (deckId: string, newCards: Card[]) => {
    const withDeck = expandCardsToTaskVariants(newCards.map((c) => ({ ...c, deckId })));
    const nextCards = await storage.addCards(withDeck);
    const newStates = withDeck.map((c) => initCardState(c.id));
    if (newStates.length > 0) {
      await storage.saveStates(newStates);
    }

    setCards(nextCards);
    setStates((prev) => {
      const existing = new Set(prev.map((s) => s.cardId));
      return [...prev, ...newStates.filter((s) => !existing.has(s.cardId))];
    });
    setDecks((prev) =>
      prev.map((d) =>
        d.id === deckId
          ? { ...d, cardCount: nextCards.filter((c) => c.deckId === deckId).length }
          : d
      )
    );
  }, []);

  const getDeckStats = useCallback((deckId: string) => {
    const deckCards = cards.filter((c) => c.deckId === deckId);
    const deckCardIds = new Set(deckCards.map((c) => c.id));
    const deckStates = states.filter((s) => deckCardIds.has(s.cardId));
    const statedIds = new Set(deckStates.map((s) => s.cardId));
    const unstatedCount = deckCards.filter((c) => !statedIds.has(c.id)).length;
    const due = getDueCards(deckStates);
    const today = getTodayStats(logs, deckId);
    return { dueCount: due.length + unstatedCount, cardCount: deckCards.length, ...today };
  }, [states, cards, logs]);

  const logReview = useCallback(async (log: ReviewLog, nextState: CardState) => {
    setLogs((prev) => [...prev, log]);
    setStates((prev) => {
      const idx = prev.findIndex((s) => s.cardId === nextState.cardId);
      return idx >= 0
        ? prev.map((s) => (s.cardId === nextState.cardId ? nextState : s))
        : [...prev, nextState];
    });

    await Promise.all([
      storage.addLog(log),
      storage.updateState(nextState),
    ]);
  }, []);

  const deleteDeck = useCallback(async (deckId: string) => {
    try {
      await storage.deleteDeckStorage(deckId);
    } catch (e) {
      console.error('Delete failed:', e);
      alert('Failed to delete deck: ' + (e as Error).message);
      return;
    }
    const nextDecks = decks.filter((d) => d.id !== deckId);
    const nextCards = cards.filter((c) => c.deckId !== deckId);
    const deckCardIds = new Set(nextCards.map((c) => c.id));
    const nextStates = states.filter((s) => deckCardIds.has(s.cardId));
    const nextLogs = logs.filter((l) => l.deckId !== deckId);
    setDecks(nextDecks);
    setCards(nextCards);
    setStates(nextStates);
    setLogs(nextLogs);
  }, [decks, cards, states, logs]);

  return { decks, cards, states, logs, loaded, createDeck, importCards, getDeckStats, logReview, deleteDeck };
}
