// Matched resistive attenuators (equal source/load impedance Z0).
//   K = 10^(A/20)
//   Pi:  shunt  R1 = Z0·(K+1)/(K−1),  series R2 = Z0·(K²−1)/(2K)
//   T:   series R1 = Z0·(K−1)/(K+1),  shunt  R2 = Z0·2K/(K²−1)
//   Bridged-T: R1 (bridge) = Z0·(K−1), R2 (shunt) = Z0/(K−1), two series arms = Z0

const par = (a, b) => (a * b) / (a + b);

// K (the voltage ratio) is returned with the resistors, for showing the calculation step by step.
export function attenuatorValues(topology, dB, z0) {
  const K = 10 ** (dB / 20);
  if (topology === 'pi') return { r1: (z0 * (K + 1)) / (K - 1), r2: (z0 * (K * K - 1)) / (2 * K), K };
  if (topology === 't') return { r1: (z0 * (K - 1)) / (K + 1), r2: (z0 * 2 * K) / (K * K - 1), K };
  return { r1: z0 * (K - 1), r2: z0 / (K - 1), r3: z0, K }; // bridged-T
}

/**
 * Analyse a network driven by a Z0 source into a Z0 load.
 * Returns input impedance, insertion loss (dB), return loss (dB) and the
 * power dissipated in each resistor for 1 W available input power.
 */
export function analyseAttenuator(topology, { r1, r2, r3 }, z0) {
  const vs = 2; // source EMF; a direct Z0–Z0 connection would give 1 V at the load
  let zin;
  let vLoad;
  let diss;
  // Intermediate values, for showing the calculation step by step: the parallel
  // branch R_p (Pi, T) or the source EMF and the node voltages (bridged-T).
  let detail;
  if (topology === 'pi') {
    const rest = par(r1, z0);
    zin = par(r1, r2 + rest);
    const v1 = (vs * zin) / (zin + z0);
    vLoad = (v1 * rest) / (r2 + rest);
    diss = { r1in: v1 * v1 / r1, r2: (v1 - vLoad) ** 2 / r2, r1out: vLoad * vLoad / r1 };
    detail = { rp: rest };
  } else if (topology === 't') {
    const shunt = par(r2, r1 + z0);
    zin = r1 + shunt;
    const i1 = vs / (zin + z0);
    const vMid = i1 * shunt;
    const i2 = vMid / (r1 + z0);
    vLoad = i2 * z0;
    diss = { r1in: i1 * i1 * r1, r2: vMid * vMid / r2, r1out: i2 * i2 * r1 };
    detail = { rp: shunt };
  } else {
    // Bridged-T: nodes in (a), out (b), centre (c). Series arms r3 between a–c and c–b,
    // bridge r1 between a–b, shunt r2 from c to ground. Solve with nodal analysis.
    const g = (r) => 1 / r;
    const G0 = g(z0);
    // Unknowns Va, Vb, Vc; source Thevenin vs/z0 into node a.
    const A = [
      [G0 + g(r3) + g(r1), -g(r1), -g(r3)],
      [-g(r1), g(r1) + g(r3) + G0, -g(r3)],
      [-g(r3), -g(r3), 2 * g(r3) + g(r2)],
    ];
    const b = [vs * G0, 0, 0];
    const [va, vb, vc] = solve3(A, b);
    const iin = (vs - va) / z0;
    zin = va / iin;
    vLoad = vb;
    diss = { r1: (va - vb) ** 2 / r1, r2: vc * vc / r2, r3a: (va - vc) ** 2 / r3, r3b: (vc - vb) ** 2 / r3 };
    detail = { vs, va, vb };
  }
  const gamma = (zin - z0) / (zin + z0);
  // Available source power with vs = 2 V into z0: (vs/2)²/z0 → scale dissipation to 1 W.
  const pAvail = 1 / z0;
  const scale = 1 / pAvail;
  for (const k of Object.keys(diss)) diss[k] *= scale;
  return {
    zin,
    insertionLossDb: -20 * Math.log10(vLoad),
    returnLossDb: Math.abs(gamma) < 1e-12 ? Infinity : -20 * Math.log10(Math.abs(gamma)),
    dissipationPerWatt: diss,
    detail,
  };
}

function solve3(A, b) {
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[3] / row[i]);
}
