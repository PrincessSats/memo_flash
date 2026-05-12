import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Deck, Card, CardState, ReviewLog } from '../types';
import { getTodayStats } from '../engine/fsrs';

interface Props {
  decks: Deck[];
  cards: Card[];
  states: CardState[];
  logs: ReviewLog[];
  getDeckStats: (deckId: string) => { dueCount: number; newLearned: number; reviews: number; correct: number; streak: number };
  onBack: () => void;
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Stats({ decks, cards, states, logs, getDeckStats, onBack }: Props) {
  const global = useMemo(() => getTodayStats(logs), [logs]);
  const totalCards = cards.length;
  const totalReviews = logs.length;
  const totalCorrect = logs.filter((l) => l.result === 'correct').length;
  const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;
  const totalLapses = states.reduce((sum, s) => sum + (s.lapses || 0), 0);
  const lapseRate = totalReviews > 0 ? ((totalLapses / totalReviews) * 100).toFixed(1) : '0';

  // 14-day review bar chart
  const dailyBars = useMemo(() => {
    const bars: { label: string; total: number; correct: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayLogs = logs.filter((l) => l.timestamp >= d.getTime() && l.timestamp < next.getTime());
      bars.push({
        label: fmtDate(d.getTime()),
        total: dayLogs.length,
        correct: dayLogs.filter((l) => l.result === 'correct').length,
      });
    }
    return bars;
  }, [logs]);

  const maxBar = Math.max(...dailyBars.map((b) => b.total), 1);

  // 7-day forecast (cards due each day)
  const forecast = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const days: { label: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const start = new Date(now);
      start.setDate(start.getDate() + i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const count = states.filter(
        (s) => !s.suspended && s.due >= start.getTime() && s.due < end.getTime()
      ).length;
      days.push({ label: i === 0 ? 'Today' : fmtDate(start.getTime()), count });
    }
    return days;
  }, [states]);

  const maxForecast = Math.max(...forecast.map((f) => f.count), 1);

  // Retention curve
  const retentionBuckets = useMemo(() => {
    const buckets = [
      { label: '0-1d', min: 0, max: 1 },
      { label: '1-3d', min: 1, max: 3 },
      { label: '3-7d', min: 3, max: 7 },
      { label: '7-30d', min: 7, max: 30 },
      { label: '30d+', min: 30, max: Infinity },
    ];
    return buckets.map((b) => {
      const bucketLogs = logs.filter(
        (l) => l.intervalBefore >= b.min && l.intervalBefore < b.max
      );
      const correct = bucketLogs.filter((l) => l.result === 'correct').length;
      const pct = bucketLogs.length > 0 ? Math.round((correct / bucketLogs.length) * 100) : null;
      return { ...b, count: bucketLogs.length, pct };
    });
  }, [logs]);

  // Per-deck table
  const deckRows = useMemo(() => {
    return decks.map((deck) => {
      const st = getDeckStats(deck.id);
      const deckLogs = logs.filter((l) => l.deckId === deck.id);
      const dCorrect = deckLogs.filter((l) => l.result === 'correct').length;
      const dAcc = deckLogs.length > 0 ? Math.round((dCorrect / deckLogs.length) * 100) : null;
      const cardCount = cards.filter((c) => c.deckId === deck.id).length;
      return { deck, dueCount: st.dueCount, cardCount, accuracy: dAcc };
    });
  }, [decks, cards, logs, getDeckStats]);

  return (
    <div className="stats-page">
      <div className="stats-header">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <h2>Statistics</h2>
      </div>

      {/* Top numbers */}
      <div className="stats-top-grid">
        {[
          { label: 'Total Cards', value: totalCards },
          { label: 'Total Reviews', value: totalReviews },
          { label: 'Accuracy', value: `${accuracy}%` },
          { label: 'Day Streak', value: `🔥 ${global.streak}` },
          { label: 'Lapses', value: totalLapses },
          { label: 'Lapse Rate', value: `${lapseRate}%` },
          { label: 'Today', value: `${global.reviews} reviews` },
        ].map((s) => (
          <div key={s.label} className="stat-tile glass">
            <div className="stat-tile-value">{s.value}</div>
            <div className="stat-tile-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 14-day bar chart */}
      <section className="stats-section">
        <h3>Reviews — last 14 days</h3>
        <div className="bar-chart">
          {dailyBars.map((b, i) => (
            <div key={i} className="bar-col">
              <div className="bar-track">
                <motion.div
                  className="bar-fill"
                  initial={{ height: 0 }}
                  animate={{ height: `${(b.total / maxBar) * 100}%` }}
                  transition={{ delay: i * 0.03 }}
                  title={`${b.total} reviews, ${b.correct} correct`}
                />
              </div>
              <span className="bar-label">{b.label.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 7-day forecast */}
      <section className="stats-section">
        <h3>Due — next 7 days</h3>
        <div className="bar-chart">
          {forecast.map((f, i) => (
            <div key={i} className="bar-col">
              <div className="bar-track">
                <motion.div
                  className="bar-fill bar-fill-blue"
                  initial={{ height: 0 }}
                  animate={{ height: `${(f.count / maxForecast) * 100}%` }}
                  transition={{ delay: i * 0.05 }}
                  title={`${f.count} cards due`}
                />
              </div>
              <span className="bar-label">{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Retention curve */}
      <section className="stats-section">
        <h3>Retention by interval</h3>
        <div className="retention-row">
          {retentionBuckets.map((b) => (
            <div key={b.label} className="retention-bucket glass">
              <div
                className="retention-pct"
                style={{
                  color: b.pct === null ? 'var(--text-dim)' : b.pct >= 80 ? '#44cc44' : b.pct >= 60 ? '#ffcc44' : '#ff4444',
                }}
              >
                {b.pct === null ? '—' : `${b.pct}%`}
              </div>
              <div className="retention-label">{b.label}</div>
              <div className="retention-count" style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                {b.count} reviews
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Per-deck table */}
      <section className="stats-section">
        <h3>By deck</h3>
        <div className="deck-table">
          <div className="deck-table-header">
            <span>Deck</span>
            <span>Cards</span>
            <span>Due</span>
            <span>Accuracy</span>
          </div>
          {deckRows.map(({ deck, dueCount, cardCount, accuracy: acc }) => (
            <div key={deck.id} className="deck-table-row">
              <span className="deck-table-name">{deck.name}</span>
              <span>{cardCount}</span>
              <span>{dueCount}</span>
              <span>{acc === null ? '—' : `${acc}%`}</span>
            </div>
          ))}
          {deckRows.length === 0 && (
            <div style={{ padding: '1rem', color: 'var(--text-dim)', textAlign: 'center' }}>No decks yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
