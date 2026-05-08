import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card, CardState, CardMode, ReviewLog } from '../types';
import { streakToLabel } from '../types';
import { scheduleReview } from '../engine/fsrs';

interface Props {
  deckCards: Card[];
  cardStates: CardState[];
  deckId: string;
  onLog: (log: ReviewLog, nextState: CardState) => void;
  onBack: () => void;
}

export default function StudySession({ deckCards, cardStates, deckId, onLog, onBack }: Props) {
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [mode, setMode] = useState<CardMode>('type-answer');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [shake, setShake] = useState(false);
  const [, setLastResult] = useState<'correct' | 'incorrect' | null>(null);

  const dueStates = useMemo(() => {
    const map = new Map(cardStates.map((s) => [s.cardId, s]));
    const due: CardState[] = [];
    for (const card of deckCards) {
      const s = map.get(card.id);
      if (s && s.due <= Date.now()) {
        due.push(s);
      } else if (!s) {
        // New card — create implicit state and show immediately
        due.push({
          cardId: card.id,
          stability: 0,
          difficulty: 5,
          reps: 0,
          lapses: 0,
          streak: 0,
          due: Date.now(),
          lastReview: undefined,
          suspended: false,
        });
      }
    }
    return due
      .filter((s) => !s.suspended)
      .sort((a, b) => (a.stability || 0) - (b.stability || 0));
  }, [deckCards, cardStates]);

  const currentState = dueStates[index];
  const currentCard = useMemo(
    () => deckCards.find((c) => c.id === currentState?.cardId),
    [deckCards, currentState]
  );

  // Multiple choice options
  const options = useMemo(() => {
    if (!currentCard || mode !== 'multiple-choice') return [];
    const siblings = deckCards.filter((c) => c.id !== currentCard.id);
    const shuffled = [...siblings].sort(() => Math.random() - 0.5);
    const choices = shuffled.slice(0, 3).map((c) => c.back);
    choices.push(currentCard.back);
    return choices.sort(() => Math.random() - 0.5);
  }, [deckCards, currentCard, mode]);

  const advance = useCallback(
    (result: 'correct' | 'incorrect', _nextState: CardState) => {
      setShowAnswer(false);
      setTypedAnswer('');
      setLastResult(result);

      if (result === 'incorrect') {
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }

      if (index + 1 >= dueStates.length) {
        // Session complete
      } else {
        setIndex((i) => i + 1);
      }
    },
    [index, dueStates.length]
  );

  const handleAnswer = useCallback(
    (result: 'correct' | 'incorrect') => {
      if (!currentCard || !currentState) return;
      const prevInterval = currentState.stability ? Math.ceil(currentState.stability) : 0;
      const nextState = scheduleReview(currentState, result);
      const label = streakToLabel(nextState.streak, result);

      const log: ReviewLog = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        cardId: currentCard.id,
        deckId,
        rating: label,
        result,
        streakAfter: nextState.streak,
        intervalBefore: prevInterval,
        intervalAfter: Math.ceil(nextState.stability || 0),
        elapsedDays: currentState.lastReview
          ? (Date.now() - currentState.lastReview) / (1000 * 60 * 60 * 24)
          : 0,
        timestamp: Date.now(),
      };

      onLog(log, nextState);
      advance(result, nextState);
    },
    [currentCard, currentState, deckId, advance, onLog]
  );

  const handleTypedSubmit = useCallback(() => {
    if (!currentCard) return;
    const normalize = (s: string) =>
      s
        .trim()
        .toLowerCase()
        .replace(/[\s\p{P}]/gu, '');

    const cleanUser = normalize(typedAnswer);
    const cleanCorrect = normalize(currentCard.back);
    const cleanFurigana = currentCard.furigana
      ? normalize(currentCard.furigana)
      : '';
    const isCorrect =
      cleanUser === cleanCorrect || (cleanFurigana && cleanUser === cleanFurigana);
    handleAnswer(isCorrect ? 'correct' : 'incorrect');
  }, [typedAnswer, currentCard, handleAnswer]);

  const progress =
    dueStates.length > 0 ? (index / dueStates.length) * 100 : 100;

  if (!currentCard) {
    return (
      <div className="study-done">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass"
        >
          <h2>All caught up!</h2>
          <p>No cards due right now.</p>
          <button className="btn-primary" onClick={onBack}>
            Back to Decks
          </button>
        </motion.div>
      </div>
    );
  }

  const streakDots = Array.from({ length: Math.min(currentState?.streak || 0, 7) }).map(
    (_, i) => (
      <span key={i} className="streak-dot" />
    )
  );

  return (
    <div className={`study-wrap ${shake ? 'shake' : ''}`}>
      <div className="study-top">
        <button className="btn-ghost" onClick={onBack}>
          End
        </button>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="mode-toggle">
          <button
            onClick={() => setMode('type-answer')}
            className={mode === 'type-answer' ? 'active' : ''}
          >
            Type
          </button>
          <button
            onClick={() => setMode('multiple-choice')}
            className={mode === 'multiple-choice' ? 'active' : ''}
          >
            Choice
          </button>
        </div>
      </div>

      <div className="streak-row">{streakDots}</div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentCard.id}
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: -90, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="card-3d"
        >
          <div className="card-face">
            <div className="card-front">
              <div className="card-front-text">{currentCard.front}</div>
              {currentCard.furigana && !showAnswer && (
                <div className="card-front-furigana">
                  {currentCard.furigana}
                </div>
              )}
            </div>

            <AnimatePresence>
              {showAnswer && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="card-back"
                >
                  <div className="card-back-text">{currentCard.back}</div>
                  {currentCard.furigana && (
                    <div className="card-back-furigana">
                      {currentCard.furigana}
                    </div>
                  )}
                  {currentCard.tags && (
                    <div className="card-tags">
                      {currentCard.tags.join(' ')}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {!showAnswer && mode === 'multiple-choice' && (
              <div className="options-grid">
                {options.map((opt, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      const isCorrect = opt === currentCard.back;
                      handleAnswer(isCorrect ? 'correct' : 'incorrect');
                    }}
                    className="option-btn"
                  >
                    {opt}
                  </motion.button>
                ))}
              </div>
            )}

            {!showAnswer && mode === 'type-answer' && (
              <div className="type-area">
                <input
                  autoFocus
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTypedSubmit();
                  }}
                  placeholder="Type the meaning or reading…"
                  className="type-input"
                />
                <button className="btn-primary" onClick={handleTypedSubmit}>
                  Check
                </button>
              </div>
            )}

            {!showAnswer && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAnswer(true)}
                className="show-answer-btn"
              >
                Show Answer
              </motion.button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
