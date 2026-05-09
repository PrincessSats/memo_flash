import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Trash2, BookOpen, Clock, Flame } from 'lucide-react';
import type { Deck } from '../types';
import { parseCSV } from '../parsers/csvParser';
import { parseApkg } from '../parsers/apkgParser';

interface Props {
  decks: Deck[];
  getDeckStats: (deckId: string) => { dueCount: number; newLearned: number; reviews: number; correct: number; streak: number };
  createDeck: (name: string) => void;
  importCards: (deckId: string, newCards: any[]) => void;
  deleteDeck: (deckId: string) => void;
  onStudy: (deckId: string) => void;
}

export default function DeckManager({ decks, getDeckStats, createDeck, importCards, deleteDeck, onStudy }: Props) {
  const [newName, setNewName] = useState('');
  const [activeDeck, setActiveDeck] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File, deckId: string) => {
    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const cards = parseCSV(text, deckId);
        importCards(deckId, cards);
      } else if (file.name.endsWith('.apkg')) {
        const parsed = await parseApkg(file);
        const cards = parsed.cards.map((c, i) => ({ ...c, id: `${deckId}-apkg-${i}-${Date.now()}`, deckId }));
        importCards(deckId, cards);
      }
    } catch (e) {
      alert('Import failed: ' + (e as Error).message);
    }
  }, [importCards]);

  return (
    <div className="deck-manager">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.apkg"
        hidden
        onChange={e => {
          const file = e.target.files?.[0];
          if (file && activeDeck) handleFile(file, activeDeck);
          e.target.value = '';
        }}
      />

      <div className="deck-header">
        <h1>Memo</h1>
        <p className="deck-sub">Spaced repetition, made alive.</p>
      </div>

      <div className="create-deck-row">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New deck name..."
          className="deck-input"
          onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { createDeck(newName.trim()); setNewName(''); } }}
        />
        <button className="btn-primary" onClick={() => { if (newName.trim()) { createDeck(newName.trim()); setNewName(''); } }}>Create</button>
      </div>

      <div className="deck-list">
        {decks.map((deck, i) => {
          const stats = getDeckStats(deck.id);
          return (
            <motion.div
              key={deck.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="deck-card glass"
            >
              <div className="deck-card-top">
                <div className="deck-title">{deck.name}</div>
                <div className="deck-actions">
                  <button className="btn-ghost icon-only" title="Import CSV/APKG" onClick={() => { setActiveDeck(deck.id); fileInputRef.current?.click(); }}>
                    <Upload size={16} />
                  </button>
                  <button className="btn-ghost icon-only danger" onClick={() => deleteDeck(deck.id)} title="Delete deck">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="deck-stats">
                <div className="stat">
                  <Clock size={14} />
                  <span>{stats.dueCount} due</span>
                </div>
                <div className="stat">
                  <BookOpen size={14} />
                  <span>{deck.cardCount} cards</span>
                </div>
                <div className="stat">
                  <Flame size={14} />
                  <span>🔥 {stats.streak} day{stats.streak === 1 ? '' : 's'}</span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-study"
                onClick={() => onStudy(deck.id)}
                disabled={stats.dueCount === 0}
              >
                Study Now
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
