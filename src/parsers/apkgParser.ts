import JSZip from 'jszip';
import initSqlJs from 'sql.js';
import type { Card } from '../types';

export async function parseApkg(file: File): Promise<{ name: string; cards: Card[] }> {
  const zip = await JSZip.loadAsync(file);
  const dbFile = zip.file('collection.anki21') || zip.file('collection.anki2');
  if (!dbFile) throw new Error('No Anki DB found in .apkg');
  const buffer = await dbFile.async('arraybuffer');

  const SQL = await initSqlJs({
    locateFile: (fileName: string) => {
      // sql.js wasm must be served from public/
      return `/${fileName}`;
    },
  });
  const db = new SQL.Database(new Uint8Array(buffer));

  // Read collection name
  const colRes = db.exec("SELECT decks FROM col");
  let deckName = file.name.replace(/\.apkg$/i, '');
  if (colRes.length > 0 && colRes[0].values.length > 0) {
    try {
      const decksObj = JSON.parse(colRes[0].values[0][0] as string);
      const firstDeck = Object.values(decksObj)[0] as any;
      if (firstDeck?.name) deckName = firstDeck.name;
    } catch { }
  }

  // Read notes (cards are derived from notes + templates, but for SRS simplicity we flatten)
  const notesRes = db.exec("SELECT id, flds, tags, sfld FROM notes");
  const cards: Card[] = [];
  if (notesRes.length > 0 && notesRes[0].values.length > 0) {
    for (const row of notesRes[0].values) {
      const [nid, flds, tags, sfld] = row;
      const fields = (flds as string).split('\x1f');
      const front = (sfld as string) || fields[0] || '';
      const back = fields[1] || '';
      const tagList = (tags as string).split(' ').map(t => t.trim()).filter(Boolean);
      cards.push({
        id: `apkg-${nid}-${Date.now()}`,
        deckId: '', // filled later
        front: front.trim(),
        back: back.trim(),
        tags: tagList,
        created: Number(nid),
      });
    }
  }

  db.close();
  return { name: deckName, cards };
}
