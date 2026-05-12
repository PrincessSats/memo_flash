/**
 * Romaji → Hiragana converter.
 * Supports Hepburn-style input.
 * Example: "moshiwakegozaimasen" → "もしわけございません"
 */

const ROMAJI_MAP: Record<string, string> = {
  // Special cases (handled before general rules)
  // Double consonants
  kka: 'っか', kki: 'っき', kku: 'っく', kke: 'っけ', kko: 'っこ',
  ssa: 'っさ', sshi: 'っし', ssu: 'っす', sse: 'っせ', sso: 'っそ',
  tta: 'った', tchi: 'っち', ttsu: 'っつ', tte: 'って', tto: 'っと',
  ppa: 'っぱ', ppi: 'っぴ', ppu: 'っぷ', ppe: 'っぺ', ppo: 'っぽ',
  gga: 'っが', ggi: 'っぎ', ggu: 'っぐ', gge: 'っげ', ggo: 'っご',
  zza: 'っざ', jji: 'っじ', zzu: 'っず', zze: 'っぜ', zzo: 'っぞ',
  dda: 'っだ', ddji: 'っぢ', ddzu: 'っづ', dde: 'っで', ddo: 'っど',
  bba: 'っば', bbi: 'っび', bbu: 'っぶ', bbe: 'っべ', bbo: 'っぼ',

  // Three-letter combos
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
  sha: 'しゃ', shi: 'し', shu: 'しゅ', sho: 'しょ',
  cha: 'ちゃ', chi: 'ち', chu: 'ちゅ', cho: 'ちょ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
  hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
  rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
  gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  ja: 'じゃ', ji: 'じ', ju: 'じゅ', jo: 'じょ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
  dya: 'ぢゃ', dyu: 'ぢゅ', dyo: 'ぢょ',

  // Two-letter combos
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  sa: 'さ', su: 'す', se: 'せ', so: 'そ',
  ta: 'た', te: 'て', to: 'と',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', fu: 'ふ', he: 'へ', ho: 'ほ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  wa: 'わ', wi: 'ゐ', we: 'ゑ', wo: 'を',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  za: 'ざ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  da: 'だ', de: 'で', do: 'ど',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  vu: 'ゔ',

  // つ (tsu)
  tsu: 'つ',

  // Single vowels + n
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  '-': 'ー',
  n: 'ん',
};

/**
 * Convert a romaji string to hiragana.
 * Handles double-consonants (kk→っk), n'→ん, and standard mapping.
 */
export function romajiToHiragana(input: string): string {
  // Normalize: lowercase, strip non-alpha-but-keep-hyphen
  let s = input.toLowerCase().replace(/[^a-z\-']/g, '');

  // Handle n' → ん + next char (the n is consumed, apostrophe dropped)
  // We'll handle this by pre-processing: n' followed by vowel → ん+vowel
  // n' disambiguates ん+vowel from な/に/ぬ/ね/の
  s = s.replace(/n'(.)/g, 'ん$1');

  // Now process from left to right, greedy matching longest romaji sequence
  let result = '';
  let i = 0;

  while (i < s.length) {
    let matched = false;

    // Try 3-char match first
    if (i + 3 <= s.length) {
      const chunk3 = s.slice(i, i + 3);
      if (ROMAJI_MAP[chunk3]) {
        result += ROMAJI_MAP[chunk3];
        i += 3;
        matched = true;
      }
    }

    if (!matched && i + 2 <= s.length) {
      const chunk2 = s.slice(i, i + 2);
      if (ROMAJI_MAP[chunk2]) {
        result += ROMAJI_MAP[chunk2];
        i += 2;
        matched = true;
      }
    }

    if (!matched) {
      const chunk1 = s[i];
      if (ROMAJI_MAP[chunk1]) {
        // Special case: standalone 'n' before consonant → ん, skip consuming next
        if (chunk1 === 'n' && i + 1 < s.length && !'aiueoy'.includes(s[i + 1])) {
          result += 'ん';
          i += 1;
        } else {
          result += ROMAJI_MAP[chunk1];
          i += 1;
        }
      } else {
        // Unknown char, keep as-is
        result += s[i];
        i += 1;
      }
    }
  }

  return result;
}

/**
 * Collapse consecutive duplicate kana vowels into a single long-vowel.
 * もうし → もし (for lenient comparison)
 * こうこう → ここ
 */
function collapseLongVowels(s: string): string {
  // Replace sequences like ああ→あ, いい→い, うう→う, ええ→え, おお→お
  // Also handle おう→お, こう→こ pattern (o+u→ō)
  return s
    .replace(/ああ+/g, 'あ')
    .replace(/いい+/g, 'い')
    .replace(/うう+/g, 'う')
    .replace(/ええ+/g, 'え')
    .replace(/おお+/g, 'お')
    // Long-vowel markers: vowel+う in same column
    .replace(/こう/g, 'こ')
    .replace(/そう/g, 'そ')
    .replace(/とう/g, 'と')
    .replace(/のう/g, 'の')
    .replace(/ほう/g, 'ほ')
    .replace(/もう/g, 'も')
    .replace(/よう/g, 'よ')
    .replace(/ろう/g, 'ろ')
    .replace(/をう/g, 'を')
    .replace(/ごう/g, 'ご')
    .replace(/ぞう/g, 'ぞ')
    .replace(/どう/g, 'ど')
    .replace(/ぼう/g, 'ぼ')
    .replace(/ぽう/g, 'ぽ')
    .replace(/きゅう/g, 'きゅ')
    .replace(/しゅう/g, 'しゅ')
    .replace(/ちゅう/g, 'ちゅ')
    .replace(/にゅう/g, 'にゅ')
    .replace(/ひゅう/g, 'ひゅ')
    .replace(/みゅう/g, 'みゅ')
    .replace(/りゅう/g, 'りゅ')
    .replace(/ぎゅう/g, 'ぎゅ')
    .replace(/じゅう/g, 'じゅ')
    .replace(/びゅう/g, 'びゅ')
    .replace(/ぴゅう/g, 'ぴゅ')
    // ー (long vowel mark) — strip it
    .replace(/ー/g, '');
}

/**
 * Check if user's romaji input matches the expected kana/kanji answer.
 * Converts romaji to hiragana, then compares with furigana (reading).
 * Also supports lenient matching (e.g. "moshi" matches "もうし").
 *
 * @param userInput - Raw user input, possibly in romaji
 * @param furigana - The expected kana reading (e.g. "もうわけございません")
 * @param back - The card's back field (English meaning or full answer)
 * @returns true if the romaji input matches the furigana reading
 */
export function matchesRomaji(userInput: string, furigana: string, back: string): boolean {
  const normalize = (s: string) =>
    s.trim().toLowerCase().replace(/[\s\p{P}]/gu, '');

  const cleanInput = normalize(userInput);

  // Exact match against back or furigana (after normalization)
  const cleanBack = normalize(back);
  const cleanFurigana = furigana ? normalize(furigana) : '';
  if (cleanInput === cleanBack || (cleanFurigana && cleanInput === cleanFurigana)) {
    return true;
  }

  // Romaji → hiragana comparison (strict)
  if (cleanFurigana) {
    const converted = romajiToHiragana(cleanInput);
    if (converted === cleanFurigana) {
      return true;
    }
    // Lenient: collapse long vowels on both sides
    if (collapseLongVowels(converted) === collapseLongVowels(cleanFurigana)) {
      return true;
    }
  }

  // Also try converting and comparing with back (in case back is kana)
  if (cleanBack) {
    const converted = romajiToHiragana(cleanInput);
    if (converted === cleanBack) {
      return true;
    }
    if (collapseLongVowels(converted) === collapseLongVowels(cleanBack)) {
      return true;
    }
  }

  return false;
}
