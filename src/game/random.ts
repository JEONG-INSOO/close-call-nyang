/** xorshift32: explicit state in/out keeps replay independent of ambient randomness. */
export function nextRandom(state: number): { state: number; value: number } {
  let next = (state >>> 0) || 1;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return { state: unsigned, value: unsigned / 4294967296 };
}
