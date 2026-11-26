// Resistor colour code (IEC 60062:2016).

export const COLORS = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white', 'gold', 'silver', 'none'];

export const HEX = {
  black: '#1b1b1b', brown: '#7a4a24', red: '#d22b2b', orange: '#f08a1c', yellow: '#f3d22c', green: '#2e9a48',
  blue: '#2a63d4', violet: '#8a4fc9', grey: '#8f8f8f', white: '#f4f4f4', gold: '#c9a227', silver: '#c0c0c0', none: 'transparent',
};

export const DIGIT = { black: 0, brown: 1, red: 2, orange: 3, yellow: 4, green: 5, blue: 6, violet: 7, grey: 8, white: 9 };
export const MULTIPLIER = {
  black: 1, brown: 10, red: 1e2, orange: 1e3, yellow: 1e4, green: 1e5, blue: 1e6, violet: 1e7, grey: 1e8, white: 1e9,
  gold: 0.1, silver: 0.01,
};
/** Tolerance in % (IEC 60062:2016; grey 0.01 %, older charts show 0.05 %). */
export const TOLERANCE = {
  brown: 1, red: 2, orange: 0.05, yellow: 0.02, green: 0.5, blue: 0.25, violet: 0.1, grey: 0.01, gold: 5, silver: 10, none: 20,
};
/** Temperature coefficient (ppm/K), 6th band. */
export const TEMPCO = { black: 250, brown: 100, red: 50, orange: 15, yellow: 25, green: 20, blue: 10, violet: 5, grey: 1 };

/** Decode bands → { ohms, tolPct, tempco }. bands: 4, 5 or 6 colour names. */
export function decode(bands) {
  const n = bands.length;
  const digits = n === 4 ? bands.slice(0, 2) : bands.slice(0, 3);
  if (digits.some((c) => DIGIT[c] === undefined)) return { ok: false, errors: ['digit'] };
  const mult = MULTIPLIER[bands[digits.length]];
  if (mult === undefined) return { ok: false, errors: ['multiplier'] };
  const tolColor = bands[digits.length + 1];
  const tolPct = TOLERANCE[tolColor];
  if (tolPct === undefined) return { ok: false, errors: ['tolerance'] };
  const base = digits.reduce((a, c) => a * 10 + DIGIT[c], 0);
  const ohms = Number((base * mult).toPrecision(12));
  const res = {
    ok: true, ohms, tolPct, min: ohms * (1 - tolPct / 100), max: ohms * (1 + tolPct / 100),
    digits: digits.map((c) => DIGIT[c]), mult, // the values read from the bands, for the calculation steps
  };
  if (n === 6) res.tempco = TEMPCO[bands[5]];
  return res;
}

// ---------------------------------------------------------------------------
// SMD resistor marking: 3-digit (E24), 4-digit (E96 and better), EIA-96.
// ---------------------------------------------------------------------------

/** EIA-96 multiplier letters. */
export const EIA96_MULT = { Z: 0.001, Y: 0.01, R: 0.01, X: 0.1, S: 0.1, A: 1, B: 10, H: 10, C: 100, D: 1e3, E: 1e4, F: 1e5 };

/**
 * Decode an SMD resistor code. e96 = the E96 decade list (100…976) for EIA-96.
 * Returns { ok, ohms, kind } with kind '3', '4', 'eia96' or 'zero', plus how the
 * code was read (for the calculation steps): `code` as normalised and `rule`
 * 'eia96' (index, value, letter, mult), 'point' (R as decimal point) or
 * 'digits' (digits, exp).
 */
export function decodeSmd(code, e96) {
  const c = String(code).trim().toUpperCase().replace(/\s+/g, '');
  if (/^0+$/.test(c)) return { ok: true, ohms: 0, kind: 'zero', code: c, rule: 'zero' };
  // Two digits + R can be read two ways: R as the decimal point (47R = 47 Ω,
  // the usual meaning) or as an EIA-96 code whose multiplier letter R is ×0.01
  // (47R = 3.01 Ω on a 1 % part). The plain reading is returned and the other
  // one is given in `alt` when it differs.
  let m = c.match(/^(\d{2})R$/);
  if (m) {
    const ohms = Number(m[1]);
    const i = Number(m[1]);
    const eia = e96 && i >= 1 && i <= 96 ? Number((e96[i - 1] * EIA96_MULT.R).toPrecision(6)) : null;
    const alt = eia !== null && eia !== ohms
      ? { ohms: eia, rule: 'eia96', index: m[1], value: e96[i - 1], letter: 'R', mult: EIA96_MULT.R }
      : null;
    return { ok: true, ohms, kind: ohms === 0 ? 'zero' : '3', code: c, rule: ohms === 0 ? 'zero' : 'point', ...(alt ? { alt } : {}) };
  }
  m = c.match(/^(\d{2})([ZYRXSABHCDEF])$/);
  if (m && e96) {
    const i = Number(m[1]);
    if (i < 1 || i > 96) return { ok: false, errors: ['smd'] };
    return {
      ok: true, ohms: Number((e96[i - 1] * EIA96_MULT[m[2]]).toPrecision(6)), kind: 'eia96',
      code: c, rule: 'eia96', index: m[1], value: e96[i - 1], letter: m[2], mult: EIA96_MULT[m[2]],
    };
  }
  // R as decimal point: 4R7, R47, 10R0
  m = c.match(/^(\d*)R(\d*)$/);
  if (m && (m[1] || m[2]) && c.length <= 4) return { ok: true, ohms: Number(`${m[1] || '0'}.${m[2] || '0'}`), kind: c.length === 4 ? '4' : '3', code: c, rule: 'point' };
  m = c.match(/^(\d{2,3})(\d)$/);
  if (m) return { ok: true, ohms: Number(m[1]) * 10 ** Number(m[2]), kind: c.length === 4 ? '4' : '3', code: c, rule: 'digits', digits: Number(m[1]), exp: Number(m[2]) };
  return { ok: false, errors: ['smd'] };
}

/** SMD codes for a value: 3-digit, 4-digit and (when it is an E96 value) EIA-96. */
export function encodeSmd(ohms, e96) {
  const out = {};
  const code = (sig) => {
    if (ohms < 10 ** (sig - 1)) {
      // Below the smallest 3/4-digit code with exponent 0: use R as decimal point.
      const s = Number(ohms.toPrecision(sig)).toString().replace('.', 'R');
      return (s.includes('R') ? s : `${s}R`).replace(/^0R/, 'R').padEnd(sig + 1, '0').slice(0, sig + 1);
    }
    const exp = Math.floor(Math.log10(ohms)) - (sig - 1);
    const mant = Math.round(ohms / 10 ** exp);
    if (exp > 9) return null;
    return `${mant}${exp}`;
  };
  out.three = code(2);
  out.four = code(3);
  if (e96 && ohms > 0) {
    const exp = Math.floor(Math.log10(ohms)) - 2;
    const mant = Number((ohms / 10 ** exp).toPrecision(6));
    const idx = e96.findIndex((x) => Math.abs(x - mant) < 1e-6);
    const letter = Object.keys(EIA96_MULT).find((k) => ['Z', 'Y', 'X', 'A', 'B', 'C', 'D', 'E', 'F'].includes(k) && Math.abs(Math.log10(EIA96_MULT[k]) - exp) < 1e-9);
    if (idx >= 0 && letter) out.eia96 = `${String(idx + 1).padStart(2, '0')}${letter}`;
  }
  return out;
}

/**
 * Encode a value into bands (4 bands = 2 significant digits, 5/6 bands = 3).
 * Returns { ok, bands, exact } — exact is false when the value needs more digits.
 */
export function encode(ohms, nBands = 4, tolColor = 'gold', tempcoColor = 'brown') {
  if (!(ohms > 0)) return { ok: false, errors: ['value'] };
  const sig = nBands === 4 ? 2 : 3;
  let exp = Math.floor(Math.log10(ohms)) - (sig - 1);
  let mant = Math.round(ohms / 10 ** exp);
  if (mant >= 10 ** sig) { mant /= 10; exp += 1; }
  const multColor = Object.keys(MULTIPLIER).find((c) => Math.abs(Math.log10(MULTIPLIER[c]) - exp) < 1e-9);
  if (!multColor) return { ok: false, errors: ['range'] };
  const digits = String(mant).padStart(sig, '0').split('').map((d) => Object.keys(DIGIT).find((c) => DIGIT[c] === Number(d)));
  const bands = [...digits, multColor, tolColor];
  if (nBands === 6) bands.push(tempcoColor);
  const value = mant * 10 ** exp;
  return { ok: true, bands, value: Number(value.toPrecision(12)), exact: Math.abs(value - ohms) / ohms < 1e-9 };
}
