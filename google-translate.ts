import { type GoogleLanguage, googleLanguages } from './languages.ts';

interface GoogleData {
  src: string;
  sentences: {
    trans: string;
    orig: string;
  }[];
}

export async function translate(text: string, sourceLang: GoogleLanguage, targetLang: GoogleLanguage): Promise<string> {
  const params = {
    client: 'gtx',
    sl: sourceLang,
    tl: targetLang,
    dt: 't',
    dj: '1',
    source: 'input',
    q: text,
  };

  const url = 'https://translate.googleapis.com/translate_a/single?' + new URLSearchParams(params);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to translate "${text}" (${sourceLang} -> ${targetLang})\n${res.status} ${res.statusText}`);

  const data: GoogleData = await res.json();

  return extractTranslatedText(data);
}

export function extractTranslatedText(data: GoogleData): string {
  if (!data || !Array.isArray(data.sentences)) return '';
  return data.sentences.map((s) => s.trans).join('');
}

export function isGoogleLanguage(lang: string | GoogleLanguage): lang is GoogleLanguage {
  return Object.keys(googleLanguages).includes(lang);
}

// function formatTranslated(text: string, data: GoogleData) {
//   for (const { orig, trans } of data.sentences) {
//     text = text.replace(orig, trans);
//   }
//   return text;
// }

// function formatTranslated(data: GoogleData) {
//   return data.sentences
//     .map((s) => s?.trans)
//     .filter(Boolean)
//     .join('');
// }

// async function translate(text: string, sourceLang: GoogleLanguage, targetLang: GoogleLanguage): Promise<string> {
//   const translated = await googleTranslate(text, sourceLang, targetLang);
//   return formatTranslated(translated);
// }
