// IPC rules reference: verified acceptance/design values in compact tables.
// Values from IPC-2221A/B, IPC-2222, IPC-2226, IPC-6012 (rev C–F) via the
// standards' text and fabricator guides; see docs/muhendislik-analizi.md.

import { t } from '../i18n.js';
import { esc } from '../ui/format.js';
import { icon } from '../ui/icons.js';

const strings = {
  tr: {
    ir_intro: 'Tasarım incelemesinde sık başvurulan IPC kabul ve tasarım değerleri. Bir sınıf seçerek ilgili sütunları vurgulayın.',
    ir_highlight: 'Vurgula',
    ir_none: 'Yok',
    ir_class: 'Sınıf {n}',
    ir_classes: 'Ürün sınıfları (IPC-6011 / IPC-6012)',
    ir_classesP: 'Sınıf, kartın kabul kriterlerini belirler ve tedarik dokümanında belirtilmelidir.',
    ir_c1: 'Genel elektronik ürünler: tüketici ürünleri, temel işlev yeterli.',
    ir_c2: 'Özel hizmet ürünleri: sürekli çalışma ve uzun ömür istenir, kesinti kritik değildir (endüstriyel, haberleşme).',
    ir_c3: 'Yüksek güvenilirlik: kesintiye tahammül yok, zorlu ortam (havacılık, tıbbi yaşam desteği, savunma).',
    ir_levels: 'Üretilebilirlik seviyeleri (IPC-2221 / IPC-2222)',
    ir_levelsP: 'Seviye A genel tasarım, B orta, C yüksek hassasiyettir. Sınıftan bağımsızdır; üretim kolaylığını ve maliyeti belirler.',
    ir_param: 'Parametre',
    ir_fab: 'Pad üretim payı (Tablo 9-1)',
    ir_fabNote: '1 oz üzerindeki her oz için +0,05 mm',
    ir_lead: 'Bacak–delik boşluğu (min delik = maks bacak + …)',
    ir_holeMax: 'Maks delik = min bacak + …',
    ir_widthTol: 'Kaplamalı iletken genişlik toleransı (Tablo 10-3)',
    ir_holePos: 'Delik konum toleransı (Tablo 9-5, dtp)',
    ir_ring: 'Halka (annular ring) kabulü (IPC-6012)',
    ir_ringP: 'Halka, delik duvarından pad kenarına ölçülür. Kırılmaya (breakout) izin verilen sınıflarda iletken bağlantı noktasındaki genişlik azalması sınırlıdır.',
    ir_ext: 'Dış katman (desteklenmiş delik)',
    ir_int: 'İç katman',
    ir_ext1: '180° kırılmaya izin var; bağlantı genişliği ≤ %30 azalabilir',
    ir_ext2: '90° kırılmaya izin var; bağlantı genişliği ≤ %20 azalabilir (≥ 0,05 mm veya min. iz genişliği)',
    ir_ext3: '≥ 0,050 mm (izole kusurlarda %20 eksik olabilir)',
    ir_int1: '180° kırılmaya izin var',
    ir_int2: '90° kırılma yalnızca damla/fillet varsa; yoksa ≥ 0,025 mm',
    ir_int3: '≥ 0,025 mm',
    ir_design: 'Tasarım için IPC-2221 en küçük halka (tüm sınıflar)',
    ir_designV: 'Dış 0,050 mm · iç 0,025 mm · desteksiz (kaplamasız) delik dış 0,150 mm',
    ir_plating: 'Delik bakır kaplaması (IPC-6012)',
    ir_platingP: 'Ortalama / ince bölge en küçük değeri.',
    ir_pth: 'Kaplamalı delik, kör ve >2 katmanlı gömülü via',
    ir_micro: 'Mikrovia (kör ve gömülü)',
    ir_buried: 'Gömülü via çekirdekleri (2 katman)',
    ir_reduce: 'İletken kusurları (IPC-6012)',
    ir_reduceP: 'İzole kusurlar (çentik, iğne deliği, kenar pürüzü) için izin verilen azalma.',
    ir_wred: 'İletken genişliğinde azalma',
    ir_sred: 'İletken aralığında azalma',
    ir_conflict: 'kaynaklar çelişkili (%20–30)',
    ir_foil: 'Bakır kalınlıkları (IPC-4562 / IPC-6012)',
    ir_foilP: 'İşlem sonrası en küçük değerler kabul ölçümünde kullanılır. Dış katman değerleri kaplama dahildir.',
    ir_weight: 'Ağırlık',
    ir_nominal: 'Nominal folyo',
    ir_inner: 'İç katman, işlem sonrası min',
    ir_outer12: 'Dış katman min (Sınıf 1–2)',
    ir_outer3: 'Dış katman min (Sınıf 3)',
    ir_other: 'Diğer kurallar',
    ir_rule: 'Kural',
    ir_value: 'Değer',
    ir_bow: 'Eğilme ve burulma (bow & twist)',
    ir_bowV: 'SMT içeren kart ≤ %0,75 · diğerleri ≤ %1,5',
    ir_diel: 'Katmanlar arası en küçük dielektrik (belirtilmemişse)',
    ir_dielV: '90 µm (IPC-6012 rev B–E) · 65 µm (rev F, 2024 sonrası tasarımlar)',
    ir_ar: 'Kaplamalı delik en-boy oranı',
    ir_arV: 'Tercih edilen < 5:1 (IPC-2221A); üretimde tipik üst sınır 8:1–10:1',
    ir_mv: 'Mikrovia',
    ir_mvV: 'En-boy ≤ 1:1, derinlik ≤ 0,25 mm (IPC-T-50M); önerilen ≤ 0,8:1',
    ir_cur: 'IPC-2221 akım grafiklerinin kapsamı',
    ir_curV: '≤ 35 A, genişlik ≤ 10,16 mm, ΔT 10–100 °C, 0,5–3 oz; grafikler %10 düşürülmüş',
    ir_hole2hole: 'Delikler arası kalan laminat',
    ir_hole2holeV: '≥ 0,5 mm (IPC-2221 §9.2.7) ve padler §6.3 aralığını sağlamalı',
    ir_edge: 'Bileşen–kart kenarı',
    ir_edgeV: 'Tercihen ≥ 1,5 mm (IPC-2221 §8.1)',
    ir_spacing: 'İletken aralığı (gerilime göre)',
    ir_spacingV: 'IPC-2221 Tablo 6-1 — hesaplayıcıyı açın',
    ir_disclaimer: 'Değerler IPC-2221A/B, IPC-2222, IPC-2226 ve IPC-6012 (rev C–F) metinleri ile üretici kılavuzlarından derlenmiştir. Standartların güncel revizyonu ve satın alma dokümanınız her zaman önceliklidir.',
  },
  en: {
    ir_intro: 'IPC acceptance and design values often needed during design review. Pick a class to highlight its columns.',
    ir_highlight: 'Highlight',
    ir_none: 'None',
    ir_class: 'Class {n}',
    ir_classes: 'Product classes (IPC-6011 / IPC-6012)',
    ir_classesP: 'The class sets the board’s acceptance criteria and must be stated in the procurement documentation.',
    ir_c1: 'General electronic products: consumer goods, basic function is enough.',
    ir_c2: 'Dedicated service products: continued performance and long life wanted, interruption not critical (industrial, telecom).',
    ir_c3: 'High reliability: no downtime tolerated, harsh environments (aerospace, medical life support, defence).',
    ir_levels: 'Producibility levels (IPC-2221 / IPC-2222)',
    ir_levelsP: 'Level A is general design, B moderate, C high precision. Independent of class; sets ease of manufacture and cost.',
    ir_param: 'Parameter',
    ir_fab: 'Land fabrication allowance (Table 9-1)',
    ir_fabNote: '+0.05 mm for each oz above 1 oz',
    ir_lead: 'Lead-to-hole clearance (min hole = max lead + …)',
    ir_holeMax: 'Max hole = min lead + …',
    ir_widthTol: 'Plated conductor width tolerance (Table 10-3)',
    ir_holePos: 'Hole position tolerance (Table 9-5, dtp)',
    ir_ring: 'Annular ring acceptance (IPC-6012)',
    ir_ringP: 'The ring is measured from the hole wall to the land edge. Where breakout is allowed, the conductor junction width reduction is limited.',
    ir_ext: 'External (supported hole)',
    ir_int: 'Internal',
    ir_ext1: '180° breakout allowed; junction width may drop ≤ 30 %',
    ir_ext2: '90° breakout allowed; junction width may drop ≤ 20 % (≥ 0.05 mm or min. line width)',
    ir_ext3: '≥ 0.050 mm (isolated defects may reduce it by 20 %)',
    ir_int1: '180° breakout allowed',
    ir_int2: '90° breakout only with teardrops/fillets; otherwise ≥ 0.025 mm',
    ir_int3: '≥ 0.025 mm',
    ir_design: 'IPC-2221 minimum design ring (all classes)',
    ir_designV: 'External 0.050 mm · internal 0.025 mm · unsupported hole external 0.150 mm',
    ir_plating: 'Hole copper plating (IPC-6012)',
    ir_platingP: 'Average / thin-area minimum.',
    ir_pth: 'Plated through holes, blind and >2-layer buried vias',
    ir_micro: 'Microvias (blind and buried)',
    ir_buried: 'Buried via cores (2 layers)',
    ir_reduce: 'Conductor defects (IPC-6012)',
    ir_reduceP: 'Allowed reduction for isolated defects (nicks, pinholes, edge roughness).',
    ir_wred: 'Conductor width reduction',
    ir_sred: 'Conductor spacing reduction',
    ir_conflict: 'sources conflict (20–30 %)',
    ir_foil: 'Copper thickness (IPC-4562 / IPC-6012)',
    ir_foilP: 'Minimum values after processing are used for acceptance. External values include plating.',
    ir_weight: 'Weight',
    ir_nominal: 'Nominal foil',
    ir_inner: 'Internal, min after processing',
    ir_outer12: 'External min (Class 1–2)',
    ir_outer3: 'External min (Class 3)',
    ir_other: 'Other rules',
    ir_rule: 'Rule',
    ir_value: 'Value',
    ir_bow: 'Bow and twist',
    ir_bowV: 'Boards with SMT ≤ 0.75 % · others ≤ 1.5 %',
    ir_diel: 'Minimum dielectric between layers (when not specified)',
    ir_dielV: '90 µm (IPC-6012 rev B–E) · 65 µm (rev F, designs after 2024)',
    ir_ar: 'Plated-hole aspect ratio',
    ir_arV: 'Preferred < 5:1 (IPC-2221A); typical fabrication limit 8:1–10:1',
    ir_mv: 'Microvia',
    ir_mvV: 'Aspect ratio ≤ 1:1, depth ≤ 0.25 mm (IPC-T-50M); ≤ 0.8:1 recommended',
    ir_cur: 'IPC-2221 current chart range',
    ir_curV: '≤ 35 A, width ≤ 10.16 mm, ΔT 10–100 °C, 0.5–3 oz; charts derated 10 %',
    ir_hole2hole: 'Laminate between holes',
    ir_hole2holeV: '≥ 0.5 mm (IPC-2221 §9.2.7) and lands must meet §6.3 spacing',
    ir_edge: 'Component to board edge',
    ir_edgeV: 'Preferably ≥ 1.5 mm (IPC-2221 §8.1)',
    ir_spacing: 'Conductor spacing (by voltage)',
    ir_spacingV: 'IPC-2221 Table 6-1 — open the calculator',
    ir_disclaimer: 'Values compiled from the texts of IPC-2221A/B, IPC-2222, IPC-2226 and IPC-6012 (rev C–F) and fabricator guides. The current revision of the standards and your procurement documents always take precedence.',
  },
};

const FOIL = [
  ['½ oz', 17.1, 11.4, 33.4, 38.4],
  ['1 oz', 34.3, 24.9, 47.9, 52.9],
  ['2 oz', 68.6, 55.7, 78.7, 83.7],
  ['3 oz', 102.9, 86.6, 109.6, 114.6],
  ['4 oz', 137.2, 117.5, 139.5, 144.5],
];

const nf = (x) => new Intl.NumberFormat(document.documentElement.lang === 'tr' ? 'tr-TR' : 'en-US').format(x);

function classTable(headKey, rowsData) {
  const head = `<tr><th scope="col">${esc(t(headKey))}</th>${[1, 2, 3].map((n) => `<th scope="col" data-cls="${n}">${esc(t('ir_class', { n }))}</th>`).join('')}</tr>`;
  const body = rowsData.map(([label, ...cells]) => `<tr><th scope="row">${esc(label)}</th>${cells.map((c, i) => `<td data-cls="${i + 1}">${esc(c)}</td>`).join('')}</tr>`).join('');
  return `<div class="table-scroll"><table class="grid left"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

function section(id, titleKey, pKey, inner) {
  return `<section class="card ref-section" id="ref-${id}"><h2>${esc(t(titleKey))}</h2>${pKey ? `<p>${esc(t(pKey))}</p>` : ''}${inner}</section>`;
}

function render(root, hl) {
  const levels = `<div class="table-scroll"><table class="grid left"><thead><tr><th scope="col">${esc(t('ir_param'))}</th><th scope="col">A</th><th scope="col">B</th><th scope="col">C</th></tr></thead><tbody>
    <tr><th scope="row">${esc(t('ir_fab'))}<br><small>${esc(t('ir_fabNote'))}</small></th><td>0,4 mm</td><td>0,25 mm</td><td>0,2 mm</td></tr>
    <tr><th scope="row">${esc(t('ir_lead'))}</th><td>0,25 mm</td><td>0,20 mm</td><td>0,15 mm</td></tr>
    <tr><th scope="row">${esc(t('ir_holeMax'))}</th><td>0,7 mm</td><td>0,7 mm</td><td>0,6 mm</td></tr>
    <tr><th scope="row">${esc(t('ir_widthTol'))}</th><td>±0,10 mm</td><td>±0,08 mm</td><td>±0,05 mm</td></tr>
    <tr><th scope="row">${esc(t('ir_holePos'))}</th><td>0,25 mm</td><td>0,20 mm</td><td>0,15 mm</td></tr>
  </tbody></table></div>`.replace(/(\d),(\d)/g, document.documentElement.lang === 'tr' ? '$1,$2' : '$1.$2');

  const foil = `<div class="table-scroll"><table class="grid"><thead><tr>
      <th scope="col">${esc(t('ir_weight'))}</th><th scope="col">${esc(t('ir_nominal'))}</th><th scope="col">${esc(t('ir_inner'))}</th>
      <th scope="col" data-cls="1" data-cls2="2">${esc(t('ir_outer12'))}</th><th scope="col" data-cls="3">${esc(t('ir_outer3'))}</th></tr></thead><tbody>
      ${FOIL.map(([w, ...v]) => `<tr><th scope="row">${w}</th>${v.map((x, i) => `<td${i === 2 ? ' data-cls="1" data-cls2="2"' : i === 3 ? ' data-cls="3"' : ''}>${nf(x)} µm</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>`;

  const other = `<div class="table-scroll"><table class="grid left"><thead><tr><th scope="col">${esc(t('ir_rule'))}</th><th scope="col">${esc(t('ir_value'))}</th></tr></thead><tbody>
    ${[['ir_bow', 'ir_bowV'], ['ir_diel', 'ir_dielV'], ['ir_ar', 'ir_arV'], ['ir_mv', 'ir_mvV'], ['ir_cur', 'ir_curV'], ['ir_hole2hole', 'ir_hole2holeV'], ['ir_edge', 'ir_edgeV']]
      .map(([a, b]) => `<tr><th scope="row">${esc(t(a))}</th><td>${esc(t(b))}</td></tr>`).join('')}
    <tr><th scope="row">${esc(t('ir_spacing'))}</th><td><a href="#/spacing">${esc(t('ir_spacingV'))}</a></td></tr>
  </tbody></table></div>`;

  root.innerHTML = `
    <header class="page-head">
      <div class="page-title"><h1>${esc(t('tool_ipcref'))}</h1><p class="lead">${esc(t('ir_intro'))}</p></div>
      <div class="field" style="margin:0">
        <span class="label" id="ir-hl">${esc(t('ir_highlight'))}</span>
        <div class="segmented" role="radiogroup" aria-labelledby="ir-hl">
          ${[0, 1, 2, 3].map((n) => `<button type="button" role="radio" aria-checked="${n === hl}" data-hl="${n}">${esc(n ? t('ir_class', { n }) : t('ir_none'))}</button>`).join('')}
        </div>
      </div>
    </header>
    <div class="ref hl-${hl}">
      ${section('classes', 'ir_classes', 'ir_classesP', classTable('ir_param', [['', t('ir_c1'), t('ir_c2'), t('ir_c3')]]))}
      ${section('ring', 'ir_ring', 'ir_ringP', classTable('ir_param', [
        [t('ir_ext'), t('ir_ext1'), t('ir_ext2'), t('ir_ext3')],
        [t('ir_int'), t('ir_int1'), t('ir_int2'), t('ir_int3')],
      ]) + `<p class="note">${icon('info', 14)} ${esc(t('ir_design'))}: ${esc(t('ir_designV'))}</p>`)}
      ${section('plating', 'ir_plating', 'ir_platingP', classTable('ir_param', [
        [t('ir_pth'), '20 / 18 µm', '20 / 18 µm', '25 / 20 µm'],
        [t('ir_micro'), '12 / 10 µm', '12 / 10 µm', '12 / 10 µm'],
        [t('ir_buried'), '13 / 11 µm', '15 / 13 µm', '15 / 13 µm'],
      ]))}
      ${section('reduce', 'ir_reduce', 'ir_reduceP', classTable('ir_param', [
        [t('ir_wred'), '≤ 30 %', '≤ 20 %', '≤ 20 %'],
        [t('ir_sred'), '≤ 30 %', t('ir_conflict'), '≤ 20 %'],
      ]))}
      ${section('levels', 'ir_levels', 'ir_levelsP', levels)}
      ${section('foil', 'ir_foil', 'ir_foilP', foil)}
      ${section('other', 'ir_other', null, other)}
      <p class="note">${esc(t('ir_disclaimer'))}</p>
    </div>`;

  root.querySelector('.segmented').addEventListener('click', (e) => {
    const b = e.target.closest('[data-hl]');
    if (!b) return;
    const n = Number(b.dataset.hl);
    history.replaceState(null, '', `#/ipcref${n ? `?c=${n}` : ''}`);
    render(root, n);
  });
}

export default {
  id: 'ipcref',
  strings,
  mount(root, params) {
    const c = Number(params.get('c'));
    render(root, [1, 2, 3].includes(c) ? c : 0);
  },
};
