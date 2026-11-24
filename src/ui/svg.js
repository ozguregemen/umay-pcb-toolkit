// SVG drawing kit for calculator diagrams: dimensions, labels, IEC schematic
// symbols and waveforms. Every helper returns an SVG fragment string; colours
// come from CSS classes (see "Diagram kit" in assets/app.css), so diagrams
// follow the light/dark theme.
//
// Conventions
// - Coordinates are in viewBox units; pick a viewBox per diagram (≈ 420 × 200).
// - Two-terminal symbols are drawn between two points (horizontal or vertical)
//   with leads; the body is centred.
// - `name` = designator (R1), `value` = live value text (10 kΩ). Values are
//   drawn with class "val" (accent colour) so readers see what they changed.

import { esc } from './format.js';

const f = (n) => Math.round(n * 10) / 10;

/** Wrap a diagram. opts.wide allows a larger max width (schematics). */
export function svg(w, h, body, label, { wide = false } = {}) {
  return `<svg class="diagram${wide ? ' wide' : ''}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${body}</svg>`;
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

/**
 * Text label. cls: 'lbl' (small muted), 'name' (designator), 'val' (live value,
 * accent), 'sym' (italic math symbol), 'title' (caption).
 */
export function text(x, y, s, { cls = 'lbl', anchor = 'middle', size } = {}) {
  const style = size ? ` style="font-size:${size}px"` : '';
  return `<text class="${cls}" x="${f(x)}" y="${f(y)}" text-anchor="${anchor}"${style}>${esc(s)}</text>`;
}

/** Leader line from a point to a text label. */
export function callout(px, py, tx, ty, s, { cls = 'lbl', anchor } = {}) {
  const a = anchor ?? (tx >= px ? 'start' : 'end');
  const gap = a === 'start' ? -3 : a === 'end' ? 3 : 0;
  return `<path class="leader" d="M${f(px)},${f(py)}L${f(tx + gap)},${f(ty - 4)}"/><circle class="dot" cx="${f(px)}" cy="${f(py)}" r="1.8"/>${text(tx, ty, s, { cls, anchor: a })}`;
}

// ---------------------------------------------------------------------------
// Dimensions
// ---------------------------------------------------------------------------

function head(x, y, ang, cls = 'arrow') {
  const s = 5.5;
  const a1 = ang + Math.PI * 0.86;
  const a2 = ang - Math.PI * 0.86;
  return `<path class="${cls}" d="M${f(x)},${f(y)}L${f(x + s * Math.cos(a1))},${f(y + s * Math.sin(a1))}L${f(x + s * Math.cos(a2))},${f(y + s * Math.sin(a2))}Z"/>`;
}

/** Arrow from (x1,y1) to (x2,y2) with a head at the end (or both ends). */
export function arrow(x1, y1, x2, y2, { both = false, cls = 'dimline', headCls = 'arrow' } = {}) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  return `<path class="${cls}" d="M${f(x1)},${f(y1)}L${f(x2)},${f(y2)}"/>${head(x2, y2, ang, headCls)}${both ? head(x1, y1, ang + Math.PI, headCls) : ''}`;
}

/**
 * Horizontal dimension between x1 and x2 at height y, label above (or below
 * with below: true). extFrom: draw extension lines from this y to the dimension.
 * If the span is too short for arrows inside, arrows are drawn outside.
 */
export function dimH(x1, x2, y, label, { below = false, extFrom, cls = 'sym' } = {}) {
  const [a, b] = x1 < x2 ? [x1, x2] : [x2, x1];
  const ext = extFrom !== undefined
    ? `<path class="ext" d="M${f(a)},${f(extFrom)}V${f(y)}M${f(b)},${f(extFrom)}V${f(y)}"/>` : '';
  const short = b - a < 16;
  const line = short
    ? `<path class="dimline" d="M${f(a - 14)},${f(y)}H${f(b + 14)}"/>${head(a, y, 0)}${head(b, y, Math.PI)}`
    : arrow(a, y, b, y, { both: true });
  const ty = below ? y + 13 : y - 5;
  return ext + line + (label ? text((a + b) / 2, ty, label, { cls }) : '');
}

/** Vertical dimension between y1 and y2 at x, label to the right (or left). */
export function dimV(y1, y2, x, label, { left = false, extFrom, cls = 'sym' } = {}) {
  const [a, b] = y1 < y2 ? [y1, y2] : [y2, y1];
  const ext = extFrom !== undefined
    ? `<path class="ext" d="M${f(extFrom)},${f(a)}H${f(x)}M${f(extFrom)},${f(b)}H${f(x)}"/>` : '';
  const short = b - a < 16;
  const line = short
    ? `<path class="dimline" d="M${f(x)},${f(a - 14)}V${f(b + 14)}"/>${head(x, a, Math.PI / 2)}${head(x, b, -Math.PI / 2)}`
    : arrow(x, a, x, b, { both: true });
  return ext + line + (label ? text(left ? x - 6 : x + 6, (a + b) / 2 + 4, label, { cls, anchor: left ? 'end' : 'start' }) : '');
}

// ---------------------------------------------------------------------------
// Physical shapes
// ---------------------------------------------------------------------------

export const rect = (x, y, w, h, cls, extra = '') => `<rect class="${cls}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${extra}/>`;
export const circle = (cx, cy, r, cls) => `<circle class="${cls}" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`;
export const path = (d, cls) => `<path class="${cls}" d="${d}"/>`;
export const poly = (pts, cls = 'wire') => `<polyline class="${cls}" points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}"/>`;
/** Closed filled shape through [[x,y], …]. */
export const polygon = (pts, cls, extra = '') => `<polygon class="${cls}"${extra} points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}"/>`;

/** Straight trace of width w from (x1,y1) to (x2,y2), any angle. */
export function bar(x1, y1, x2, y2, w, cls, extra = '') {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = (-(y2 - y1) / len) * (w / 2);
  const ny = ((x2 - x1) / len) * (w / 2);
  return polygon([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]], cls, extra);
}

// Rings are often drawn to scale with small radii, so keep two decimals.
const f2 = (n) => Math.round(n * 100) / 100;
const circlePath = (cx, cy, r) => `M${f2(cx - r)},${f2(cy)}a${f2(r)},${f2(r)} 0 1,0 ${f2(2 * r)},0a${f2(r)},${f2(r)} 0 1,0 ${f2(-2 * r)},0Z`;
/** Annulus between rOuter and rInner (even-odd fill), e.g. an annular ring or tolerance band. */
export const ring = (cx, cy, rOuter, rInner, cls) => `<path class="${cls}" fill-rule="evenodd" d="${circlePath(cx, cy, rOuter)}${circlePath(cx, cy, rInner)}"/>`;

/** Wide horizontal arrow from x1 to x2 at height y, shaft thickness th (waves, power flow). */
export function blockArrow(x1, x2, y, th, cls) {
  const dir = Math.sign(x2 - x1) || 1;
  const hl = Math.min(12, Math.abs(x2 - x1) * 0.6);
  const hw = th / 2 + 4;
  const xh = x2 - dir * hl;
  return `<path class="${cls}" d="M${f(x1)},${f(y - th / 2)}H${f(xh)}V${f(y - hw)}L${f(x2)},${f(y)}L${f(xh)},${f(y + hw)}V${f(y + th / 2)}H${f(x1)}Z"/>`;
}

// ---------------------------------------------------------------------------
// Schematic (IEC style)
// ---------------------------------------------------------------------------

/** Wire through points [[x,y], …]. */
export const wire = (...pts) => poly(pts, 'wire');
/** Junction dot. */
export const node = (x, y) => circle(x, y, 2.8, 'node');
/** Open terminal with a label. side: 'left' | 'right' | 'top' | 'bottom'. */
export function terminal(x, y, label, side = 'left', cls = 'name') {
  const o = { left: [-8, 4, 'end'], right: [8, 4, 'start'], top: [0, -9, 'middle'], bottom: [0, 16, 'middle'] }[side];
  return `${circle(x, y, 3.2, 'term')}${label ? text(x + o[0], y + o[1], label, { cls, anchor: o[2] }) : ''}`;
}

/** Ground symbol with its top at (x, y). */
export const ground = (x, y) => `<path class="wire" d="M${f(x)},${f(y)}v6M${f(x - 10)},${f(y + 6)}h20M${f(x - 6)},${f(y + 10)}h12M${f(x - 2.5)},${f(y + 14)}h5"/>`;

/**
 * Two-terminal component between (x1,y1) and (x2,y2) — horizontal or vertical.
 * kind: 'R' | 'C' | 'L' | 'D' | 'LED' | 'X' (crystal) | 'V' (DC source, + at
 * the first point) | 'AC' (sine source) | 'I' (current source) | 'SW' (switch).
 * opts: name, value (live, accent colour unless valueCls is given), flip (labels
 * on the other side), hi (accent outline), dashed (parasitic / optional part).
 */
export function twoTerm(kind, x1, y1, x2, y2, { name, value, flip = false, hi = false, dashed = false, valueCls = 'val' } = {}) {
  const horiz = Math.abs(y2 - y1) < Math.abs(x2 - x1);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const len = horiz ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
  const body = { R: 34, C: 10, L: 36, D: 16, LED: 16, X: 18, V: 26, AC: 26, I: 26, SW: 26 }[kind] ?? 30;
  const half = Math.min(body, len - 8) / 2;
  const dir = horiz ? Math.sign(x2 - x1) || 1 : Math.sign(y2 - y1) || 1;
  const dash = dashed ? ' dash' : '';
  // Leads
  const lead = (a, b) => poly([a, b], `wire${dash}`);
  const leads = horiz
    ? lead([x1, y1], [cx - dir * half, cy]) + lead([cx + dir * half, cy], [x2, y2])
    : lead([x1, y1], [cx, cy - dir * half]) + lead([cx, cy + dir * half], [x2, y2]);
  // Body drawn for a horizontal part centred at origin, then rotated.
  const comp = `comp${hi ? ' hi' : ''}${dash}`;
  const line = `wire${hi ? ' hi' : ''}${dash}`;
  let g = '';
  let upright = ''; // drawn without rotation (the sine of an AC source)
  switch (kind) {
    case 'R': g = `<rect class="${comp}" x="-17" y="-6.5" width="34" height="13" rx="1"/>`; break;
    case 'C': g = `<path class="${line}" d="M-4,-11V11M4,-11V11" style="stroke-width:2.4"/>`; break;
    case 'L': g = `<path class="${line}" d="M-18,0a4.5,4.5 0 0 1 9,0a4.5,4.5 0 0 1 9,0a4.5,4.5 0 0 1 9,0a4.5,4.5 0 0 1 9,0"/>`; break;
    case 'AC':
      g = `<circle class="${comp}" r="13"/>`;
      upright = `<path class="wire" d="M${f(cx - 7)},${f(cy)}q3.5,-7 7,0t7,0"/>`;
      break;
    case 'D': g = `<path class="${comp}" d="M-7,-8L7,0L-7,8Z"/><path class="wire" d="M7,-8V8"/>`; break;
    case 'LED': g = `<path class="${comp}" d="M-7,-8L7,0L-7,8Z"/><path class="wire" d="M7,-8V8M0,-11l5,-7M5,-11l5,-7"/><path class="arrow" d="M5,-18l-3.5,1.2l2.3,1.8zM10,-18l-3.5,1.2l2.3,1.8z"/>`; break;
    case 'X': g = `<path class="wire" d="M-9,-10V10M9,-10V10" style="stroke-width:2"/><rect class="${comp}" x="-5" y="-8" width="10" height="16"/>`; break;
    case 'V': g = `<circle class="${comp}" r="13"/><path class="wire" d="M-7,0h5M-4.5,-2.5v5M3,0h5"/>`; break;
    case 'I': g = `<circle class="${comp}" r="13"/><path class="wire" d="M-7,0h12"/><path class="arrow" d="M8,0l-5,-3.5v7z"/>`; break;
    case 'SW': g = `<circle class="node" cx="-12" cy="0" r="2.2"/><circle class="node" cx="12" cy="0" r="2.2"/><path class="wire" d="M-12,0L10,-10"/>`; break;
    default: g = `<rect class="${comp}" x="-15" y="-7" width="30" height="14"/>`;
  }
  // Rotate so the body's +x axis points from (x1,y1) to (x2,y2).
  const rot = horiz ? (dir > 0 ? 0 : 180) : (dir > 0 ? 90 : -90);
  const bodySvg = `<g transform="translate(${f(cx)},${f(cy)}) rotate(${rot})">${g}</g>${upright}`;
  // Labels
  let labels = '';
  const off = kind === 'V' || kind === 'AC' || kind === 'I' ? 19 : kind === 'C' ? 15 : 13;
  if (horiz) {
    const s = flip ? 1 : -1;
    if (name) labels += text(cx, cy + s * off + (s > 0 ? 9 : 0), name, { cls: 'name' });
    if (value) labels += text(cx, cy - s * off + (s > 0 ? 0 : 9), value, { cls: valueCls });
  } else {
    const ax = flip ? cx - off : cx + off;
    const anchor = flip ? 'end' : 'start';
    if (name) labels += text(ax, cy - 2, name, { cls: 'name', anchor });
    if (value) labels += text(ax, cy + 12, value, { cls: valueCls, anchor });
  }
  return leads + bodySvg + labels;
}

/** Inverter (logic NOT / oscillator amplifier): input at x, output at x + 30. */
export const inverter = (x, y, cls = 'comp') => `<path class="${cls}" d="M${f(x)},${f(y - 11)}L${f(x)},${f(y + 11)}L${f(x + 23)},${f(y)}Z"/>${circle(x + 26.5, y, 3.5, cls)}`;

/** Simple rectangular block (IC, regulator) with a title. */
export function block(x, y, w, h, title, sub) {
  return `${rect(x, y, w, h, 'comp', ' rx="3"')}${text(x + w / 2, y + h / 2 + (sub ? -2 : 4), title, { cls: 'name' })}${sub ? text(x + w / 2, y + h / 2 + 12, sub, { cls: 'lbl' }) : ''}`;
}

// ---------------------------------------------------------------------------
// Waveforms
// ---------------------------------------------------------------------------

/** Axes with an origin at (x0,y0), width w, height h (y grows upward). */
export function axes(x0, y0, w, h, { xLabel, yLabel } = {}) {
  return `<path class="axis" d="M${f(x0)},${f(y0 - h)}V${f(y0)}H${f(x0 + w)}"/>`
    + (xLabel ? text(x0 + w, y0 + 13, xLabel, { cls: 'lbl', anchor: 'end' }) : '')
    + (yLabel ? text(x0 - 4, y0 - h + 4, yLabel, { cls: 'lbl', anchor: 'end' }) : '');
}

/** Waveform polyline; cls 'wave' (accent) or 'wave2' (dashed). */
export const wave = (pts, cls = 'wave') => poly(pts, cls);
