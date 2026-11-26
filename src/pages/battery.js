import { averageCurrent, batteryLife } from '../engine/battery.js';
import { heroes, rows, block, steps, messages, invalid } from '../ui/calculator.js';
import { tx } from '../ui/math.js';
import { fmt, fixed, si, siHtml } from '../ui/format.js';
import { svg, text, path, axes, wave } from '../ui/svg.js';
import { t } from '../i18n.js';

const strings = {
  tr: {
    bt_secBat: 'Pil',
    bt_cap: 'Nominal kapasite',
    bt_capInfo: 'Veri sayfasındaki kapasite, belirli bir yük ve kesme gerilimi içindir. Seri bağlı hücrelerde kapasite tek hücreninkidir (gerilim artar).',
    bt_pCr2032: 'CR2032 · 225 mAh',
    bt_pAa: '2×AA alkalin · 2500 mAh',
    bt_p18650: 'Li-ion 18650 · 3000 mAh',
    bt_pLipo: 'LiPo cep · 1000 mAh',
    bt_usable: 'Kullanılabilir oran',
    bt_usableInfo: 'Devrenizin en düşük çalışma gerilimine (kesme) kadar çekilebilen pay; yaşlanma ve darbe yükündeki kayıp da buraya katılır. %80–90 tipik bir başlangıçtır.',
    bt_temp: 'Sıcaklık düzeltmesi',
    bt_tempInfo: 'Çalışma sıcaklığında kullanılabilen kapasite oranı (kaba tahmin). Soğukta iç direnç artar ve kapasite düşer; değeri pil üreticisinin sıcaklık eğrisinden alın.',
    bt_pT25: '25 °C · %100',
    bt_pT0: '0 °C · %80',
    bt_pTm20: '−20 °C · %50',
    bt_sd: 'Kendiliğinden boşalma (yıllık)',
    bt_sdInfo: 'Nominal kapasitenin yılda kaybolan yüzdesi; sabit bir sızıntı akımı gibi hesaba katılır. Tipik: lityum birincil ~%1, alkalin %2–3, Li-ion ayda %1–2 (+ koruma devresi ~%3/ay).',
    bt_pSdLi: 'Li birincil · %1',
    bt_pSdAlk: 'Alkalin · %3',
    bt_pSdLiion: 'Li-ion · %24',
    bt_pSdPcm: 'Li-ion + koruma · %60',
    bt_secProfile: 'Akım profili',
    bt_isl: 'Uyku akımı',
    bt_islInfo: 'Tüm devrenin uyku akımı: mikrodenetleyici, regülatörün sükûnet akımı, bölücüler, sızıntılar. Çoğu zaman pil ömrünü bu belirler.',
    bt_iact: 'Aktif akım',
    bt_tact: 'Aktif süre (her periyotta)',
    bt_per: 'Periyot',
    bt_perInfo: 'Aktif olayın ne sıklıkla tekrarlandığı (uyanma aralığı).',
    bt_secBurst: 'Ek olay (ör. radyo gönderimi)',
    bt_ib: 'Olay akımı',
    bt_tb: 'Olay süresi',
    bt_pb: 'Olay aralığı',
    bt_pbInfo: 'Olay ne sıklıkla tekrarlanıyor. Üç alanı da boşaltırsanız ek olay hesaba katılmaz.',
    bt_life: 'Tahmini pil ömrü',
    bt_iavg: 'Ortalama akım',
    bt_y: 'yıl',
    bt_d: 'gün',
    bt_h: 'saat',
    bt_share: 'Ortalama akımın dağılımı',
    bt_sleep: 'Uyku',
    bt_active: 'Aktif',
    bt_burst: 'Ek olay',
    bt_self: 'Kendiliğinden boşalma (eşdeğer)',
    bt_total: 'Toplam',
    bt_usableCap: 'Kullanılabilir kapasite',
    bt_lifeNoSelf: 'Kendiliğinden boşalma olmadan ömür',
    bt_peak: 'En yüksek akım',
    bt_dAct: 'Aktif görev oranı',
    bt_dEv: 'Ek olay görev oranı',
    bt_perDay: 'Günlük tüketim',
    warn_bt_coinPeak: 'Düğme pilde yüksek darbe akımı: etkin kapasite düşer ve iç direnç (onlarca Ω) gerilimi çökertebilir. Pile paralel bir rezervuar kondansatörü ekleyin ve darbeyi kısaltın (TI SWRA349).',
    warn_bt_long: 'Ömür 10 yılı aşıyor: bu sürede raf ömrü, kendiliğinden boşalma ve yaşlanma belirleyicidir; pilin raf ömrü değerini kontrol edin.',
    warn_bt_selfDom: 'Kendiliğinden boşalma, yük tüketiminin önemli bir kısmı: daha düşük boşalmalı bir kimya (ör. lityum birincil) seçmeyi düşünün.',
    warn_bt_burstPartial: 'Ek olayın üç alanı da dolu olmalı; eksik olduğu için hesaba katılmadı.',
    err_bt_overlap: 'Aktif süreler toplamı periyodu aşıyor: aktif süre periyottan, olay süresi olay aralığından kısa olmalı.',
    bt_note: 'Ortalama akım yöntemi ile tahmin. Gerçek kapasite yük akımına, darbe biçimine, kesme gerilimine ve sıcaklığa bağlıdır; kendiliğinden boşalma doğrusal bir sızıntı olarak modellenmiştir. Kritik ürünlerde akım profilini ölçün (ör. güç profili analizörü) ve pil üreticisinin eğrileriyle doğrulayın.',
    bt_dgAria: 'Bir periyotta akım profili, logaritmik akım ekseninde, ortalama akım çizgisiyle',
    bt_dgWide: 'kısa darbeler görünür olsun diye genişletildi',
    bt_dgEvery: 'her {t}',
  },
  en: {
    bt_secBat: 'Battery',
    bt_cap: 'Nominal capacity',
    bt_capInfo: 'Datasheet capacity applies to a given load and cut-off voltage. For cells in series the capacity is that of one cell (the voltage adds up).',
    bt_pCr2032: 'CR2032 · 225 mAh',
    bt_pAa: '2×AA alkaline · 2500 mAh',
    bt_p18650: 'Li-ion 18650 · 3000 mAh',
    bt_pLipo: 'LiPo pouch · 1000 mAh',
    bt_usable: 'Usable fraction',
    bt_usableInfo: 'The part you can draw before your circuit’s minimum operating voltage (cut-off), including ageing and pulse-load losses. 80–90 % is a typical start.',
    bt_temp: 'Temperature factor',
    bt_tempInfo: 'The fraction of capacity available at the operating temperature (rough estimate). In the cold the internal resistance rises and the capacity falls; take the value from the cell maker’s temperature curve.',
    bt_pT25: '25 °C · 100 %',
    bt_pT0: '0 °C · 80 %',
    bt_pTm20: '−20 °C · 50 %',
    bt_sd: 'Self-discharge per year',
    bt_sdInfo: 'Percentage of the nominal capacity lost per year; treated as a constant leakage current. Typical: lithium primary ~1 %, alkaline 2–3 %, Li-ion 1–2 % per month (+ ~3 %/month for a protection circuit).',
    bt_pSdLi: 'Li primary · 1 %',
    bt_pSdAlk: 'Alkaline · 3 %',
    bt_pSdLiion: 'Li-ion · 24 %',
    bt_pSdPcm: 'Li-ion + protection · 60 %',
    bt_secProfile: 'Current profile',
    bt_isl: 'Sleep current',
    bt_islInfo: 'Sleep current of the whole circuit: microcontroller, regulator quiescent current, dividers, leakage. It often decides the battery life.',
    bt_iact: 'Active current',
    bt_tact: 'Active time (each period)',
    bt_per: 'Period',
    bt_perInfo: 'How often the active event repeats (wake-up interval).',
    bt_secBurst: 'Extra event (e.g. radio transmit)',
    bt_ib: 'Event current',
    bt_tb: 'Event duration',
    bt_pb: 'Event interval',
    bt_pbInfo: 'How often the event repeats. Clear all three fields to leave the extra event out.',
    bt_life: 'Estimated battery life',
    bt_iavg: 'Average current',
    bt_y: 'years',
    bt_d: 'days',
    bt_h: 'hours',
    bt_share: 'Average current breakdown',
    bt_sleep: 'Sleep',
    bt_active: 'Active',
    bt_burst: 'Extra event',
    bt_self: 'Self-discharge (equivalent)',
    bt_total: 'Total',
    bt_usableCap: 'Usable capacity',
    bt_lifeNoSelf: 'Life without self-discharge',
    bt_peak: 'Peak current',
    bt_dAct: 'Active duty cycle',
    bt_dEv: 'Extra-event duty cycle',
    bt_perDay: 'Consumption per day',
    warn_bt_coinPeak: 'High pulse current from a coin cell: the effective capacity drops and the internal resistance (tens of Ω) can collapse the voltage. Add a reservoir capacitor across the cell and shorten the pulse (TI SWRA349).',
    warn_bt_long: 'Life beyond 10 years: shelf life, self-discharge and ageing dominate over such times; check the cell’s shelf-life rating.',
    warn_bt_selfDom: 'Self-discharge is a large part of the consumption: consider a chemistry with lower self-discharge (e.g. lithium primary).',
    warn_bt_burstPartial: 'All three extra-event fields are needed; it was left out because one is empty.',
    err_bt_overlap: 'The active times exceed the period: the active time must be shorter than the period, and the event duration shorter than its interval.',
    bt_note: 'Average-current estimate. Real capacity depends on load current, pulse shape, cut-off voltage and temperature; self-discharge is modelled as a linear leakage. For critical products measure the current profile (e.g. with a power profiler) and check against the cell maker’s curves.',
    bt_dgAria: 'Current profile over one period on a logarithmic current axis with the average current line',
    bt_dgWide: 'short pulses widened so they are visible',
    bt_dgEvery: 'every {t}',
  },
};

const I_MUL = { nA: 1e-9, uA: 1e-6, mA: 1e-3, A: 1 };
const T_MUL = { us: 1e-6, ms: 1e-3, s: 1, min: 60, h: 3600 };
const has = (x) => Number.isFinite(x) && x > 0;

function inputs(v, u) {
  const burstFields = [v.ib, v.tb, v.pb];
  const nBurst = burstFields.filter(has).length;
  return {
    iSleep: v.isl * I_MUL[u.isl],
    iAct: v.iact * I_MUL[u.iact],
    tAct: v.tact * T_MUL[u.tact],
    period: v.per * T_MUL[u.per],
    iBurst: nBurst === 3 ? v.ib * I_MUL[u.ib] : 0,
    tBurst: nBurst === 3 ? v.tb * T_MUL[u.tb] : 0,
    burstPeriod: nBurst === 3 ? v.pb * T_MUL[u.pb] : 0,
    partial: nBurst > 0 && nBurst < 3,
  };
}

/** Battery life with a unit that keeps the number readable. */
function lifeParts(hours) {
  if (hours >= 24 * 365.25) return [fmt(hours / 8766, 3), 'bt_y', `${fmt(hours / 24, 4)} ${t('bt_d')}`];
  if (hours >= 48) return [fmt(hours / 24, 3), 'bt_d', `${fmt(hours, 4)} ${t('bt_h')}`];
  return [fmt(hours, 3), 'bt_h', ''];
}
const lifeText = (hours) => { const [n, k] = lifeParts(hours); return `${n} ${t(k)}`; };
const timeText = (s) => (s >= 7200 ? `${fmt(s / 3600, 3)} h` : s >= 120 ? `${fmt(s / 60, 3)} min` : si(s, 's', 3));

/**
 * Live picture: the current over a window of one or more periods on a log
 * axis (sleep floor, active pulses, the extra event) and the average current.
 * Pulses shorter than 3 px are widened and marked.
 */
function diagram(v, u, r) {
  const x0 = 66;
  const y0 = 172;
  const W = 312;
  const H = 136;
  const p = inputs(v, u);
  const ok = !!r && has(p.period) && has(p.tAct) && has(p.iAct);
  const T = ok ? p.period : 1;
  const tA = ok ? p.tAct : 0.05;
  const iS = ok ? Math.max(p.iSleep, 1e-9) : 2e-6;
  const iA = ok ? p.iAct : 5e-3;
  const burst = ok && p.burstPeriod > 0;
  const Tb = burst ? p.burstPeriod : 0;
  const win = burst ? Math.min(Math.max(T, Tb), 10 * Math.min(T, Tb)) : T;
  const iMax = Math.max(iA, burst ? p.iBurst : 0);
  const lo = 10 ** Math.floor(Math.log10(Math.min(iS, r?.iAvg ?? iS) * 0.95));
  let hi = 10 ** Math.ceil(Math.log10(iMax * 1.05));
  if (hi / lo < 100) hi = lo * 100;
  const Y = (i) => y0 - ((Math.log10(Math.max(i, lo)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * H;
  const X = (tt) => x0 + (W * tt) / win;
  let widened = false;
  const events = [];
  const add = (start, dur, i, kind) => {
    let w = (W * dur) / win;
    if (w < 3) { w = 3; widened = true; }
    events.push({ xs: X(start), xe: X(start) + w, i, kind });
  };
  for (let k = 0; k * T < win - 1e-12 && k < 12; k++) add(k * T + 0.06 * T, tA, iA, 'act');
  if (burst) {
    const off = 0.5 * Math.min(T, Tb);
    for (let j = 0; j === 0 || (j * Tb + off < win && j < 12); j++) add(j * Tb + off, p.tBurst, p.iBurst, 'burst');
  }
  events.sort((a, c) => a.xs - c.xs);
  const pts = [[x0, Y(iS)]];
  let xPrev = x0;
  for (const e of events) {
    const xs = Math.max(e.xs, xPrev);
    const xe = Math.min(Math.max(e.xe, xs + 1), x0 + W);
    pts.push([xs, Y(iS)], [xs, Y(e.i)], [xe, Y(e.i)], [xe, Y(iS)]);
    xPrev = xe;
  }
  pts.push([x0 + W, Y(iS)]);

  let b = '';
  for (let e = Math.log10(lo); e <= Math.log10(hi) + 1e-9; e++) {
    const y = Y(10 ** e);
    b += path(`M${x0},${y}H${x0 + W}`, 'grid-l') + text(x0 - 5, y + 4, si(10 ** e, 'A', 1), { anchor: 'end' });
  }
  b += axes(x0, y0, W + 8, H + 10) + text(x0 - 5, y0 - H - 14, 'I (log)', { cls: 'sym', anchor: 'end' })
    + wave(pts);
  if (r) {
    const ya = Y(r.iAvg);
    b += wave([[x0, ya], [x0 + W, ya]], 'wave2')
      + wave([[x0 + 40, 16], [x0 + 62, 16]], 'wave2')
      + text(x0 + 67, 20, `I_avg = ${si(r.iAvg, 'A', 3)}`, { cls: 'val', anchor: 'start' });
  }
  // Level values right of the plot, pushed apart so they never overlap.
  const levels = [[iS, 'lbl']];
  if (events.some((e) => e.kind === 'act')) levels.push([iA, 'val']);
  if (events.some((e) => e.kind === 'burst') && Math.abs(Math.log10(p.iBurst / iA)) > 1e-3) levels.push([p.iBurst, 'val']);
  levels.sort((a, c) => Y(c[0]) - Y(a[0]));
  let yPrev = Infinity;
  for (const [i, cls] of levels) {
    const y = Math.min(Y(i) + 4, yPrev - 13);
    b += text(x0 + W + 5, y, si(i, 'A', 3), { cls, anchor: 'start' });
    yPrev = y;
  }
  if (burst && Tb > win) b += text(x0 + W, 20, t('bt_dgEvery', { t: timeText(Tb) }), { anchor: 'end' });
  b += text(x0 + W, y0 + 16, `t = 0 … ${timeText(win)}`, { anchor: 'end' });
  if (widened) b += text(x0, y0 + 16, `* ${t('bt_dgWide')}`, { anchor: 'start' });
  return svg(440, 196, b, t('bt_dgAria'), { wide: true });
}

/**
 * Calculation steps: duty cycles, the average current, the usable capacity,
 * the equivalent self-discharge current and the life. Capacities are shown in
 * mAh and the life in hours (mAh / mA = h), then in the unit of the headline.
 */
function worked(r, v, u) {
  const p = inputs(v, u);
  const A = (x) => tx(si(x, 'A'));
  const s = (x) => tx(si(x, 's'));
  const num = (x) => tx(fmt(x, 4));
  const pct = (x) => tx(`${fmt(x, 4)} %`);
  const mAh = (ah) => tx(`${fmt(ah * 1000, 4)} mAh`);
  const hours = tx(`${fmt(r.hours, 4)} h`);
  const dAct = num(r.dAct);
  const dEv = num(r.dBurst);
  return steps([
    { label: 'bt_dAct', sym: 'D_{act} = \\frac{t_{act}}{T}', num: `\\frac{${s(p.tAct)}}{${s(p.period)}}`, res: dAct },
    r.hasBurst && { label: 'bt_dEv', sym: 'D_{ev} = \\frac{t_{ev}}{T_{ev}}', num: `\\frac{${s(p.tBurst)}}{${s(p.burstPeriod)}}`, res: dEv },
    r.hasBurst
      ? { label: 'bt_iavg', sym: 'I_{avg} = I_{sleep} \\cdot (1 − D_{act} − D_{ev}) + I_{act} \\cdot D_{act} + I_{ev} \\cdot D_{ev}',
        num: `${A(p.iSleep)} \\cdot (1 − ${dAct} − ${dEv}) + ${A(p.iAct)} \\cdot ${dAct} + ${A(p.iBurst)} \\cdot ${dEv}`, res: A(r.iAvg) }
      : { label: 'bt_iavg', sym: 'I_{avg} = I_{sleep} \\cdot (1 − D_{act}) + I_{act} \\cdot D_{act}',
        num: `${A(p.iSleep)} \\cdot (1 − ${dAct}) + ${A(p.iAct)} \\cdot ${dAct}`, res: A(r.iAvg) },
    { label: 'bt_usableCap', sym: 'C_{usable} = C_{nom} \\cdot k_u \\cdot k_T', num: `${mAh(r.capAh)} \\cdot ${pct(v.use)} \\cdot ${pct(v.temp)}`, res: mAh(r.usableAh) },
    { label: 'bt_self', sym: `I_{self} = \\frac{C_{nom} \\cdot k_{sd}}{${tx('8766 h')}}`, num: `\\frac{${mAh(r.capAh)} \\cdot ${pct(v.sd)}}{${tx('8766 h')}}`, res: A(r.iSelf) },
    { label: 'bt_life', sym: 't_{life} = \\frac{C_{usable}}{I_{avg} + I_{self}}', num: `\\frac{${mAh(r.usableAh)}}{${A(r.iAvg)} + ${A(r.iSelf)}}`,
      res: r.hours >= 48 ? `${hours} = ${tx(lifeText(r.hours))}` : hours },
  ], {
    note: 'bt_note',
    where: [['t_{act}', 'bt_tact', 'tact'], ['T', 'bt_per', 'per'], ['I_{sleep}', 'bt_isl', 'isl'], ['I_{act}', 'bt_iact', 'iact'],
      r.hasBurst && ['I_{ev}', 'bt_ib', 'ib'], r.hasBurst && ['t_{ev}', 'bt_tb', 'tb'], r.hasBurst && ['T_{ev}', 'bt_pb', 'pb'],
      ['C_{nom}', 'bt_cap', 'cap'], ['k_u', 'bt_usable', 'use'], ['k_T', 'bt_temp', 'temp'], ['k_{sd}', 'bt_sd', 'sd']],
    refs: [
      'Panasonic CR2032 datasheet (225 mAh)',
      'Battery University BU-802b (self-discharge)',
      'TI SWRA349 “Coin cells and peak current draw”',
    ],
  });
}

const preset = (label, value, unit) => ({ label, value, unit, raw: false });

export default {
  diagram,
  id: 'battery',
  strings,
  sections: [
    {
      title: 'bt_secBat',
      fields: [
        { key: 'cap', type: 'number', label: 'bt_cap', default: 225, units: ['mAh', 'Ah'], info: 'bt_capInfo',
          presets: [preset('bt_pCr2032', 225, 'mAh'), preset('bt_pAa', 2500, 'mAh'), preset('bt_p18650', 3000, 'mAh'), preset('bt_pLipo', 1000, 'mAh')] },
        { key: 'use', type: 'number', label: 'bt_usable', default: 85, units: ['pct'], max: 100, info: 'bt_usableInfo' },
        { key: 'temp', type: 'number', label: 'bt_temp', default: 100, units: ['pct'], max: 100, info: 'bt_tempInfo',
          presets: [preset('bt_pT25', 100), preset('bt_pT0', 80), preset('bt_pTm20', 50)] },
        { key: 'sd', type: 'number', label: 'bt_sd', default: 1, units: ['pct'], valid: 'nonneg', max: 100, info: 'bt_sdInfo',
          presets: [preset('bt_pSdLi', 1), preset('bt_pSdAlk', 3), preset('bt_pSdLiion', 24), preset('bt_pSdPcm', 60)] },
      ],
    },
    {
      title: 'bt_secProfile',
      fields: [
        { key: 'isl', type: 'number', label: 'bt_isl', default: 2, units: ['uA', 'nA', 'mA'], valid: 'nonneg', info: 'bt_islInfo' },
        { key: 'iact', type: 'number', label: 'bt_iact', default: 5, units: ['mA', 'uA', 'A'] },
        { key: 'tact', type: 'number', label: 'bt_tact', default: 20, units: ['ms', 'us', 's'] },
        { key: 'per', type: 'number', label: 'bt_per', default: 10, units: ['s', 'ms', 'min', 'h'], info: 'bt_perInfo' },
      ],
    },
    {
      title: 'bt_secBurst',
      optional: true,
      fields: [
        { key: 'ib', type: 'number', label: 'bt_ib', default: 15, units: ['mA', 'uA', 'A'], optional: true },
        { key: 'tb', type: 'number', label: 'bt_tb', default: 3, units: ['ms', 'us', 's'], optional: true },
        { key: 'pb', type: 'number', label: 'bt_pb', default: 60, units: ['s', 'min', 'h'], optional: true, info: 'bt_pbInfo' },
      ],
    },
  ],

  compute(v, u) {
    const p = inputs(v, u);
    const avg = averageCurrent(p);
    if (!avg.ok) return avg;
    const capAh = v.cap * (u.cap === 'Ah' ? 1 : 1e-3);
    const life = batteryLife({ capacityAh: capAh, usable: v.use / 100, tempFactor: v.temp / 100, selfPerYear: (v.sd || 0) / 100, iAvg: avg.iAvg });
    const r = { ok: true, ...avg, ...life, capAh, warnings: [] };
    if (p.partial) r.warnings.push('bt_burstPartial');
    if (capAh <= 0.3 && r.iPeak > 15e-3) r.warnings.push('bt_coinPeak');
    if (r.years > 10) r.warnings.push('bt_long');
    if (r.selfShare > 0.3) r.warnings.push('bt_selfDom');
    return r;
  },

  render(r, v, u) {
    if (!r.ok) return invalid(r.errors);
    const [n, k, sub] = lifeParts(r.hours);
    const tot = r.iAvg + r.iSelf;
    const share = (i) => `${si(i, 'A', 3)} · ${fixed((100 * i) / tot, 1)} %`;
    return heroes([
      ['bt_life', `${n} <span class="u">${t(k)}</span>`, sub],
      ['bt_iavg', siHtml(r.iAvg, 'A', 3)],
    ])
      + messages('warn', r.warnings)
      + worked(r, v, u)
      + block('bt_share', rows([
        ['bt_sleep', share(r.parts.sleep)],
        ['bt_active', share(r.parts.act)],
        r.hasBurst && ['bt_burst', share(r.parts.burst)],
        ['bt_self', share(r.iSelf)],
        ['bt_total', si(tot, 'A', 4), true],
      ]))
      + block('results', rows([
        ['bt_usableCap', `${fmt(r.usableAh * 1000, 4)} mAh`],
        ['bt_lifeNoSelf', lifeText(r.hoursNoSelf)],
        ['bt_peak', si(r.iPeak, 'A', 3)],
        ['bt_dAct', `${fmt(r.dAct * 100, 3)} %`],
        ['bt_perDay', `${fmt(tot * 24 * 1000, 3)} mAh`],
      ]));
  },
};
