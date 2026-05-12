import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from './storage/supabaseClient';
import { useDecks } from './hooks/useDecks';
import DeckManager from './components/DeckManager';
import StudySession from './components/StudySession';
import Auth from './components/Auth';
import Stats from './components/Stats';
import { loadSetting, saveSetting } from './storage/settings';
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

type AppView = 'decks' | 'stats' | 'pre-session' | 'study';

function AppContent({ user }: { user: User }) {
  const {
    decks, cards, states, logs, loaded,
    createDeck, importCards, getDeckStats, logReview, deleteDeck,
  } = useDecks();

  const [view, setView] = useState<AppView>('decks');
  const [studyingDeckId, setStudyingDeckId] = useState<string | null>(null);
  const [sessionSize, setSessionSize] = useState<number>(10);
  const [selectedSize, setSelectedSize] = useState<number>(10);
  const [sessionSizeLoaded, setSessionSizeLoaded] = useState(false);

  useEffect(() => {
    loadSetting<number>('sessionSize', 10).then((v) => {
      setSessionSize(v);
      setSessionSizeLoaded(true);
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  function handleStudy(deckId: string) {
    setStudyingDeckId(deckId);
    setSelectedSize(sessionSize);
    setView('pre-session');
  }

  async function startSession(size: number) {
    const clamped = Math.max(1, size);
    setSessionSize(clamped);
    await saveSetting('sessionSize', clamped);
    setView('study');
  }

  if (!loaded || !sessionSizeLoaded) return <div className="loader">Loading…</div>;

  if (view === 'study' && studyingDeckId) {
    const deckCards = cards.filter((c) => c.deckId === studyingDeckId);
    return (
      <StudySession
        deckCards={deckCards}
        cardStates={states}
        deckId={studyingDeckId}
        sessionSize={sessionSize}
        onLog={(log, nextState) => logReview(log, nextState)}
        onBack={() => { setStudyingDeckId(null); setView('decks'); }}
      />
    );
  }

  if (view === 'pre-session' && studyingDeckId) {
    const deck = decks.find((d) => d.id === studyingDeckId);
    const deckCardCount = cards.filter((c) => c.deckId === studyingDeckId).length;
    const presets = [5, 10, 20];
    return (
      <div className="pre-session-wrap">
        <div className="glass pre-session-card">
          <h2>{deck?.name}</h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
            {deckCardCount} cards total
          </p>
          <p style={{ marginBottom: '1rem', fontWeight: 600 }}>How many cards?</p>
          <div className="size-presets">
            {presets.map((n) => (
              <button
                key={n}
                className={`btn-size-preset${selectedSize === n ? ' active' : ''}`}
                onClick={() => setSelectedSize(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="size-custom-row">
            <input
              type="number"
              min={1}
              max={9999}
              placeholder="Custom…"
              value={selectedSize === sessionSize ? '' : String(selectedSize)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) setSelectedSize(v);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') startSession(selectedSize);
              }}
              className="type-input"
              style={{ width: 100 }}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-primary"
            style={{ marginTop: '1.5rem', width: '100%', padding: '14px 0', fontSize: '16px' }}
            onClick={() => startSession(selectedSize)}
          >
            Start Session ({selectedSize} cards)
          </motion.button>
          <button className="btn-ghost" style={{ marginTop: '0.75rem' }} onClick={() => { setStudyingDeckId(null); setView('decks'); }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (view === 'stats') {
    return (
      <Stats
        decks={decks}
        cards={cards}
        states={states}
        logs={logs}
        getDeckStats={getDeckStats}
        onBack={() => setView('decks')}
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
        onStudy={handleStudy}
        onStats={() => setView('stats')}
      />
    </div>
  );
}
