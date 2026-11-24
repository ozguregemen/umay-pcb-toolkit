import { fanout } from '../engine/fanout.js';
import { toMm, fromMm } from '../engine/units.js';
import { heroes, rows, block, formulaBlock, messages, invalid, checks } from '../ui/calculator.js';
import { fixed, esc } from '../ui/format.js';
import { t } from '../i18n.js';
import { isImperial } from '../prefs.js';
import { svg, rect, circle, text, dimH, dimV, arrow, bar } from '../ui/svg.js';
import { fabCheck } from '../ui/fabcheck.js';

const strings = {
  tr: {
    fo_pitch: 'Pad adımı (pitch)',
    fo_pad: 'Pad çapı / genişliği',
    fo_padInfo: 'BGA için genellikle bilye çapının %75–80’i kadar pad kullanılır (NSMD). Veri sayfasındaki önerilen pad boyutuna bakın.',
    fo_trace: 'İz genişliği',
    fo_space: 'İz–iz ve iz–pad aralığı',
    fo_via: 'Via pad çapı (dog-bone)',
    fo_traces: 'Padler arasından geçen iz',
    fo_diag: 'Çaprazdan geçen iz',
    fo_gap: 'Padler arası boşluk',
    fo_diagGap: 'Çapraz boşluk (4 bilye arası)',
    fo_maxTrace: 'Tek iz için en geniş genişlik',
    fo_diagMax: 'Çaprazda tek iz için en geniş',
    fo_maxVia: 'Dört bilye arasına sığan en büyük via padi',
    fo_checks: 'Kontroller',
    fo_viaOk: 'Via padi dört bilye arasına sığıyor',
    fo_note: 'n iz, n·w + (n+1)·s ≤ boşluk koşuluyla sığar. Çapraz kanal dört bilyenin ortasından geçer ve adımın √2 katıdır; dog-bone fanout’ta via buraya yerleşir. Daha fazla iz gerekiyorsa daha ince iz/aralık (üretici kabiliyeti), pad içi via veya ek katman gerekir.',
    err_pitch: 'Adım sıfırdan büyük olmalı.',
    err_pad: 'Pad sıfırdan büyük olmalı.',
    err_trace: 'İz genişliği sıfırdan büyük olmalı.',
    err_space: 'Aralık sıfırdan büyük olmalı.',
    err_padPitch: 'Pad, adımdan küçük olmalı.',
    warn_noTrace: 'Bu kurallarla padler arasından iz geçmiyor; çapraz kanalı, pad içi viayı veya daha ince kuralları değerlendirin.',
    fo_dgAria: 'BGA pad dizisinin ölçekli üstten görünüşü: adım p, iki sıra arasından geçen izler, padler arası boşluk g, çapraz boşluk ve dört bilyenin ortasındaki dog-bone via ile aralık halkası',
    fo_dgScale: 'ölçekli · üstten görünüş',
    fo_dgPitch: 'adım',
    fo_dgPad: 'pad',
    fo_dgGap: 'boşluk p − d',
    fo_dgTrace: 'iz genişliği',
    fo_dgSpace: 'aralık',
    fo_dgFit: 'iz sığar',
    fo_dgDiag: 'çapraz',
    fo_dgDiagGap: 'çapraz boşluk',
    fo_dgDiagFit: 'çaprazda iz',
    fo_dgFits: 'via sığar',
    fo_dgNoFit: 'via sığmaz',
    fo_dgViaMax: 'en büyük via',
  },
  en: {
    fo_pitch: 'Pad pitch',
    fo_pad: 'Pad diameter / width',
    fo_padInfo: 'For BGAs the pad is usually 75–80 % of the ball diameter (NSMD). Check the recommended land size in the datasheet.',
    fo_trace: 'Trace width',
    fo_space: 'Trace–trace and trace–pad spacing',
    fo_via: 'Via pad diameter (dog-bone)',
    fo_traces: 'Traces between pads',
    fo_diag: 'Traces on the diagonal',
    fo_gap: 'Gap between pads',
    fo_diagGap: 'Diagonal gap (between 4 balls)',
    fo_maxTrace: 'Widest single trace',
    fo_diagMax: 'Widest single trace on the diagonal',
    fo_maxVia: 'Largest via pad between four balls',
    fo_checks: 'Checks',
    fo_viaOk: 'Via pad fits between four balls',
    fo_note: 'n traces fit when n·w + (n+1)·s ≤ gap. The diagonal channel runs through the centre of four balls and is √2 times the pitch; in dog-bone fanout the via sits there. If you need more traces, use finer trace/space (fabricator capability), via-in-pad or another layer.',
    err_pitch: 'Pitch must be greater than zero.',
    err_pad: 'Pad must be greater than zero.',
    err_trace: 'Trace width must be greater than zero.',
    err_space: 'Spacing must be greater than zero.',
    err_padPitch: 'The pad must be smaller than the pitch.',
    warn_noTrace: 'No trace fits between pads with these rules; consider the diagonal channel, via-in-pad or finer rules.',
    fo_dgAria: 'BGA pad array top view to scale: pitch p, the traces passing between two rows, pad gap g, the diagonal gap and the dog-bone via in the centre of four balls with its clearance halo',
    fo_dgScale: 'to scale · top view',
    fo_dgPitch: 'pitch',
    fo_dgPad: 'pad',
    fo_dgGap: 'gap p − d',
    fo_dgTrace: 'trace width',
    fo_dgSpace: 'spacing',
    fo_dgFit: 'traces fit',
    fo_dgDiag: 'diagonal',
    fo_dgDiagGap: 'diagonal gap',
    fo_dgDiagFit: 'diag. traces',
    fo_dgFits: 'via fits',
    fo_dgNoFit: 'via too big',
    fo_dgViaMax: 'largest via',
  },
};

const LEN = ['mm', 'mil'];
const L = (mm) => (isImperial() ? `${fixed(fromMm(mm, 'mil'), 2)} mil` : `${fixed(mm, 3)} mm`);
const r1 = (x) => Math.round(x * 10) / 10;


/**
 * Live top view of a 3 × 3 corner of the BGA, to scale: pitch, the traces
 * that fit between two rows, the diagonal gap, and a dog-bone via in the
 * centre of four balls with its clearance halo (red when it does not fit).
 */
function diagram(v, u, r) {
  const mmOf = (k) => (Number.isFinite(v[k]) && v[k] > 0 ? toMm(v[k], u[k]) : NaN);
  const live = Number.isFinite;
  let p = mmOf('p'); let d = mmOf('d'); let w = mmOf('w'); let sp = mmOf('s');
  if (!r) {
    if (!live(p)) p = 0.8;
    if (!live(d) || d >= p) d = p * 0.5;
    if (!live(w)) w = p / 8;
    if (!live(sp)) sp = p / 8;
  }
  const via = mmOf('v');
  const gap = p - d;
  const n = r ? r.traces : Math.max(0, Math.floor((gap - sp) / (w + sp) + 1e-9));
  const maxVia = r ? r.maxViaPad : p * Math.SQRT2 - d - 2 * sp;
  const fits = live(via) ? via <= maxVia + 1e-9 : null;

  const X0 = 40; const Y0 = 34; const EXT = 172;
  const s = EXT / (2 * p + d);
  const P = p * s;
  const D = Math.max(d * s, 3);
  const cs = [0, 1, 2].map((i) => i * P + D / 2);
  const X = cs.map((c) => X0 + c);
  const Y = cs.map((c) => Y0 + c);
  const wpx = Math.max(w * s, 1.2);
  const spx = sp * s;
  let b = '';

  // Traces escaping between row 0 and row 1.
  const yA = Y[0] + D / 2;
  const yB = Y[1] - D / 2;
  const xS = X0 - 26;
  const nd = Math.min(n, 12);
  if (nd > 0) {
    const tot = nd * wpx + (nd - 1) * spx;
    let y = (yA + yB) / 2 - tot / 2;
    for (let i = 0; i < nd; i++) { b += rect(xS, y, X[2] - xS, wpx, 'cu'); y += wpx + spx; }
  }

  // Pads.
  for (const y of Y) for (const x of X) b += circle(x, y, D / 2, 'cu');
  // No trace fits: show one trace with its spacing, overlapping the pads.
  if (nd === 0) {
    b += rect(xS, (yA + yB) / 2 - wpx / 2 - spx, X[2] - xS, wpx + 2 * spx, 'zone-bad faded')
      + rect(xS, (yA + yB) / 2 - wpx / 2, X[2] - xS, wpx, 'cu');
  }

  // Dog-bone via in the centre of four balls.
  const vx = X[1] + P / 2;
  const vy = Y[1] + P / 2;
  if (live(via)) {
    const rv = (via / 2) * s;
    b += circle(vx, vy, rv + spx, fits ? 'zone-ok faded' : 'zone-bad faded')
      + bar(X[1], Y[1], vx, vy, wpx, 'cu') + circle(vx, vy, rv, 'cu') + circle(vx, vy, Math.max(rv * 0.45, 1), 'hole')
      + (fits ? '' : circle(vx, vy, rv, 'wire bad'));
  } else if (maxVia > 0) b += circle(vx, vy, (maxVia / 2) * s, 'dim');

  // Diagonal gap between two diagonal neighbours.
  const k = D / 2 / Math.SQRT2;
  b += arrow(X[0] + k, Y[1] + k, X[1] - k, Y[2] - k, { both: true });
  const free = P / Math.SQRT2 - D / 2;
  if (free > 26) b += text(X[0] + P / 2 - 8, Y[1] + P / 2 + 14, t('fo_dgDiag'), { cls: 'lbl', anchor: 'end' });

  // Pitch above, gap on the right.
  b += dimH(X[0], X[1], Y0 - 9, r || live(mmOf('p')) ? `p = ${L(p)}` : 'p', { cls: 'val', extFrom: Y[0] });
  b += dimV(yA, yB, X[2] + D / 2 + 10, 'g', { extFrom: X[2] });

  // Legend.
  const x0 = 258;
  let y = 32;
  const row = (sw, value, desc, vcls = 'val') => {
    const out = sw(y) + text(x0 + 24, y, value, { cls: vcls, anchor: 'start' }) + text(x0 + 92, y, desc, { cls: 'lbl', anchor: 'start' });
    y += 15.5;
    return out;
  };
  const sym = (ch) => (yy) => text(x0 + 7, yy, ch, { cls: 'sym' });
  const vl = (mm) => (r ? L(mm) : '—');
  b += row(sym('p'), vl(p), t('fo_dgPitch'))
    + row(sym('d'), vl(d), t('fo_dgPad'))
    + row(sym('g'), vl(gap), t('fo_dgGap'))
    + row(sym('w'), vl(w), t('fo_dgTrace'))
    + row(sym('s'), vl(sp), t('fo_dgSpace'))
    + row(sym('n'), r ? `${n}` : '—', t('fo_dgFit'), r ? (n > 0 ? 'okt' : 'badt') : 'val')
    + row((yy) => arrow(x0, yy - 1, x0 + 13, yy - 9, { both: true }), vl(r ? r.diagGap : 0), t('fo_dgDiagGap'))
    + row(sym('n'), r ? `${r.diagTraces}` : '—', t('fo_dgDiagFit'), r ? (r.diagTraces > 0 ? 'okt' : 'badt') : 'val');
  if (live(via)) {
    b += row((yy) => circle(x0 + 6.5, yy - 4, 5.5, fits ? 'zone-ok' : 'zone-bad') + circle(x0 + 6.5, yy - 4, 3.2, 'cu'),
      vl(via), t(fits ? 'fo_dgFits' : 'fo_dgNoFit'), r ? (fits ? 'okt' : 'badt') : 'val');
  }
  b += row((yy) => circle(x0 + 6.5, yy - 4, 5, 'dim'), r && maxVia > 0 ? L(maxVia) : '—', t('fo_dgViaMax'));
  b += text(8, 224, t('fo_dgScale'), { cls: 'title', anchor: 'start' });
  return svg(440, 230, b, t('fo_dgAria'), { wide: true });
}

export default {
  diagram,
  id: 'fanout',
  strings,
  sections: [
    {
      title: 'sectionInputs',
      fields: [
        { key: 'p', type: 'number', label: 'fo_pitch', default: 0.8, units: LEN, pref: 'length',
          presets: [0.4, 0.5, 0.65, 0.8, 1.0, 1.27].map((x) => ({ label: `${x} mm`, value: x, unit: 'mm' })) },
        { key: 'd', type: 'number', label: 'fo_pad', default: 0.4, units: LEN, pref: 'length', info: 'fo_padInfo' },
        { key: 'w', type: 'number', label: 'fo_trace', default: 0.1, units: LEN, pref: 'length' },
        { key: 's', type: 'number', label: 'fo_space', default: 0.1, units: LEN, pref: 'length' },
        { key: 'v', type: 'number', label: 'fo_via', default: 0.45, units: LEN, pref: 'length', optional: true },
      ],
    },
  ],

  compute(v, u) {
    const mm = (k) => (Number.isFinite(v[k]) ? toMm(v[k], u[k]) : NaN);
    return fanout({ pitchMm: mm('p'), padMm: mm('d'), traceMm: mm('w'), spaceMm: mm('s'), viaPadMm: mm('v') });
  },

  render(r, v, u) {
    if (!r.ok) return invalid(r.errors);
    const mm = (k) => (Number.isFinite(v[k]) ? toMm(v[k], u[k]) : undefined);
    return heroes([
      ['fo_traces', `${r.traces}`],
      ['fo_diag', `${r.diagTraces}`],
    ])
      + messages('warn', r.warnings)
      + block('results', rows([
        ['fo_gap', L(r.gap)],
        ['fo_maxTrace', r.maxTrace > 0 ? L(r.maxTrace) : '—'],
        ['fo_diagGap', L(r.diagGap)],
        ['fo_diagMax', r.diagMaxTrace > 0 ? L(r.diagMaxTrace) : '—'],
        ['fo_maxVia', r.maxViaPad > 0 ? L(r.maxViaPad) : '—'],
      ]))
      + (r.viaFits !== undefined ? block('fo_checks', checks([[r.viaFits, esc(t('fo_viaOk'))]])) : '')
      // Fab check: escape traces on an outer 1 oz layer and the dog-bone via pad.
      + fabCheck({ traceMm: mm('w'), spaceMm: mm('s'), oz: 1, viaPadMm: mm('v') }, { note: t('fab_n1oz') })
      + formulaBlock([
        'gap = pitch − pad,   diagonal gap = pitch·√2 − pad',
        'n = floor((gap − s) / (w + s))',
        'w_max = gap − 2s,   via pad_max = pitch·√2 − pad − 2s',
      ], 'fo_note', ['IPC-7351 (BGA land patterns)']);
  },
};
