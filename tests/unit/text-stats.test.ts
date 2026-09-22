import { describe, expect, it } from 'vitest';
import {
  countCharacters,
  countLines,
  countParagraphs,
  countSentences,
  formatDuration,
  smsInfo,
  textStats,
  toSentenceCase,
  toTitleCase,
  topKeywords,
  words,
} from '../../src/lib/text-stats';

describe('word splitting', () => {
  it('counts English words with apostrophes, hyphens and numbers', () => {
    expect(words("Don't stop — it's a well-known fact: 3.14 and 1,000 people.")).toEqual([
      "Don't", 'stop', "it's", 'a', 'well-known', 'fact', '3.14', 'and', '1,000', 'people',
    ]);
  });
  it('handles accented Latin', () => {
    expect(words('Café naïve résumé São Paulo')).toHaveLength(5);
  });
  it('handles Urdu, Arabic and Hindi', () => {
    expect(words('یہ ایک جملہ ہے۔')).toHaveLength(4);
    expect(words('مرحبا بالعالم')).toHaveLength(2);
    expect(words('नमस्ते दुनिया, यह परीक्षण है।')).toHaveLength(5);
  });
  it('handles mixed scripts in one text', () => {
    expect(words('Hello दुनिया and سلام world')).toHaveLength(5);
  });
  it('ignores punctuation, emoji and whitespace', () => {
    expect(words('  ... !!! 😀 \n\t ')).toHaveLength(0);
    expect(words('')).toHaveLength(0);
  });
});

describe('characters, sentences, paragraphs, lines', () => {
  it('counts graphemes, so emoji and accents count as one', () => {
    expect(countCharacters('a b')).toEqual({ withSpaces: 3, withoutSpaces: 2 });
    expect(countCharacters('👍🏽 é')).toEqual({ withSpaces: 3, withoutSpaces: 2 });
    expect(countCharacters('')).toEqual({ withSpaces: 0, withoutSpaces: 0 });
  });
  it('counts sentences across scripts', () => {
    expect(countSentences('One. Two! Three? Four')).toBe(4);
    expect(countSentences('Version 2.5 is out. Great.')).toBe(2);
    expect(countSentences('یہ ایک جملہ ہے۔ دوسرا جملہ۔')).toBe(2);
    expect(countSentences('पहला वाक्य। दूसरा वाक्य।')).toBe(2);
    expect(countSentences('...')).toBe(0);
  });
  it('counts paragraphs and non-empty lines', () => {
    const text = 'First para line one\nline two\n\n\nSecond para\n  \nThird';
    expect(countParagraphs(text)).toBe(3);
    expect(countLines(text)).toBe(4);
    expect(countParagraphs('   ')).toBe(0);
  });
});

describe('keywords and totals', () => {
  it('ranks keywords without stop words, with density', () => {
    const k = topKeywords('The cat and the hat. The cat sat. Cat!');
    expect(k[0]).toEqual({ word: 'cat', count: 3, density: 33.3 });
    expect(k.map((x) => x.word)).not.toContain('the');
  });
  it('limits to 10 keywords', () => {
    const text = Array.from({ length: 15 }, (_, i) => `word${String.fromCharCode(97 + i)}`).join(' ');
    expect(topKeywords(text)).toHaveLength(10);
  });
  it('computes full stats', () => {
    const s = textStats('Hello world. This is a test of the counter.');
    expect(s.words).toBe(9);
    expect(s.sentences).toBe(2);
    expect(s.longestWord).toBe('counter');
    expect(s.readingSeconds).toBe(3); // 9 words at 200 wpm
    expect(s.averageWordLength).toBe(3.7); // 33 letters / 9 words
  });
  it('handles empty and huge input', () => {
    expect(textStats('').words).toBe(0);
    expect(textStats('').readingSeconds).toBe(0);
    const big = 'lorem ipsum dolor '.repeat(50_000);
    const start = performance.now();
    const s = textStats(big);
    expect(performance.now() - start).toBeLessThan(1500);
    expect(s.words).toBe(150_000);
    expect(formatDuration(s.readingSeconds)).toBe('12 hr 30 min');
  });
  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 sec');
    expect(formatDuration(90)).toBe('1 min 30 sec');
    expect(formatDuration(120)).toBe('2 min');
  });
});

describe('case conversion', () => {
  it('title case keeps minor words lower', () => {
    expect(toTitleCase('the lord of the rings')).toBe('The Lord of the Rings');
    expect(toTitleCase('HELLO WORLD')).toBe('Hello World');
    expect(toTitleCase('the cat sat. the dog ran')).toBe('The Cat Sat. The Dog Ran');
  });
  it('sentence case capitalizes sentence starts and "I"', () => {
    expect(toSentenceCase('HELLO THERE. i AM HERE! what?')).toBe('Hello there. I am here! What?');
  });
});

describe('SMS encoding', () => {
  it('uses GSM-7 for plain text', () => {
    expect(smsInfo('Hello')).toMatchObject({ encoding: 'GSM-7', units: 5, segments: 1, perSegment: 160 });
    expect(smsInfo('a'.repeat(161))).toMatchObject({ segments: 2, perSegment: 153 });
    expect(smsInfo('')).toMatchObject({ segments: 0 });
  });
  it('counts extended GSM characters as 2', () => {
    expect(smsInfo('€[]').units).toBe(6);
  });
  it('switches to Unicode for emoji and non-Latin scripts', () => {
    expect(smsInfo('Hi 😀')).toMatchObject({ encoding: 'Unicode', units: 5, perSegment: 70, unicodeTrigger: '😀' });
    expect(smsInfo('سلام').encoding).toBe('Unicode');
    expect(smsInfo('x'.repeat(71) + 'ś')).toMatchObject({ segments: 2, perSegment: 67 });
  });
});
