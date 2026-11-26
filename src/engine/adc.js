// Ideal ADC relations: LSB size, quantisation noise, ideal SNR and ENOB
// (Analog Devices MT-001, MT-003, MT-229), the ideal transfer function with
// code transitions at ½ LSB (Kester, Data Conversion Handbook, ch. 2) and
// resolution gain from averaging (Silicon Labs AN118). Volts throughout.

/**
 * Converter basics.
 * @param {{bits:number, vref:number, bipolar?:boolean}} p bipolar: input ±Vref (FSR = 2·Vref)
 */
export function adcBasics({ bits, vref, bipolar = false }) {
  const codes = 2 ** bits;
  const fsr = bipolar ? 2 * vref : vref;
  const lsb = fsr / codes;
  return {
    codes,
    fsr,
    lsb,
    qNoise: lsb / Math.sqrt(12),
    snr: 6.02 * bits + 1.76,
    codeMin: bipolar ? -codes / 2 : 0,
    codeMax: bipolar ? codes / 2 - 1 : codes - 1,
  };
}

/** ENOB from a measured SINAD (MT-003): (SINAD − 1.76 dB) / 6.02 dB. */
export const enobFromSinad = (sinad) => (sinad - 1.76) / 6.02;

/**
 * Averaging M samples of white noise: SNR + 10·log10(M), N + ½·log2(M) bits
 * (4^w samples for w extra bits; needs ≥ ~1 LSB of noise or dither).
 */
export const averaging = (m) => ({ snrGain: 10 * Math.log10(m), extraBits: 0.5 * Math.log2(m) });

/**
 * Output code of an ideal ADC: transitions at (k − ½)·LSB, so code = round(Vin / LSB),
 * clamped to the code range. err = Vin − code·LSB (within ±½ LSB unless clipped).
 * @param {number} vin input voltage
 * @param {{bits:number, vref:number, bipolar?:boolean}} p
 */
export function adcCode(vin, p) {
  const { lsb, codeMin, codeMax } = adcBasics(p);
  const raw = Math.round(vin / lsb);
  const code = Math.min(codeMax, Math.max(codeMin, raw)) || 0; // no −0
  return { code, clipped: raw !== code, err: vin - code * lsb, lsb, raw }; // raw: before clamping to the code range
}
