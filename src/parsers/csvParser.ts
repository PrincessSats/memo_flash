import type { Card } from '../types';
import { v4 } from '../utils/uuid';

export function parseCSV(content: string, deckId: string): Card[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseLine(lines[0]);
  const cards: Card[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => row[h] = fields[idx] || '');
    const front = row['front'] || row['Front'] || row['word'] || row['Word'] || row['question'] || fields[0] || '';
    const back = row['back'] || row['Back'] || row['meaning'] || row['Meaning'] || row['answer'] || fields[1] || '';
    const furigana = row['furigana'] || row['Furigana'] || row['reading'] || row['Reading'] || fields[2] || '';
    const tagsRaw = row['tags'] || row['Tags'] || fields[3] || '';
    if (!front.trim()) continue;
    cards.push({
      id: v4(),
      deckId,
      front: front.trim(),
      back: back.trim(),
      furigana: furigana.trim() || undefined,
      tags: tagsRaw.split(',').map(t => t.trim()).filter(Boolean),
      created: Date.now(),
    });
  }
  return cards;
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { insideQuotes = !insideQuotes; }
    } else if (char === ',' && !insideQuotes) {
      result.push(current); current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
