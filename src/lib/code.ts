const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function newCode(len = 7): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
