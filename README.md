<<<<<<< HEAD
# memo_flash
=======
# Memo

Offline-first spaced repetition flashcard app.

## Stack

- Vite + React + TypeScript
- Framer Motion (animations)
- sql.js (Anki .apkg parsing)
- Lucide React (icons)

## Features

- **Import** `.csv` and `.apkg` decks
- **Study modes**: Type answer or Multiple choice
- **Streak-based difficulty**: 0-1 = Again, 2 = Hard, 3-4 = Good, 5+ = Easy
- **FSRS-inspired scheduling** with power-law forgetting curves
- **Frosted glass UI** with 3D card animations
- **Fully offline** via localStorage
- **Ready for Supabase** — schema provided

## Deploy

1. Push to GitHub
2. Import to Vercel
3. Set `framework preset` to **Vite**

## Supabase migration

Run `supabase/schema.sql` in Supabase SQL Editor, then replace `storage/localStorage.ts` with a Supabase client wrapper.
>>>>>>> 4c20556 (Init memo flashcard app)
