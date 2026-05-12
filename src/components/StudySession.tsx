import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card, CardState, ReviewLog } from '../types';
import { streakToLabel } from '../types';
import { scheduleReview } from '../engine/fsrs';
import { matchesRomaji } from '../utils/romaji';
import { getCardQuizType, type StudyQuizType } from '../utils/studyTasks';

type QuizType = StudyQuizType;

interface Props {
  deckCards: Card[];
  cardStates: CardState[];
  deckId: string;
  sessionSize: number;
  onLog: (log: ReviewLog, nextState: CardState) => void;
  onBack: () => void;
}

function hashText(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function quizLabel(qt: QuizType): string {
  switch (qt) {
    case 'meaning-mc':   return '🅰️ Meaning';
    case 'reading-mc':   return '🅰️ Reading';
    case 'meaning-type': return '⌨️ Meaning';
    case 'reading-type': return '⌨️ Reading';
  }
}

export default function StudySession({ deckCards, cardStates, deckId, sessionSize, onLog, onBack }: Props) {
  const [sessionNow] = useState(() => Date.now());
  const [frozenCardStates] = useState(cardStates);
  const [showAnswer, setShowAnswer] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [shake, setShake] = useState(false);
  const [reviewedCardIds, setReviewedCardIds] = useState<Set<string>>(() => new Set());
  const [passedCardIds, setPassedCardIds] = useState<Set<string>>(() => new Set());
  const [pendingResult, setPendingResult] = useState<'correct' | 'incorrect' | null>(null);
  const [sessionStreaks, setSessionStreaks] = useState<Map<string, number>>(() => {
    const m = new Map<string, number>();
    cardStates.forEach((s) => m.set(s.cardId, s.streak));
    return m;
  });
  const [newStreakDot, setNewStreakDot] = useState<{ cardId: string; index: number } | null>(null);

  const fullQueue = useMemo(() => {
    const map = new Map(frozenCardStates.map((s) => [s.cardId, s]));
    const due: CardState[] = [];
    for (const card of deckCards) {
      const s = map.get(card.id);
      if (s && s.due <= sessionNow) {
        due.push(s);
      } else if (!s) {
        due.push({
          cardId: card.id,
          stability: 0,
          difficulty: 5,
          reps: 0,
          lapses: 0,
          streak: 0,
          due: sessionNow,
          lastReview: undefined,
          suspended: false,
        });
      }
    }
    return due
      .filter((s) => !s.suspended)
      .sort((a, b) => (a.stability || 0) - (b.stability || 0))
      .slice(0, sessionSize);
  }, [deckCards, frozenCardStates, sessionNow, sessionSize]);

  // Non-passed cards first, passed cards rotated to end
  const dueStates = useMemo(() => {
    const remaining = fullQueue.filter((s) => !reviewedCardIds.has(s.cardId) && !passedCardIds.has(s.cardId));
    const passed = fullQueue.filter((s) => passedCardIds.has(s.cardId) && !reviewedCardIds.has(s.cardId));
    return [...remaining, ...passed];
  }, [fullQueue, reviewedCardIds, passedCardIds]);

  const currentState = dueStates[0];
  const currentCard = useMemo(
    () => deckCards.find((c) => c.id === currentState?.cardId),
    [deckCards, currentState]
  );

  const liveStreak = currentCard
    ? (sessionStreaks.get(currentCard.id) ?? currentState?.streak ?? 0)
    : 0;
  const displayedStreak = pendingResult === 'correct'
    ? Math.min(liveStreak + 1, 5)
    : pendingResult === 'incorrect'
      ? 0
      : Math.min(liveStreak, 5);

  const quizType = useMemo<QuizType>(() => {
    if (!currentState || !currentCard) return 'meaning-mc';
    return getCardQuizType(currentCard);
  }, [currentState, currentCard]);

  const isTyping = quizType === 'meaning-type' || quizType === 'reading-type';

  const correctVal = useMemo(() => {
    if (!currentCard) return '';
    return (quizType === 'reading-mc' || quizType === 'reading-type')
      ? (currentCard.furigana || currentCard.back)
      : currentCard.back;
  }, [currentCard, quizType]);

  const options = useMemo(() => {
    if (!currentCard || isTyping) return [];
    const siblings = deckCards.filter((c) => c.id !== currentCard.id);
    const shuffled = [...siblings].sort(
      (a, b) => hashText(`${currentCard.id}:${a.id}`) - hashText(`${currentCard.id}:${b.id}`)
    );
    const getVal = (c: Card) =>
      quizType === 'reading-mc' ? (c.furigana || c.back) : c.back;
    const choices: string[] = [];
    const seen = new Set([correctVal]);
    for (const sibling of shuffled) {
      const value = getVal(sibling);
      if (!value || seen.has(value)) continue;
      seen.add(value);
      choices.push(value);
      if (choices.length === 3) break;
    }
    choices.push(correctVal);
    return choices.sort(
      (a, b) => hashText(`${currentCard.id}:choice:${a}`) - hashText(`${currentCard.id}:choice:${b}`)
    );
  }, [deckCards, currentCard, quizType, isTyping, correctVal]);

  const handleAnswer = useCallback((autoResult: 'correct' | 'incorrect') => {
    if (!currentCard || !currentState || pendingResult !== null) return;
    if (autoResult === 'incorrect') {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
    setShowAnswer(true);
    setPendingResult(autoResult);
  }, [currentCard, currentState, pendingResult]);

  const handleConfirm = useCallback((result: 'correct' | 'incorrect') => {
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

    setSessionStreaks((prev) => {
      const next = new Map(prev);
      next.set(currentCard.id, nextState.streak);
      return next;
    });
    if (result === 'correct' && nextState.streak > 0) {
      setNewStreakDot({ cardId: currentCard.id, index: nextState.streak - 1 });
    } else {
      setNewStreakDot(null);
    }
    setReviewedCardIds((prev) => {
      const next = new Set(prev);
      next.add(currentCard.id);
      return next;
    });
    setPassedCardIds((prev) => {
      const next = new Set(prev);
      next.delete(currentCard.id);
      return next;
    });
    setShowAnswer(false);
    setTypedAnswer('');
    setPendingResult(null);
  }, [currentCard, currentState, deckId, onLog]);

  const handlePass = useCallback(() => {
    if (!currentCard || !currentState || pendingResult !== null) return;
    handleConfirm('incorrect');
  }, [currentCard, currentState, pendingResult, handleConfirm]);

  const handleTypedSubmit = useCallback(() => {
    if (!currentCard || pendingResult !== null) return;
    let isCorrect: boolean;
    if (quizType === 'reading-type') {
      isCorrect = matchesRomaji(typedAnswer, currentCard.furigana ?? '', currentCard.back);
    } else {
      isCorrect =
        typedAnswer.trim().toLowerCase() === currentCard.back.trim().toLowerCase() ||
        matchesRomaji(typedAnswer, currentCard.furigana ?? '', currentCard.back);
    }
    handleAnswer(isCorrect ? 'correct' : 'incorrect');
  }, [typedAnswer, currentCard, quizType, pendingResult, handleAnswer]);

  const totalSessionCards = fullQueue.length;
  const progress = totalSessionCards > 0 ? (reviewedCardIds.size / totalSessionCards) * 100 : 100;

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
          <button className="btn-primary" onClick={onBack}>Back to Decks</button>
        </motion.div>
      </div>
    );
  }

  const streakColors = ['#ff4444', '#ff8844', '#ffcc44', '#88cc44', '#44cc44'];
  const streakDots = Array.from({ length: 5 }).map((_, i) => {
    const lit = i < displayedStreak;
    const color = lit ? streakColors[i] : 'rgba(255,255,255,0.15)';
    const justLit = (
      pendingResult === 'correct' && displayedStreak > 0 && i === displayedStreak - 1
    ) || (
      newStreakDot?.cardId === currentCard?.id && Math.min(newStreakDot.index, 4) === i
    );
    return (
      <span
        key={i}
        className="streak-dot"
        data-just-lit={justLit}
        style={{ background: color, boxShadow: lit ? `0 0 10px ${color}66` : 'none' }}
      />
    );
  });

  return (
    <>
      <div className={`study-wrap ${shake ? 'shake' : ''}`}>
        <div className="study-top">
          <button className="btn-ghost" onClick={onBack}>End</button>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="mode-indicator">{quizLabel(quizType)}</div>
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
                <div className="quiz-type-hint">
                  {quizType === 'reading-mc' || quizType === 'reading-type' ? 'Reading' : 'Meaning'}
                </div>
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
                      <div className="card-back-furigana">{currentCard.furigana}</div>
                    )}
                    {currentCard.tags && (
                      <div className="card-tags">{currentCard.tags.join(' ')}</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {!pendingResult && !isTyping && (
                <div className="options-grid">
                  {options.map((opt, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAnswer(opt === correctVal ? 'correct' : 'incorrect')}
                      className="option-btn"
                    >
                      {opt}
                    </motion.button>
                  ))}
                </div>
              )}

              {!pendingResult && isTyping && (
                <div className="type-area">
                  <input
                    autoFocus
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleTypedSubmit(); }}
                    placeholder={quizType === 'reading-type' ? 'Type reading (romaji ok)…' : 'Type meaning…'}
                    className="type-input"
                  />
                  <button className="btn-primary" onClick={handleTypedSubmit}>Check</button>
                </div>
              )}

              {!pendingResult && (
                <button className="btn-pass" onClick={handlePass}>Pass</button>
              )}

              {pendingResult && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="answer-actions"
                >
                  <div className="correction-btns">
                    <button
                      className={`btn-correction wrong${pendingResult === 'incorrect' ? ' active' : ''}`}
                      onClick={() => setPendingResult('incorrect')}
                      title="Mark wrong"
                    >✗</button>
                    <button
                      className={`btn-correction right${pendingResult === 'correct' ? ' active' : ''}`}
                      onClick={() => setPendingResult('correct')}
                      title="Mark correct"
                    >✓</button>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-primary btn-next"
                    onClick={() => handleConfirm(pendingResult)}
                  >
                    Next →
                  </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
