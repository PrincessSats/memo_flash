import { useState, useEffect } from 'react';
import { supabase } from './storage/supabaseClient';
import { useDecks } from './hooks/useDecks';
import DeckManager from './components/DeckManager';
import StudySession from './components/StudySession';
import Auth from './components/Auth';
import type { User } from '@supabase/supabase-js';
import './index.css';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!authChecked) return <div className="loader">Loading…</div>;

  if (!user) return <Auth />;

  return <AppContent user={user} />;
}

function AppContent({ user }: { user: User }) {
  const {
    decks, cards, states, loaded,
    createDeck, importCards, getDeckStats, logReview, deleteDeck,
  } = useDecks();

  const [studyingDeckId, setStudyingDeckId] = useState<string | null>(null);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

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

  const enrichedDecks = decks.map((d) => ({
    ...d,
    cardCount: cards.filter((c) => c.deckId === d.id).length,
  }));

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.75rem 1rem', background: 'rgba(13,13,18,0.92)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <span style={{ color: '#aaa', fontSize: 13 }}>{user.email}</span>
        <button onClick={handleSignOut} style={{
          background: '#333', color: '#eee', border: 'none',
          padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13
        }}>Sign Out</button>
      </div>
      <DeckManager
        decks={enrichedDecks}
        getDeckStats={getDeckStats}
        createDeck={createDeck}
        importCards={importCards}
        deleteDeck={deleteDeck}
        onStudy={setStudyingDeckId}
      />
    </div>
  );
}
