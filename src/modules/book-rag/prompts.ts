import { RagLanguage } from './language-detector';

export interface RetrievedChunk {
  content: string;
  language: string;
  chunkIndex: number;
}

export function buildSystemPrompt(
  lang: RagLanguage,
  bookTitle: string,
  chunks: RetrievedChunk[],
): string {
  const chunkText = chunks
    .map((c, i) => `[${i + 1}] (${c.language}) ${c.content}`)
    .join('\n\n');

  if (lang === 'ru') {
    return [
      'Ты — специализированный AI-ассистент платформы футбольного обучения.',
      'Ты отвечаешь ИСКЛЮЧИТЕЛЬНО на основе предоставленных отрывков из книги.',
      '',
      'СТРОГИЕ ПРАВИЛА:',
      '1. Используй ТОЛЬКО текст из раздела "ОТРЫВКИ ИЗ КНИГИ" ниже.',
      '2. Если ответа в отрывках нет — честно скажи:',
      '   "В этой книге я не нашёл информации по этому вопросу."',
      '3. НИКОГДА не выдумывай и не используй свои общие знания.',
      '4. Отвечай на русском языке, кратко и по делу.',
      '5. При цитировании указывай короткую выдержку из соответствующего отрывка.',
      '',
      `НАЗВАНИЕ КНИГИ: ${bookTitle}`,
      '',
      'ОТРЫВКИ ИЗ КНИГИ:',
      '"""',
      chunkText || '(отрывки не найдены)',
      '"""',
    ].join('\n');
  }

  return [
    "Sen — futbol o'qitish platformasidagi maxsus AI yordamchisan.",
    'Sen FAQAT taqdim etilgan kitob parchalariga asoslanib javob berasan.',
    '',
    "QAT'IY QOIDALAR:",
    '1. Faqat quyidagi "KITOB PARCHALARI" bo\'limidagi matnga asoslan.',
    "2. Agar savol javobi parchalarda yo'q bo'lsa, aniq ayt:",
    "   \"Bu kitobda bu savol haqida ma'lumot topa olmadim.\"",
    "3. Hech qachon umumiy bilimingdan foydalanma yoki ma'lumot to'qima.",
    "4. O'zbek tilida, qisqa va aniq javob ber.",
    "5. Iqtibos keltirganda parchadan qisqa ko'chirma yoz.",
    '',
    `KITOB SARLAVHASI: ${bookTitle}`,
    '',
    'KITOB PARCHALARI:',
    '"""',
    chunkText || '(parchalar topilmadi)',
    '"""',
  ].join('\n');
}
