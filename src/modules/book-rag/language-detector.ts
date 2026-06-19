export type RagLanguage = 'uz' | 'ru';
export type RagScript = 'latn' | 'cyrl';

export interface DetectedLocale {
  /** Used for chunk language filter — only `uz`/`ru` make sense here. */
  language: RagLanguage;
  /** Used to instruct Gemini which script the reply should be in. */
  script: RagScript;
}

/**
 * Uzbek-specific Cyrillic letters that never appear in Russian.
 * Their presence is a strong signal the text is Uzbek-in-Cyrillic.
 */
const UZ_CYRL_LETTERS = /[ҚқҒғҲҳЎў]/g;

/**
 * Russian-only Cyrillic letters that aren't used in Uzbek Cyrillic.
 * `ы` and `щ` are the cleanest signals.
 */
const RU_ONLY_LETTERS = /[ыЫщЩъЪэЭ]/g;

/**
 * Stopword markers. When a Cyrillic text has no UZ-specific letters
 * (some Uzbek writers omit ққ/ғғ/ҳҳ/ўў and use plain к/г/х/у), we
 * fall back to scoring common stopwords.
 */
const UZ_CYRL_WORDS = [
  'қандай', 'кандай', 'қилди', 'килди', 'бўлди', 'булди',
  'қилиш', 'килиш', 'ёки', 'ҳам', 'хам', 'учун', 'каби',
  'ҳолда', 'холда', 'нима', 'қандайдир', 'бошқа', 'бошка',
  'эди', 'бўлган', 'булган', 'қилган', 'килган', 'бўлади',
  'булади', 'марказда', 'олган', 'олди', 'бориб', 'келиб',
];

const RU_WORDS = [
  'как', 'что', 'это', 'этот', 'эта', 'для', 'или', 'но',
  'был', 'была', 'было', 'будет', 'когда', 'который', 'которая',
  'так', 'тоже', 'если', 'почему', 'потому', 'чтобы', 'через',
  'после', 'перед', 'между', 'около', 'центре', 'управлял',
];

/**
 * Detect both the language (`uz` | `ru`) and the script (`latn` | `cyrl`).
 *
 * Rules:
 *   • Mostly Latin chars → Uzbek-Latin (Russian-in-Latin is rare; ignored).
 *   • Cyrillic + UZ-only letters (ққ/ғғ/ҳҳ/ўў) → Uzbek-Cyrillic.
 *   • Cyrillic + RU-only letters (ы/щ/ъ) and no UZ markers → Russian.
 *   • Otherwise Cyrillic → score by stopwords; tie breaks to Russian
 *     (Russian is more common Cyrillic content in this corpus).
 */
export function detectLocale(text: string): DetectedLocale {
  if (!text) return { language: 'uz', script: 'latn' };

  const cyrillic = (text.match(/[А-Яа-яЁёҚқҒғҲҳЎў]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const total = cyrillic + latin;

  if (total === 0) return { language: 'uz', script: 'latn' };

  // Predominantly Latin → Uzbek in Latin script.
  if (cyrillic / total <= 0.3) {
    return { language: 'uz', script: 'latn' };
  }

  // Strong UZ-Cyrillic signal: any of ққ/ғғ/ҳҳ/ўў.
  const uzLetters = (text.match(UZ_CYRL_LETTERS) ?? []).length;
  if (uzLetters > 0) {
    return { language: 'uz', script: 'cyrl' };
  }

  // Strong RU signal: ы/щ/ъ/э are absent from Uzbek Cyrillic.
  const ruLetters = (text.match(RU_ONLY_LETTERS) ?? []).length;

  // Word-based scoring as fallback.
  const lower = text.toLowerCase();
  let uzScore = 0;
  let ruScore = 0;
  for (const w of UZ_CYRL_WORDS) if (lower.includes(w)) uzScore += 1;
  for (const w of RU_WORDS) if (lower.includes(w)) ruScore += 1;

  if (uzScore > ruScore) return { language: 'uz', script: 'cyrl' };
  if (ruScore > uzScore || ruLetters > 0) {
    return { language: 'ru', script: 'cyrl' };
  }

  // Truly ambiguous tie → default to Russian (more common in this corpus).
  return { language: 'ru', script: 'cyrl' };
}

/**
 * Back-compat shim — older callers only wanted the language.
 */
export function detectLanguage(text: string): RagLanguage {
  return detectLocale(text).language;
}
