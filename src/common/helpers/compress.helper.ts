export function compress(input: string): string {
  const words = input.trim().split(/\s+/);
  let result = '';

  if (words.length >= 3) {
    result = (
      words[0].charAt(0) +
      words[1].charAt(0) +
      words[2].charAt(0)
    ).toUpperCase();
  } else if (words.length === 2) {
    const firstWord = words[0];
    const secondWord = words[1];
    result = (
      firstWord.charAt(0) +
      firstWord.charAt(1) +
      secondWord.charAt(0)
    ).toUpperCase();
  } else if (words.length === 1) {
    const word = words[0];
    result = (word.charAt(0) + word.charAt(1) + word.charAt(2)).toUpperCase();
  }

  return result;
}
