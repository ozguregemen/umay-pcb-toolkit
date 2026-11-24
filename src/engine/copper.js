// Copper material properties.

/** Resistivity of annealed copper at 20 °C (Ω·m). */
export const RHO_20 = 1.724e-8;
/** Temperature coefficient of resistance (1/°C). */
export const ALPHA = 0.00393;
/** Thermal conductivity of plated copper (W/m·K). */
export const K_THERMAL = 380;

/** ρ(T) = ρ20 · [1 + α (T − 20 °C)] */
export function copperResistivity(tempC = 20) {
  return RHO_20 * (1 + ALPHA * (tempC - 20));
}
