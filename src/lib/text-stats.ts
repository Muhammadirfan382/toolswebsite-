/**
 * Text statistics shared by the word counter and character counter.
 * Unicode-aware: works for Latin (with accents), Urdu, Arabic, Hindi and other scripts that use spaces.
 */
import { READING_WPM, SMS_LIMITS, SPEAKING_WPM } from '../data/limits';

/**
 * A word is a run of letters, marks (Hindi/Urdu vowel signs), digits and joiners, optionally
 * linked by an apostrophe or hyphen (don't, well-known). Numbers like 3.14 or 1,000 count as one.
 */
const WORD_RE =
  /\p{N}+(?:[.,]\p{N}+)+|[\p{L}\p{M}\p{N}\u200C\u200D]+(?:['\u2019\-][\p{L}\p{M}\p{N}\u200C\u200D]+)*/gu;

/** Sentence enders: . ! ? … plus Urdu (۔), Arabic (؟) and Hindi (। ॥) marks. */
const SENTENCE_SPLIT_RE = /[.!?…۔؟।॥]+(?=[\s"'”’)\]]|$)/u;

export function words(text: string): string[] {
  return text.match(WORD_RE) ?? [];
}

let graphemeSegmenter: Intl.Segmenter | null | undefined;

/** Text where every UTF-16 unit is a whole character (no combining marks, emoji or surrogates). */
const SIMPLE_TEXT_RE = /^[\u0000-\u02FF\u0370-\u03FF\u0400-\u04FF\u2000-\u206F]*$/;

/** Number of user-perceived characters, with a fast path for simple text. */
export function graphemeLength(text: string): number {
  return SIMPLE_TEXT_RE.test(text) ? text.length : graphemes(text).length;
}

/** User-perceived characters (an emoji or "é" counts as 1). Falls back to code points. */
export function graphemes(text: string): string[] {
  if (graphemeSegmenter === undefined) {
    graphemeSegmenter =
      typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  }
  return graphemeSegmenter ? Array.from(graphemeSegmenter.segment(text), (s) => s.segment) : Array.from(text);
}

export function countCharacters(text: string): { withSpaces: number; withoutSpaces: number } {
  if (SIMPLE_TEXT_RE.test(text)) {
    return { withSpaces: text.length, withoutSpaces: text.replace(/\s+/g, '').length };
  }
  const g = graphemes(text);
  return { withSpaces: g.length, withoutSpaces: g.filter((c) => !/^\s+$/u.test(c)).length };
}

export function countSentences(text: string): number {
  return text.split(SENTENCE_SPLIT_RE).filter((s) => words(s).length > 0).length;
}

export function countParagraphs(text: string): number {
  return text.split(/\n\s*\n/).filter((p) => p.trim() !== '').length;
}

/** Lines that contain something other than whitespace. */
export function countLines(text: string): number {
  return text.split(/\r\n|\r|\n/).filter((l) => l.trim() !== '').length;
}

/** Common English words left out of the keyword list. */
export const STOP_WORDS = new Set(
  (
    'a about above after again against all am an and any are as at be because been before being below ' +
    'between both but by can could did do does doing down during each few for from further had has have ' +
    'having he her here hers herself him himself his how i if in into is it its itself just me more most ' +
    'my myself no nor not now of off on once only or other our ours ourselves out over own same she should ' +
    'so some such than that the their theirs them themselves then there these they this those through to ' +
    'too under until up very was we were what when where which while who whom why will with would you your ' +
    "yours yourself yourselves i'm it's don't doesn't didn't can't won't isn't aren't wasn't weren't i've " +
    "you're we're they're that's there's let's also may might must shall one two get got"
  ).split(/\s+/),
);

export interface Keyword {
  word: string;
  count: number;
  /** Percent of all words. */
  density: number;
}

export function topKeywords(text: string, limit = 10): Keyword[] {
  const all = words(text);
  if (all.length === 0) return [];
  const counts = new Map<string, number>();
  for (const w of all) {
    const key = w.toLocaleLowerCase().replace(/’/g, "'");
    if (STOP_WORDS.has(key) || /^\p{N}/u.test(key) || graphemeLength(key) < 2) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count, density: Math.round((count / all.length) * 1000) / 10 }));
}

/** Seconds for `wordCount` at `wpm`. */
export const durationSeconds = (wordCount: number, wpm: number): number =>
  wordCount === 0 ? 0 : Math.max(1, Math.round((wordCount / wpm) * 60));

export function formatDuration(seconds: number): string {
  if (seconds === 0) return '0 sec';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h} hr ${m} min`;
  if (m) return s ? `${m} min ${s} sec` : `${m} min`;
  return `${s} sec`;
}

export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  averageWordLength: number;
  readingSeconds: number;
  speakingSeconds: number;
  longestWord: string;
  keywords: Keyword[];
}

export function textStats(text: string, opts = { readingWpm: READING_WPM, speakingWpm: SPEAKING_WPM }): TextStats {
  const w = words(text);
  const chars = countCharacters(text);
  let letters = 0;
  let longestWord = '';
  let longestLength = 0;
  for (const word of w) {
    const len = graphemeLength(word);
    letters += len;
    if (len > longestLength) {
      longestLength = len;
      longestWord = word;
    }
  }
  return {
    words: w.length,
    characters: chars.withSpaces,
    charactersNoSpaces: chars.withoutSpaces,
    sentences: countSentences(text),
    paragraphs: countParagraphs(text),
    lines: countLines(text),
    averageWordLength: w.length ? Math.round((letters / w.length) * 10) / 10 : 0,
    readingSeconds: durationSeconds(w.length, opts.readingWpm),
    speakingSeconds: durationSeconds(w.length, opts.speakingWpm),
    longestWord,
    keywords: topKeywords(text),
  };
}

/* ------------------------------------------------------------------ */
/* Case conversion                                                     */
/* ------------------------------------------------------------------ */

const MINOR_WORDS = new Set('a an and as at but by for in nor of on or per the to vs via'.split(' '));

export function toTitleCase(text: string): string {
  let index = 0;
  const list = words(text);
  return text.replace(WORD_RE, (word, offset: number) => {
    const i = index++;
    const lower = word.toLocaleLowerCase();
    // Minor words stay lowercase unless they start the text, end it, or follow a sentence end.
    const afterSentenceEnd = /[.!?…:۔؟।]\s*$/u.test(text.slice(Math.max(0, offset - 4), offset));
    if (i !== 0 && i !== list.length - 1 && !afterSentenceEnd && MINOR_WORDS.has(lower)) return lower;
    return lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
  });
}

export function toSentenceCase(text: string): string {
  const lower = text.toLocaleLowerCase();
  // Capitalize the first letter of the text and after each sentence end.
  return lower
    .replace(/(^\s*|[.!?…۔؟।]\s+)(\p{L})/gu, (_, lead: string, ch: string) => lead + ch.toLocaleUpperCase())
    .replace(/(^|\s)i(?=\s|'|’|$|[.,!?])/g, '$1I');
}

/* ------------------------------------------------------------------ */
/* SMS encoding                                                        */
/* ------------------------------------------------------------------ */

const GSM7_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM7_EXTENDED = '^{}\\[~]|€\f';

export interface SmsInfo {
  encoding: 'GSM-7' | 'Unicode';
  /** Characters as the network counts them (GSM-7 extended characters count as 2). */
  units: number;
  segments: number;
  perSegment: number;
  /** The first character that forces Unicode, if any. */
  unicodeTrigger?: string;
}

export function smsInfo(text: string): SmsInfo {
  let units = 0;
  let trigger: string | undefined;
  for (const ch of text) {
    if (GSM7_BASIC.includes(ch)) units += 1;
    else if (GSM7_EXTENDED.includes(ch)) units += 2;
    else {
      trigger = ch;
      break;
    }
  }
  if (trigger === undefined) {
    const single = units <= SMS_LIMITS.gsm7Single;
    return {
      encoding: 'GSM-7',
      units,
      segments: units === 0 ? 0 : single ? 1 : Math.ceil(units / SMS_LIMITS.gsm7Multi),
      perSegment: single ? SMS_LIMITS.gsm7Single : SMS_LIMITS.gsm7Multi,
    };
  }
  // UCS-2 counts UTF-16 code units (an emoji uses 2).
  const u = text.length;
  const single = u <= SMS_LIMITS.ucs2Single;
  return {
    encoding: 'Unicode',
    units: u,
    segments: single ? 1 : Math.ceil(u / SMS_LIMITS.ucs2Multi),
    perSegment: single ? SMS_LIMITS.ucs2Single : SMS_LIMITS.ucs2Multi,
    unicodeTrigger: trigger,
  };
}
