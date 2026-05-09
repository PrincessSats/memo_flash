import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Trash2, BookOpen, Clock, Flame } from 'lucide-react';
import type { Deck } from '../types';
import { parseCSV } from '../parsers/csvParser';
import { parseApkg } from '../parsers/apkgParser';

interface Props {
  decks: Deck[];
  getDeckStats: (deckId: string) => { dueCount: number; newLearned: number; reviews: number; correct: number; streak: number };
  createDeck: (name: string, description?: string) => Promise<Deck>;
  importCards: (deckId: string, newCards: any[]) => void;
  deleteDeck: (deckId: string) => void;
  onStudy: (deckId: string) => void;
}

export default function DeckManager({ decks, getDeckStats, createDeck, importCards, deleteDeck, onStudy }: Props) {
  const [newName, setNewName] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = useCallback(async () => {
    if (newName.trim()) {
      await createDeck(newName.trim());
      setNewName('');
    }
  }, [newName, createDeck]);

  const handleFile = useCallback(async (file: File) => {
    setImporting(true);
    try {
      const deckName = file.name.replace(/\.(csv|apkg)$/i, '');
      const deck = await createDeck(deckName);

      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const cards = parseCSV(text, deck.id);
        importCards(deck.id, cards);
      } else if (file.name.endsWith('.apkg')) {
        const parsed = await parseApkg(file);
        const cards = parsed.cards.map((c, i) => ({ ...c, id: `${deck.id}-apkg-${i}-${Date.now()}`, deckId: deck.id }));
        importCards(deck.id, cards);
      }
    } catch (e) {
      alert('Import failed: ' + (e as Error).message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [createDeck, importCards]);

  return (
    <div className="deck-manager">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.apkg"
        hidden
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
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
          placeholder="Deck name..."
          className="deck-input"
          onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
        />
        <button className="btn-primary" onClick={handleCreate}>Create</button>
        <button
          className="btn-primary"
          style={{ background: 'linear-gradient(135deg, #5fd98f, #34d399)', boxShadow: '0 8px 24px rgba(52,211,153,0.3)' }}
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          <Upload size={15} style={{ marginRight: 5, verticalAlign: 'middle' }} />
          {importing ? '...' : 'Import'}
        </button>
      </div>

      <div className="deck-list">
        {decks.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem 0', fontSize: 14 }}>
            No decks. Create one or import CSV/APKG file.
          </p>
        )}
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
                <button className="btn-ghost icon-only danger" onClick={() => deleteDeck(deck.id)} title="Delete deck">
                  <Trash2 size={16} />
                </button>
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
