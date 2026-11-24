import { calculateFusing, onderdonkCurrent } from '../engine/fusing.js';
import { toMm, thicknessToMil, MM_PER_MIL, tempToC, currentToA } from '../engine/units.js';
import { heroes, rows, block, formulaBlock, messages, invalid } from '../ui/calculator.js';
import { fmt, si, siHtml } from '../ui/format.js';
import { t } from '../i18n.js';
import { isImperial } from '../prefs.js';
import { svg, rect, circle, path, polygon, text, dimH, dimV, callout, axes, wave } from '../ui/svg.js';

const strings = {
  tr: {
    fu_kind: 'İletken',
    fu_trace: 'İz',
    fu_via: 'Via',
    fu_mode: 'Hesap yönü',
    fu_modeCurrent: 'Süre → eritme akımı',
    fu_modeTime: 'Akım → eritme süresi',
    fu_w: 'İz genişliği',
    fu_t: 'Bakır kalınlığı',
    fu_drill: 'Delik çapı',
    fu_plating: 'Kaplama kalınlığı',
    fu_dur: 'Arıza süresi',
    fu_durInfo: 'Kısa devre akımının sigorta, eFuse veya koruma devresi açılana kadar akacağı süre.',
    fu_I: 'Arıza akımı',
    fu_onderdonk: 'Eritme akımı (Onderdonk)',
    fu_time: 'Eritme süresi (Onderdonk)',
    fu_preece: 'Sürekli eritme akımı (Preece)',
    fu_area: 'Kesit alanı',
    fu_diam: 'Eşdeğer tel çapı',
    fu_i2t: 'Erime I²t',
    fu_i2tInfo: 'Koruma elemanının açma I²t değeri bundan belirgin biçimde küçük olmalıdır.',
    fu_note: 'Onderdonk adyabatiktir (iletken ısıyı karta aktaramayacak kadar kısa sürede ısınır) ve yaklaşık 10 s’ye kadar geçerlidir. Preece, serbest havadaki yuvarlak tel için sürekli durum değeridir; kart üzerindeki iz daha iyi soğur. Bu değerler bakırın erimesine karşılık gelir: kart çok daha düşük sıcaklıkta (Tg, delaminasyon) hasar görür, dolayısıyla koruma seçiminde geniş pay bırakın.',
    err_area: 'Kesit alanı sıfırdan büyük olmalı.',
    warn_onderdonkLong: 'Onderdonk denklemi ~10 s’den uzun sürelerde ısı kaybını ihmal ettiği için gerçekçi değildir.',
    fu_dgAria: 'Solda akımın geçtiği iletken kesiti ve alanı A; sağda log–log eksenlerde Onderdonk erime eğrisi (akım–süre), çizginin üstünde bakır erir; sizin çalışma noktanız işaretli',
    fu_dgSection: 'iletken kesiti',
    fu_dgBarrel: 'via gövdesi (üstten)',
    fu_dgScale: 'orantılı',
    fu_dgExag: 'kalınlık büyütülmüş',
    fu_dgCurve: 'erime eğrisi · log–log',
    fu_dgMelt: 'bakır erir',
    fu_dgTime: 'süre',
    fu_dgPreece: 'Preece (sürekli)',
  },
  en: {
    fu_kind: 'Conductor',
    fu_trace: 'Trace',
    fu_via: 'Via',
    fu_mode: 'Solve for',
    fu_modeCurrent: 'Duration → fusing current',
    fu_modeTime: 'Current → fusing time',
    fu_w: 'Trace width',
    fu_t: 'Copper thickness',
    fu_drill: 'Drill diameter',
    fu_plating: 'Plating thickness',
    fu_dur: 'Fault duration',
    fu_durInfo: 'How long the short-circuit current flows before the fuse, eFuse or protection circuit opens.',
    fu_I: 'Fault current',
    fu_onderdonk: 'Fusing current (Onderdonk)',
    fu_time: 'Time to fuse (Onderdonk)',
    fu_preece: 'Steady-state fusing current (Preece)',
    fu_area: 'Cross-section area',
    fu_diam: 'Equivalent wire diameter',
    fu_i2t: 'Melting I²t',
    fu_i2tInfo: 'The protection device’s clearing I²t should be well below this.',
    fu_note: 'Onderdonk is adiabatic (the conductor heats too fast to lose heat to the board) and is valid up to about 10 s. Preece is a steady-state value for a round wire in free air; a trace on a board cools better. These values correspond to the copper melting: the board is damaged at far lower temperatures (Tg, delamination), so leave a wide margin when choosing protection.',
    err_area: 'Cross-section area must be greater than zero.',
    warn_onderdonkLong: 'The Onderdonk equation ignores heat loss, so it is unrealistic beyond ~10 s.',
    fu_dgAria: 'Left: the conductor cross-section the current flows through and its area A. Right: the Onderdonk fusing curve (current vs time) on log–log axes; above the line the copper melts; your operating point is marked',
    fu_dgSection: 'conductor cross-section',
    fu_dgBarrel: 'via barrel (top view)',
    fu_dgScale: 'proportional',
    fu_dgExag: 'thickness exaggerated',
    fu_dgCurve: 'fusing curve · log–log',
    fu_dgMelt: 'copper melts',
    fu_dgTime: 'time',
    fu_dgPreece: 'Preece (steady)',
  },
};

const isVia = (v) => v.k === 'via';
const tMul = { ms: 1e-3, s: 1, us: 1e-6 };
const r1 = (x) => Math.round(x * 10) / 10;
const lenTxt = (mm) => (isImperial() ? `${fmt(mm / MM_PER_MIL, 3)} mil` : `${fmt(mm, 3)} mm`);
const thkTxt = (mm) => (isImperial() ? `${fmt(mm / MM_PER_MIL, 3)} mil` : `${fmt(mm * 1000, 3)} µm`);

/**
 * Left: the conductor cross-section the current flows through (trace W × t,
 * or the via barrel ring), proportional. Right: the Onderdonk fusing curve
 * (I ∝ 1/√t, a straight line on log–log axes) with the user's point; above
 * the line the copper melts. Dashed beyond 10 s where the equation fails.
 */
function diagram(v, u, r) {
  const via = isVia(v);
  const num = (k) => (Number.isFinite(v[k]) && v[k] > 0 ? toMm(v[k], u[k]) : NaN);
  const flow = (val, sym, txt) => (Number.isFinite(val) ? `${sym} = ${txt}` : sym);
  let b = '';
  const SX = 72; const SY = 86;
  b += text(SX, 20, t('fu_dgSection'), { cls: 'title' });
  let exag = false;
  if (via) {
    const dIn = num('d'); const tIn = num('p');
    const dMm = Number.isFinite(dIn) ? dIn : 0.3;
    const tMm = Number.isFinite(tIn) ? tIn : 0.025;
    const Ro = 46;
    let ri = (Ro * (dMm / 2)) / (dMm / 2 + tMm);
    if (Ro - ri < 3) { ri = Ro - 3; exag = true; }
    b += circle(SX, SY, Ro, 'cu') + circle(SX, SY, ri, 'hole');
    b += dimH(SX - ri, SX + ri, SY, flow(dIn, 'd', lenTxt(dMm)), { cls: Number.isFinite(dIn) ? 'val' : 'sym' });
    const a = -Math.PI / 4;
    const rm = (Ro + ri) / 2;
    b += callout(SX + rm * Math.cos(a), SY + rm * Math.sin(a), SX + Ro + 8, SY - Ro + 2, flow(tIn, 't', thkTxt(tMm)),
      { cls: Number.isFinite(tIn) ? 'val' : 'sym', anchor: 'start' });
    b += text(SX, SY + Ro + 15, t('fu_dgBarrel'), { cls: 'lbl' });
  } else {
    const wIn = num('w');
    const tIn = Number.isFinite(v.t) && v.t > 0 ? thicknessToMil(v.t, u.t) * MM_PER_MIL : NaN;
    const wMm = Number.isFinite(wIn) ? wIn : 0.25;
    const tMm = Number.isFinite(tIn) ? tIn : 0.035;
    const sc = Math.min(104 / wMm, 56 / tMm);
    const wpx = wMm * sc;
    let tpx = tMm * sc;
    if (tpx < 4) { tpx = 4; exag = true; }
    const top = SY - tpx / 2;
    b += rect(SX - 60, SY + tpx / 2, 120, 16, 'diel') + rect(SX - wpx / 2, top, wpx, tpx, 'cu');
    b += dimH(SX - wpx / 2, SX + wpx / 2, top - 10, flow(wIn, 'W', lenTxt(wMm)), { cls: Number.isFinite(wIn) ? 'val' : 'sym', extFrom: top });
    b += dimV(top, SY + tpx / 2, SX + Math.max(wpx / 2, 60) + 6, flow(tIn, 't', thkTxt(tMm)),
      { cls: Number.isFinite(tIn) ? 'val' : 'sym', extFrom: SX + wpx / 2 });
  }
  if (r) {
    b += text(SX, 172, `A = ${fmt(r.areaMm2, 3)} mm²`, { cls: 'val' })
      + text(SX, 186, `= ${fmt(r.areaCmil, 3)} cmil`, { cls: 'lbl' });
  } else b += text(SX, 172, 'A', { cls: 'sym' });
  b += text(SX, 204, t(exag ? 'fu_dgExag' : 'fu_dgScale'), { cls: 'title' });

  // Onderdonk curve on log–log axes, centred on the user's point.
  const X0 = 262; const Y0 = 170; const PW = 164; const PH = 134;
  b += text(X0 + PW / 2, 20, t('fu_dgCurve'), { cls: 'title' });
  const tp = r ? (v.m === 'time' ? r.timeS : v.dur * tMul[u.dur]) : NaN;
  const Ip = r ? (v.m === 'time' ? currentToA(v.I, u.I) : r.onderdonkA) : NaN;
  if (!(tp > 0 && Ip > 0)) {
    b += axes(X0, Y0, PW, PH) + path(`M${X0 + 10},${Y0 - PH + 14}L${X0 + PW - 10},${Y0 - 20}`, 'wave');
    b += text(X0 + PW / 2, Y0 + 16, t('fu_dgTime'), { cls: 'lbl' }) + text(X0 - 6, Y0 - PH + 8, 'I', { cls: 'sym', anchor: 'end' });
    return svg(440, 210, b, t('fu_dgAria'), { wide: true });
  }
  const Ta = tempToC(v.ta, u.ta);
  const Iat = (tt) => onderdonkCurrent(r.areaMm2, tt, Ta);
  const lx0 = Math.floor(Math.log10(tp)) - 3;
  const lx1 = lx0 + 6;
  let ly0 = Math.floor(Math.log10(Iat(10 ** lx1)));
  const ly1 = Math.ceil(Math.log10(Iat(10 ** lx0)) + 1e-9);
  const lp = Math.log10(r.preeceA);
  if (lp < ly0 && lp >= ly0 - 1) ly0 -= 1;
  const X = (tt) => X0 + ((Math.log10(tt) - lx0) / (lx1 - lx0)) * PW;
  const Y = (ii) => Y0 - ((Math.log10(ii) - ly0) / (ly1 - ly0)) * PH;
  // Grid and decade labels.
  let grid = '';
  for (let k = lx0; k <= lx1; k++) grid += `M${r1(X(10 ** k))},${Y0}V${Y0 - PH}`;
  for (let k = ly0; k <= ly1; k++) grid += `M${X0},${r1(Y(10 ** k))}H${X0 + PW}`;
  b += path(grid, 'grid-l');
  for (let k = lx0 + 1; k < lx1; k += 2) b += text(X(10 ** k), Y0 + 13, si(10 ** k, 's', 1), { cls: 'lbl' });
  for (let k = ly0; k <= ly1; k++) b += text(X0 - 4, Y(10 ** k) + 4, si(10 ** k, 'A', 1), { cls: 'lbl', anchor: 'end' });
  // Melt region above the line, the line itself (dashed beyond 10 s), Preece.
  const xa = X(10 ** lx0); const xb = X(10 ** lx1);
  const ya = Y(Iat(10 ** lx0)); const yb = Y(Iat(10 ** lx1));
  b += polygon([[xa, ya], [xb, yb], [xb, Y0 - PH], [xa, Y0 - PH]], 'zone-bad');
  if (lx1 > 1) {
    const x10 = Math.max(lx0, 1);
    b += wave([[xa, ya], [X(10 ** x10), Y(Iat(10 ** x10))]]) + wave([[X(10 ** x10), Y(Iat(10 ** x10))], [xb, yb]], 'wave2');
  } else b += wave([[xa, ya], [xb, yb]]);
  const top = Y0 - PH;
  const yP = Y(r.preeceA);
  const hasP = yP >= top && yP <= Y0;
  if (hasP) b += path(`M${X0},${r1(yP)}H${X0 + PW}`, 'dim');
  b += axes(X0, Y0, PW, PH);
  const xp = X(tp); const yp = Y(Ip);
  b += path(`M${r1(xp)},${Y0}V${r1(yp)}H${X0}`, 'ext') + circle(xp, yp, 4, 'term') + circle(xp, yp, 1.6, 'node');

  // Labels go where they cross neither the line, the Preece line nor each other.
  const curveY = (x) => ya + ((x - xa) * (yb - ya)) / (xb - xa);
  const hit = (a, c) => !(a[1] < c[0] || a[0] > c[1] || a[3] < c[2] || a[2] > c[3]);
  const crosses = ([x1, x2, y1, y2]) => {
    const c1 = curveY(x1); const c2 = curveY(x2);
    return Math.max(c1, c2) >= y1 - 2 && Math.min(c1, c2) <= y2 + 2;
  };
  const inPlot = ([x1, x2, y1, y2]) => x1 > X0 && x2 < X0 + PW && y1 > top && y2 < Y0;
  const band = hasP ? [X0, X0 + PW, yP - 2, yP + 2] : [0, 0, -9, -9];
  const none = { box: [0, 0, -99, -99] };
  // Candidates: the point's two-line label (current, time); Preece next to its
  // line (short name if the long one does not fit); "copper melts" in the red area.
  const l1 = si(Ip, 'A', 3); const l2 = si(tp, 's', 3);
  const wP = Math.max(l1.length, l2.length) * 6.8;
  const pts = [[7, -20], [-7, 16], [7, -36], [-7, 32]].map(([dx, dy]) => {
    const x = xp + dx; const y = yp + dy;
    return { x, y, a: dx > 0 ? 'start' : 'end', box: dx > 0 ? [x, x + wP, y - 11, y + 18] : [x - wP, x, y - 11, y + 18] };
  }).filter((c) => inPlot(c.box) && !crosses(c.box) && !hit(c.box, band));
  const qs = !hasP ? [] : [t('fu_dgPreece'), 'Preece'].flatMap((label) => {
    const wq = label.length * 6;
    return [X0 + 4, X0 + PW - 4 - wq, X0 + (PW - wq) / 2]
      .flatMap((x) => [yP - 4, yP + 12].map((y) => ({ label, x, y, box: [x, x + wq, y - 10, y + 2] })));
  }).filter((c) => inPlot(c.box) && !crosses(c.box));
  const melt = t('fu_dgMelt');
  const wm = melt.length * 6;
  const ms = [X0 + PW - 4, X0 + (PW + wm) / 2, X0 + 6 + wm]
    .flatMap((xe) => Array.from({ length: 8 }, (_, i) => top + 13 + i * 14).map((y) => ({ x: xe, y, box: [xe - wm, xe, y - 10, y + 2] })))
    .filter((c) => curveY(c.box[0]) > c.box[3] + 4 && !hit(c.box, band));
  // First arrangement in which no two labels touch.
  let pick = null;
  for (const P of pts.length ? pts : [{ x: xp + 7, y: yp - 20, a: 'start', box: none.box }]) {
    const Q = hasP ? qs.find((c) => !hit(c.box, P.box)) : none;
    const M = ms.find((c) => !hit(c.box, P.box) && !hit(c.box, (Q ?? none).box));
    pick = pick ?? { P, Q: Q ?? qs[0], M: M ?? ms[0] };
    if (Q && M) { pick = { P, Q, M }; break; }
  }
  const { P, Q, M } = pick;
  b += text(P.x, P.y, l1, { cls: 'val', anchor: P.a }) + text(P.x, P.y + 15, l2, { cls: 'val', anchor: P.a });
  if (hasP) {
    const q = Q ?? { label: 'Preece', x: X0 + 4, y: yP < top + 14 ? yP + 12 : yP - 4 };
    b += text(q.x, q.y, q.label, { cls: 'lbl', anchor: 'start' });
  }
  const m = M ?? { x: X0 + PW - 4, y: top + 13 };
  b += text(m.x, m.y, melt, { cls: 'badt', anchor: 'end' });
  b += text(X0 + PW / 2, Y0 + 27, t('fu_dgTime'), { cls: 'lbl' });
  return svg(440, 210, b, t('fu_dgAria'), { wide: true });
}

export default {
  diagram,
  id: 'fusing',
  strings,
  sections: [
    {
      title: 'sectionSetup',
      fields: [
        { key: 'k', type: 'choice', label: 'fu_kind', default: 'trace',
          options: [{ value: 'trace', label: 'fu_trace' }, { value: 'via', label: 'fu_via' }] },
        { key: 'm', type: 'choice', label: 'fu_mode', default: 'current',
          options: [{ value: 'current', label: 'fu_modeCurrent' }, { value: 'time', label: 'fu_modeTime' }] },
      ],
    },
    {
      title: 'sectionInputs',
      fields: [
        { key: 'w', type: 'number', label: 'fu_w', default: 0.25, units: ['mm', 'mil'], pref: 'length', show: (v) => !isVia(v) },
        { key: 't', type: 'number', label: 'fu_t', default: 1, units: ['oz', 'um', 'mil'], show: (v) => !isVia(v),
          presets: [{ label: '½ oz', value: 0.5, unit: 'oz' }, { label: '1 oz', value: 1, unit: 'oz' }, { label: '2 oz', value: 2, unit: 'oz' }] },
        { key: 'd', type: 'number', label: 'fu_drill', default: 0.3, units: ['mm', 'mil'], pref: 'length', show: isVia },
        { key: 'p', type: 'number', label: 'fu_plating', default: 25, units: ['um', 'mil'], show: isVia },
        { key: 'dur', type: 'number', label: 'fu_dur', default: 10, units: ['ms', 's', 'us'], info: 'fu_durInfo', show: (v) => v.m === 'current',
          presets: [{ label: '1 ms', value: 1, unit: 'ms' }, { label: '10 ms', value: 10, unit: 'ms' }, { label: '100 ms', value: 100, unit: 'ms' }, { label: '1 s', value: 1, unit: 's' }] },
        { key: 'I', type: 'number', label: 'fu_I', default: 50, units: ['A', 'mA'], show: (v) => v.m === 'time' },
        { key: 'ta', type: 'number', label: 'ambientTemp', default: 25, units: ['C', 'F', 'K'], valid: 'any' },
      ],
    },
  ],

  compute(v, u) {
    let areaMm2;
    if (isVia(v)) {
      const rIn = toMm(v.d, u.d) / 2;
      const rOut = rIn + toMm(v.p, u.p);
      areaMm2 = Math.PI * (rOut * rOut - rIn * rIn);
    } else {
      areaMm2 = toMm(v.w, u.w) * thicknessToMil(v.t, u.t) * MM_PER_MIL;
    }
    return calculateFusing({
      areaMm2,
      seconds: v.m === 'current' ? v.dur * tMul[u.dur] : 0,
      currentA: v.m === 'time' ? currentToA(v.I, u.I) : 0,
      ambientC: tempToC(v.ta, u.ta),
    });
  },

  render(r, v) {
    if (!r.ok) return invalid(r.errors);
    const first = v.m === 'time'
      ? ['fu_time', siHtml(r.timeS, 's')]
      : ['fu_onderdonk', `${fmt(r.onderdonkA, 4)} <span class="u">A</span>`];
    return heroes([first, ['fu_preece', `${fmt(r.preeceA, 4)} <span class="u">A</span>`]])
      + messages('warn', r.warnings)
      + block('results', rows([
        ['fu_area', `${fmt(r.areaMm2, 4)} mm² · ${fmt(r.areaCmil, 4)} cmil`],
        ['fu_diam', `${fmt(r.equivDiameterMm, 4)} mm`],
        ['fu_i2t', `${si(r.i2t, 'A²s')}`],
      ]))
      + formulaBlock([
        'Onderdonk:  I = A · √( log10(1 + (Tm − Ta)/(234 + Ta)) / (33·t) )',
        '            A [cmil], t [s], Tm = 1083 °C',
        'Preece:     I = 10244 · d^1.5            d [in], equal-area round wire',
        'I²t = log10(1 + (Tm − Ta)/(234 + Ta)) · A² / 33',
      ], 'fu_note', ['I. M. Onderdonk (1928)', 'W. H. Preece (1884)', 'D. Brooks, “Fusing currents in traces”']);
  },
};
