import { v4 } from './uuid';
import type { Card } from '../types';

export type StudyQuizType = 'meaning-mc' | 'reading-mc' | 'meaning-type' | 'reading-type';

const TASK_TAG_PREFIX = 'task:';
const SOURCE_TAG_PREFIX = 'source:';

const FURIGANA_TASKS: StudyQuizType[] = ['meaning-mc', 'reading-mc', 'meaning-type', 'reading-type'];
const MEANING_TASKS: StudyQuizType[] = ['meaning-mc', 'meaning-type'];

export function getStudyTaskTypes(card: Pick<Card, 'furigana'>): StudyQuizType[] {
  return card.furigana ? FURIGANA_TASKS : MEANING_TASKS;
}

export function getCardQuizType(card: Pick<Card, 'tags'>): StudyQuizType {
  const taskTag = card.tags?.find((tag) => tag.startsWith(TASK_TAG_PREFIX));
  const task = taskTag?.slice(TASK_TAG_PREFIX.length) as StudyQuizType | undefined;
  return task && FURIGANA_TASKS.includes(task) ? task : 'meaning-mc';
}

export function isTaskVariant(card: Pick<Card, 'tags'>): boolean {
  return !!card.tags?.some((tag) => tag.startsWith(TASK_TAG_PREFIX));
}

export function expandCardsToTaskVariants(cards: Card[]): Card[] {
  const existingBySource = new Map<string, Set<StudyQuizType>>();

  for (const card of cards) {
    const sourceTag = card.tags?.find((tag) => tag.startsWith(SOURCE_TAG_PREFIX));
    const sourceId = sourceTag?.slice(SOURCE_TAG_PREFIX.length);
    if (!sourceId) continue;
    const task = getCardQuizType(card);
    const existing = existingBySource.get(sourceId) ?? new Set<StudyQuizType>();
    existing.add(task);
    existingBySource.set(sourceId, existing);
  }

  const expanded: Card[] = [...cards];
  for (const card of cards) {
    if (isTaskVariant(card)) continue;

    const existing = existingBySource.get(card.id) ?? new Set<StudyQuizType>();
    const missingTasks = getStudyTaskTypes(card).filter(
      (task) => task !== 'meaning-mc' && !existing.has(task)
    );

    for (const task of missingTasks) {
      expanded.push({
        ...card,
        id: v4(),
        tags: [...(card.tags ?? []), `${SOURCE_TAG_PREFIX}${card.id}`, `${TASK_TAG_PREFIX}${task}`],
      });
    }
  }

  return expanded;
}
