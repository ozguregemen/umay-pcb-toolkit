// SVG figures used by lessons ([[fig:name]]). Colours come from CSS tokens.

import { t } from '../i18n.js';
import { esc, fmt } from '../ui/format.js';
import { rect, circle, text, arrow, dimV } from '../ui/svg.js';

const L = (k) => esc(t(k));

/** Figure built with the diagram kit (src/ui/svg.js); the caption doubles as the label. */
const fig = (w, h, captionKey, body) => `<figure class="fig"><svg class="diagram" viewBox="0 0 ${w} ${h}" role="img" aria-label="${L(captionKey)}">${body}</svg><figcaption>${L(captionKey)}</figcaption></figure>`;

function stack(layers, title) {
  // layers: [{ kind: 'sig'|'gnd'|'pwr'|'core'|'pre'|'mask', label }]
  const rowH = { sig: 12, gnd: 12, pwr: 12, core: 28, pre: 18, mask: 8 };
  let y = 10;
  let lastLabel = -Infinity;
  const parts = layers.map((l) => {
    const h = rowH[l.kind];
    const cls = l.kind === 'core' || l.kind === 'pre' ? 'diel' : l.kind === 'mask' ? 'mask' : 'cu';
    const width = l.kind === 'sig' ? 'x="60" width="70"' : 'x="40" width="210"';
    // Keep labels at least 14 px apart; a leader line joins a pushed-down label to its layer.
    const want = y + h / 2 + 4;
    const ly = Math.max(want, lastLabel + 14);
    lastLabel = ly;
    const leader = ly - want > 2 ? `<path class="line" d="M252 ${y + h / 2}L260 ${ly - 4}" opacity=".5"/>` : '';
    const r = `<rect class="${cls}" ${width} y="${y}" height="${h}"/>${l.kind === 'sig' ? `<rect class="cu" x="150" y="${y}" width="40" height="${h}"/><rect class="cu" x="205" y="${y}" width="30" height="${h}"/>` : ''}
      ${leader}<text class="lbl" x="262" y="${ly}" text-anchor="start">${esc(l.label)}</text>`;
    y += h;
    return r;
  }).join('');
  y = Math.max(y, lastLabel);
  return `<figure class="fig"><svg class="diagram" viewBox="0 0 400 ${y + 10}" role="img" aria-label="${esc(title)}">${parts}</svg><figcaption>${esc(title)}</figcaption></figure>`;
}

const FIGS = {
  'stackup-2': () => stack([
    { kind: 'mask', label: t('fg_mask') },
    { kind: 'sig', label: `L1 · ${t('fg_sigPwr')}` },
    { kind: 'core', label: `${t('fg_core')} ${fmt(1.5)} mm` },
    { kind: 'gnd', label: `L2 · ${t('fg_gndMostly')}` },
    { kind: 'mask', label: t('fg_mask') },
  ], t('fg_stack2')),
  'stackup-4': () => stack([
    { kind: 'sig', label: `L1 · ${t('fg_sig')}` },
    { kind: 'pre', label: `${t('fg_prepreg')} ~${fmt(0.2)} mm` },
    { kind: 'gnd', label: 'L2 · GND' },
    { kind: 'core', label: `${t('fg_core')} ~${fmt(1)} mm` },
    { kind: 'pwr', label: `L3 · ${t('fg_pwr')}` },
    { kind: 'pre', label: `${t('fg_prepreg')} ~${fmt(0.2)} mm` },
    { kind: 'sig', label: `L4 · ${t('fg_sig')}` },
  ], t('fg_stack4')),
  'stackup-6': () => stack([
    { kind: 'sig', label: `L1 · ${t('fg_sig')}` },
    { kind: 'pre', label: t('fg_prepreg') },
    { kind: 'gnd', label: 'L2 · GND' },
    { kind: 'core', label: t('fg_core') },
    { kind: 'sig', label: `L3 · ${t('fg_sigInner')}` },
    { kind: 'pre', label: t('fg_prepreg') },
    { kind: 'pwr', label: `L4 · ${t('fg_pwr')}` },
    { kind: 'core', label: t('fg_core') },
    { kind: 'gnd', label: 'L5 · GND' },
    { kind: 'pre', label: t('fg_prepreg') },
    { kind: 'sig', label: `L6 · ${t('fg_sig')}` },
  ], t('fg_stack6')),

  'via-types': () => `<figure class="fig"><svg class="diagram" viewBox="0 0 420 150" role="img" aria-label="${L('fg_viaTypes')}">
    ${[20, 46, 72, 98].map((y) => `<rect class="diel" x="20" y="${y}" width="380" height="26"/>`).join('')}
    ${[18, 44, 70, 96, 122].map((y) => `<rect class="cu" x="20" y="${y}" width="380" height="3" opacity=".35"/>`).join('')}
    <rect class="hole" x="55" y="16" width="16" height="110"/><rect class="cu" x="52" y="16" width="3" height="110"/><rect class="cu" x="71" y="16" width="3" height="110"/>
    <rect class="hole" x="150" y="16" width="16" height="56"/><rect class="cu" x="147" y="16" width="3" height="56"/><rect class="cu" x="166" y="16" width="3" height="56"/>
    <rect class="hole" x="245" y="44" width="16" height="56"/><rect class="cu" x="242" y="44" width="3" height="56"/><rect class="cu" x="261" y="44" width="3" height="56"/>
    <path class="cu" d="M330 16h20l-6 28h-8z"/>
    <text class="lbl" x="63" y="142">${L('fg_through')}</text><text class="lbl" x="158" y="142">${L('fg_blind')}</text>
    <text class="lbl" x="253" y="142">${L('fg_buried')}</text><text class="lbl" x="340" y="142">${L('fg_micro')}</text>
  </svg><figcaption>${L('fg_viaTypes')}</figcaption></figure>`,

  'return-path': () => `<figure class="fig"><svg class="diagram" viewBox="0 0 420 170" role="img" aria-label="${L('fg_return')}">
    <rect class="diel" x="20" y="30" width="180" height="50"/><rect class="cu" x="20" y="80" width="180" height="6"/>
    <rect class="cu" x="95" y="20" width="30" height="10"/>
    <ellipse cx="110" cy="83" rx="34" ry="6" fill="none" stroke="var(--focus)" stroke-width="2"/>
    <text class="lbl" x="110" y="104">${L('fg_returnUnder')}</text>
    <rect class="diel" x="230" y="30" width="180" height="50"/><rect class="cu" x="230" y="80" width="70" height="6"/><rect class="cu" x="340" y="80" width="70" height="6"/>
    <rect class="cu" x="305" y="20" width="30" height="10"/>
    <path d="M300 92 C 320 140, 330 140, 340 92" fill="none" stroke="var(--err-fg)" stroke-width="2" stroke-dasharray="4 3"/>
    <text class="lbl" x="320" y="104">${L('fg_returnSplit')}</text>
    <text class="lbl" x="110" y="150">✓ ${L('fg_good')}</text><text class="lbl" x="320" y="150">✗ ${L('fg_bad')}</text>
  </svg><figcaption>${L('fg_return')}</figcaption></figure>`,

  'decap': () => `<figure class="fig"><svg class="diagram" viewBox="0 0 420 160" role="img" aria-label="${L('fg_decap')}">
    <rect x="20" y="40" width="90" height="70" rx="4" fill="var(--surface-3)" stroke="var(--border-strong)"/><text class="lbl" x="65" y="80">IC</text>
    <rect class="cu" x="110" y="52" width="14" height="8"/><rect class="cu" x="110" y="92" width="14" height="8"/>
    <rect class="cu" x="132" y="50" width="10" height="12"/><rect class="cu" x="132" y="90" width="10" height="12"/>
    <rect x="130" y="62" width="14" height="28" fill="var(--diel)" stroke="var(--border-strong)"/>
    <circle class="hole" cx="137" cy="44" r="4"/><circle class="hole" cx="137" cy="108" r="4"/>
    <path d="M124 56h8M124 96h8" stroke="var(--cu)" stroke-width="4"/>
    <text class="lbl" x="137" y="130">${L('fg_decapGood')}</text>
    <rect x="230" y="40" width="90" height="70" rx="4" fill="var(--surface-3)" stroke="var(--border-strong)"/><text class="lbl" x="275" y="80">IC</text>
    <path d="M320 56h60v6M320 96h60v-6" stroke="var(--cu)" stroke-width="4" fill="none"/>
    <rect x="373" y="62" width="14" height="28" fill="var(--diel)" stroke="var(--border-strong)"/>
    <circle class="hole" cx="398" cy="76" r="4"/>
    <text class="lbl" x="330" y="130">${L('fg_decapBad')}</text>
  </svg><figcaption>${L('fg_decap')}</figcaption></figure>`,

  'creepage': () => `<figure class="fig"><svg class="diagram" viewBox="0 0 420 130" role="img" aria-label="${L('fg_creep')}">
    <rect class="diel" x="20" y="70" width="380" height="40"/>
    <rect class="cu" x="60" y="56" width="90" height="14"/><rect class="cu" x="270" y="56" width="90" height="14"/>
    <path d="M150 50 L270 50" stroke="var(--focus)" stroke-width="2"/>
    <path d="M150 70 L180 70 L180 92 L240 92 L240 70 L270 70" stroke="var(--err-fg)" stroke-width="2" fill="none" stroke-dasharray="5 3"/>
    <rect x="180" y="70" width="60" height="22" fill="var(--surface)" stroke="none"/>
    <text class="lbl" x="210" y="42">${L('fg_clearance')}</text><text class="lbl" x="210" y="122">${L('fg_creepage')}</text>
  </svg><figcaption>${L('fg_creep')}</figcaption></figure>`,
  'antenna-layout': () => {
    const fence = Array.from({ length: 27 }, (_, i) => 27 + i * 14).filter((x) => Math.abs(x - 252) > 8 && Math.abs(x - 236) > 8)
      .map((x) => circle(x, 67, 2, 'term')).join('');
    return fig(420, 180, 'fg_antLayout',
      rect(20, 20, 380, 150, 'soft', ' rx="3"')
      + rect(20, 60, 380, 110, 'cu plane')
      + fence
      + '<path class="cutr" style="stroke-width:5" d="M236,60V32H392M252,60V32"/>'
      + '<path class="cutr" style="stroke-width:4" d="M120,114H252V60"/>'
      + rect(60, 92, 60, 44, 'comp', ' rx="3"') + text(90, 118, 'RF', { cls: 'name' })
      + rect(178, 108, 14, 12, 'comp') + rect(164, 122, 10, 14, 'comp') + rect(196, 122, 10, 14, 'comp')
      + text(185, 152, t('fg_antMatch'))
      + text(150, 106, '50 Ω')
      + text(118, 44, t('fg_antKeep'))
      + text(322, 50, t('fg_antIfa'))
      + text(24, 84, t('fg_antFence'), { anchor: 'start' })
      + text(330, 152, t('fg_antGnd')));
  },
  'nfc-coupling': () => {
    const turns = (x0, y, n) => Array.from({ length: n }, (_, i) => rect(x0 + i * 8, y, 5, 5, 'cu')).join('');
    // Field lines pass through both coil openings and return outside the conductors.
    return fig(420, 180, 'fg_nfc',
      '<path class="wave2" d="M210,18C380,10 400,180 210,166M210,18C40,10 20,180 210,166"/>'
      + arrow(210, 156, 210, 26, { cls: 'flow', headCls: 'arrow flow' })
      + arrow(186, 150, 186, 32, { cls: 'flow', headCls: 'arrow flow' })
      + arrow(234, 150, 234, 32, { cls: 'flow', headCls: 'arrow flow' })
      + turns(150, 46, 3) + turns(249, 46, 3)
      + turns(110, 132, 4) + turns(281, 132, 4)
      + text(259, 38, t('fg_nfcTag'))
      + text(295, 124, t('fg_nfcReader'))
      + text(290, 92, t('fg_nfcField'))
      + dimV(51, 132, 160, '1–5 cm', { left: true, cls: 'lbl' }));
  },
};

export function figure(name) {
  return FIGS[name] ? FIGS[name]() : '';
}

export const figureStrings = {
  tr: {
    fg_mask: 'Lehim maskesi', fg_sig: 'Sinyal', fg_sigPwr: 'Sinyal + güç', fg_gndMostly: 'Çoğunlukla GND dökümü',
    fg_sigInner: 'İç sinyal (stripline)', fg_pwr: 'Güç düzlemi', fg_core: 'Çekirdek', fg_prepreg: 'Prepreg',
    fg_stack2: '2 katman: alt yüzeyi mümkün olduğunca kesintisiz GND bırakın.',
    fg_stack4: '4 katman (SIG/GND/PWR/SIG): her sinyal katmanının hemen yanında bir referans düzlem var.',
    fg_stack6: '6 katman: iç sinyal katmanı iki düzlem arasında stripline olur.',
    fg_viaTypes: 'Via türleri', fg_through: 'Delik geçişli', fg_blind: 'Kör', fg_buried: 'Gömülü', fg_micro: 'Mikrovia',
    fg_return: 'Yüksek frekansta dönüş akımı izin hemen altındaki düzlemden akar.',
    fg_returnUnder: 'dönüş akımı izin altında', fg_returnSplit: 'yarık: dönüş akımı dolanır',
    fg_good: 'kesintisiz düzlem', fg_bad: 'yarık üzerinden geçiş',
    fg_decap: 'Dekuplaj kondansatörü: döngü alanı (endüktans) ne kadar küçükse o kadar etkili.',
    fg_decapGood: 'kısa döngü, via pad yanında', fg_decapBad: 'uzun iz = yüksek endüktans',
    fg_creep: 'Clearance hava içinden en kısa mesafe, creepage yüzey boyunca en kısa yoldur; yüzeydeki yarık creepage’i uzatır.',
    fg_clearance: 'clearance (hava)', fg_creepage: 'creepage (yüzey, yarık ile)',
    fg_antLayout: 'Kart kenarında IFA (ters F) anten: altında hiçbir katmanda bakır yok; toprak dökümü antenin karşı yarısıdır; beslemede π eşleştirme için yer bırakılır.',
    fg_antMatch: 'π eşleştirme', fg_antKeep: 'bakırsız bölge (tüm katmanlar)', fg_antIfa: 'IFA anten kolu', fg_antFence: 'GND via çiti', fg_antGnd: 'toprak dökümü',
    fg_nfc: 'NFC: okuyucu ve etiket bobinleri yakın alanda manyetik olarak kuple olur (gevşek kuplajlı transformatör). 13,56 MHz’te λ ≈ 22 m olduğundan küçük bobin ışıma yapmaz.',
    fg_nfcTag: 'etiket bobini', fg_nfcReader: 'okuyucu bobini', fg_nfcField: 'manyetik alan',
  },
  en: {
    fg_mask: 'Solder mask', fg_sig: 'Signal', fg_sigPwr: 'Signal + power', fg_gndMostly: 'Mostly GND pour',
    fg_sigInner: 'Inner signal (stripline)', fg_pwr: 'Power plane', fg_core: 'Core', fg_prepreg: 'Prepreg',
    fg_stack2: '2 layers: keep the bottom side as unbroken GND as possible.',
    fg_stack4: '4 layers (SIG/GND/PWR/SIG): every signal layer sits right next to a reference plane.',
    fg_stack6: '6 layers: the inner signal layer becomes stripline between two planes.',
    fg_viaTypes: 'Via types', fg_through: 'Through', fg_blind: 'Blind', fg_buried: 'Buried', fg_micro: 'Microvia',
    fg_return: 'At high frequency the return current flows in the plane directly under the trace.',
    fg_returnUnder: 'return current under the trace', fg_returnSplit: 'split: return current detours',
    fg_good: 'solid plane', fg_bad: 'crossing a split',
    fg_decap: 'Decoupling capacitor: the smaller the loop area (inductance), the better it works.',
    fg_decapGood: 'short loop, via next to pad', fg_decapBad: 'long trace = high inductance',
    fg_creep: 'Clearance is the shortest path through air, creepage the shortest path along the surface; a slot lengthens creepage.',
    fg_clearance: 'clearance (air)', fg_creepage: 'creepage (surface, with slot)',
    fg_antLayout: 'IFA (inverted-F) antenna on the board edge: no copper under it on any layer; the ground pour is the other half of the antenna; room is left for a π match at the feed.',
    fg_antMatch: 'π match', fg_antKeep: 'copper-free zone (all layers)', fg_antIfa: 'IFA antenna arm', fg_antFence: 'GND via fence', fg_antGnd: 'ground pour',
    fg_nfc: 'NFC: reader and tag coils couple magnetically in the near field (a loosely coupled transformer). At 13.56 MHz λ ≈ 22 m, so a small coil does not radiate.',
    fg_nfcTag: 'tag coil', fg_nfcReader: 'reader coil', fg_nfcField: 'magnetic field',
  },
};
