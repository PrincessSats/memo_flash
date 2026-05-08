import { useState } from 'react';
import { useDecks } from './hooks/useDecks';
import DeckManager from './components/DeckManager';
import StudySession from './components/StudySession';
import './index.css';

export default function App() {
  const {
    decks, cards, states, loaded,
    createDeck, importCards, getDeckStats, logReview, deleteDeck,
  } = useDecks();

  const [studyingDeckId, setStudyingDeckId] = useState<string | null>(null);

  if (!loaded) return <div className="loader">Loading…</div>;

  if (studyingDeckId) {
    const deckCards = cards.filter((c) => c.deckId === studyingDeckId);
    return (
      <StudySession
        deckCards={deckCards}
        cardStates={states}
        deckId={studyingDeckId}
        onLog={(log, nextState) => {
          logReview(log, nextState);
        }}
        onBack={() => setStudyingDeckId(null)}
      />
    );
  }

  // Update deck card counts from local state
  const enrichedDecks = decks.map((d) => ({
    ...d,
    cardCount: cards.filter((c) => c.deckId === d.id).length,
  }));

  return (
    <DeckManager
      decks={enrichedDecks}
      getDeckStats={getDeckStats}
      createDeck={createDeck}
      importCards={importCards}
      deleteDeck={deleteDeck}
      onStudy={setStudyingDeckId}
    />
  );
}
