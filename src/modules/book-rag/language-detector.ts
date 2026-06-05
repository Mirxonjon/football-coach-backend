export type RagLanguage = 'uz' | 'ru';

/**
 * Heuristic UZ/RU detector based on Cyrillic vs Latin character ratio.
 * - 30%+ Cyrillic → 'ru'
 * - otherwise → 'uz' (Latin/default)
 * Works reliably because UZ uses Latin alphabet and RU uses Cyrillic.
 */
export function detectLanguage(text: string): RagLanguage {
  if (!text) return 'uz';
  const cyrillic = (text.match(/[А-Яа-яЁё]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const total = cyrillic + latin;
  if (total === 0) return 'uz';
  return cyrillic / total > 0.3 ? 'ru' : 'uz';
}
