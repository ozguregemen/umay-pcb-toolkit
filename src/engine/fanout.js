// Routing channels between pads (BGA / fine-pitch connectors).
//
// Straight channel between two adjacent pads: gap = pitch − pad.
//   n traces fit when n·w + (n+1)·s ≤ gap  →  n = floor((gap − s) / (w + s))
//   widest single trace: gap − 2s
// Diagonal channel (between four BGA balls): gap = pitch·√2 − pad.
// Dog-bone via at the centre of four balls: max via pad = pitch·√2 − pad − 2s.

export function fanout({ pitchMm, padMm, traceMm, spaceMm, viaPadMm }) {
  const errors = [];
  if (!(pitchMm > 0)) errors.push('pitch');
  if (!(padMm > 0)) errors.push('pad');
  if (!(traceMm > 0)) errors.push('trace');
  if (!(spaceMm > 0)) errors.push('space');
  if (!errors.length && padMm >= pitchMm) errors.push('padPitch');
  if (errors.length) return { ok: false, errors };

  const fit = (gap) => Math.max(0, Math.floor((gap - spaceMm) / (traceMm + spaceMm) + 1e-9));
  const gap = pitchMm - padMm;
  const diagGap = pitchMm * Math.SQRT2 - padMm;
  const res = {
    ok: true,
    gap,
    diagGap,
    traces: fit(gap),
    diagTraces: fit(diagGap),
    maxTrace: gap - 2 * spaceMm,
    diagMaxTrace: diagGap - 2 * spaceMm,
    maxViaPad: diagGap - 2 * spaceMm,
    warnings: [],
  };
  if (viaPadMm > 0) res.viaFits = viaPadMm <= res.maxViaPad + 1e-9;
  if (res.traces === 0) res.warnings.push('noTrace');
  return res;
}
