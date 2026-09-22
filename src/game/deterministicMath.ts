// Fixed arithmetic, not runtime-dependent transcendental implementations.
const PI = 3.141592653589793;
const TWO_PI = 6.283185307179586;
const LN_TWO = 0.6931471805599453;
const PRECISION = 1_000_000_000;

/** Odd Taylor series through degree 17, on the fixed [-pi, pi] reduction. */
export function stableSin(value: number): number {
  if (!Number.isFinite(value)) return NaN;
  let reduced = value % TWO_PI;
  if (reduced > PI) reduced -= TWO_PI;
  if (reduced < -PI) reduced += TWO_PI;
  const square = reduced * reduced;
  let term = reduced;
  let sum = term;
  for (let degree = 3; degree <= 17; degree += 2) {
    term = -term * square / ((degree - 1) * degree);
    sum += term;
  }
  return sum === 0 ? 0 : sum;
}

/** log(1+x) for x>=0, power-of-two reduction and 20 odd atanh terms. */
export function stableLog1p(value: number): number {
  if (value < 0 || Number.isNaN(value)) return NaN;
  if (value === Infinity) return Infinity;
  let reduced = 1 + value;
  let exponent = 0;
  while (reduced >= 2) {
    reduced /= 2;
    exponent += 1;
  }
  const z = (reduced - 1) / (reduced + 1);
  const square = z * z;
  let power = z;
  let sum = 0;
  for (let index = 0; index < 20; index += 1) {
    sum += power / (2 * index + 1);
    power *= square;
  }
  return 2 * sum + exponent * LN_TWO;
}

/** Fixed 1e-9 checkpoint precision; never turn an already finite value into Infinity. */
export function quantize(value: number): number {
  const scaled = value * PRECISION;
  const rounded = Number.isFinite(scaled) ? Math.round(scaled) / PRECISION : value;
  return rounded === 0 ? 0 : rounded;
}
