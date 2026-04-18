export type ClassificationDecision = 'skip' | 'process';

export interface ClassificationResult {
  decision: ClassificationDecision;
  confidence: number;
  hits: string[];
  reliable: boolean;
}

interface RegexRule {
  key: string;
  re: RegExp;
}

const RULES: RegexRule[] = [
  { key: 'phone', re: /(\+998|\+7|\b\d{9,12}\b)/i },
  { key: 'cargo', re: /(yuk|gruz|груз|load)/i },
  { key: 'truck', re: /(tent|тент|fura|фура|ref|реф|gazel|газель)/i },
  { key: 'weight', re: /(\d+(\.\d+)?\s*(t|т|ton|тонна|m3|м3))/i },
  { key: 'money', re: /(usd|\$|доллар|сум|uzs|руб|наличка|переч)/i },
  { key: 'route', re: /(->|→|—|-)/ },
];

export function classifyByRegex(message: string): ClassificationResult {
  const text = message.toLowerCase();
console.log(text, "text");

  const hits = RULES.filter((rule) => rule.re.test(text)).map(
    (rule) => rule.key
  );

  // 🔴 Umuman signal yo‘q
  if (hits.length === 0) {
    return {
      decision: 'skip',
      confidence: 0.95,
      hits,
      reliable: true,
    };
  }

  // 🟡 Bitta signal — LLM tekshirishi kerak
  if (hits.length === 1) {
    return {
      decision: 'skip',
      confidence: 0.6,
      hits,
      reliable: false,
    };
  }

  // 🟢 Yetarli signal
  return {
    decision: 'process',
    confidence: Math.min(0.7 + hits.length * 0.1, 0.95),
    hits,
    reliable: true,
  };
}
