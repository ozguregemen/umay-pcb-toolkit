// Minimal i18n. Core strings live here; each page module registers its own
// strings with registerStrings(). `t(key, vars)` supports {placeholders}.

const tr = {
  appName: 'Umay PCB Toolkit',
  tagline: 'Donanım tasarım mühendisleri için açık kaynak PCB ve elektronik hesaplayıcılar',
  skip: 'İçeriğe geç',
  menu: 'Menü',
  home: 'Ana sayfa',
  search: 'Ara',
  searchPlaceholder: 'Hesaplayıcı ara… (ör. empedans, via, LED)',
  searchHint: 'Aramak için Ctrl K',
  noResults: 'Sonuç yok',
  langToggle: 'EN',
  langToggleTitle: 'Switch to English',
  themeToggleTitle: 'Açık/koyu tema',
  unitsMetric: 'mm',
  unitsImperial: 'mil',
  unitsToggleTitle: 'Varsayılan uzunluk birimi (mm / mil)',
  sourceCode: 'Kaynak kod',
  testsLink: 'Motor testleri',
  methodology: 'Yöntem ve kaynaklar',
  disclaimer:
    'Sonuçlar tasarım kararlarına yardımcı olacak mühendislik tahminleridir. Kritik tasarımlarda resmi IPC standartlarını ve üreticinizin kurallarını esas alın.',
  loadError: 'Sayfa yüklenemedi. Bağlantınızı kontrol edip yenileyin.',
  notFound: 'Böyle bir hesaplayıcı yok.',

  catPcb: 'PCB ve IPC kuralları',
  catSi: 'Sinyal bütünlüğü',
  catPower: 'Güç ve termal',
  catCircuit: 'Temel devre',
  catTools: 'Araçlar',

  tool_trace: 'İz genişliği ve akım',
  tool_trace_desc: 'IPC-2152 ve IPC-2221 ile akım kapasitesi, sıcaklık artışı ve DC kayıplar; iki yönlü çözüm.',
  tool_spacing: 'İletken aralığı',
  tool_spacing_desc: 'IPC-2221 Tablo 6-1: gerilime göre minimum aralık ya da aralığa göre izin verilen gerilim.',
  tool_via: 'Via',
  tool_via_desc: 'DC direnç, akım kapasitesi, ısıl direnç, parazitik L/C ve paralel via sayısı.',
  tool_padstack: 'Pad ve halka',
  tool_padstack_desc: 'IPC-2221/2222 pad çapı ve delik boyutu, IPC-6012 sınıf kontrolleri.',
  tool_fusing: 'Eritme akımı',
  tool_fusing_desc: 'Onderdonk ve Preece ile iz veya via için eritme akımı ve süresi.',
  tool_ipcref: 'IPC kuralları özeti',
  tool_ipcref_desc: 'Sınıflara göre halka, kaplama, eğilme, dielektrik ve diğer kabul kriterleri.',
  tool_impedance: 'Empedans',
  tool_impedance_desc: 'Microstrip, gömülü microstrip, stripline, CPWG ve diferansiyel çiftler; kayıp ve gecikme.',
  tool_signal: 'Sinyal bütünlüğü temelleri',
  tool_signal_desc: 'Yükselme süresi, bant genişliği, kritik uzunluk, dalga boyu, deri kalınlığı ve skew.',
  tool_crosstalk: 'Karışma (crosstalk)',
  tool_crosstalk_desc: 'Komşu izler arası yakın uç karışma tahmini ve aralık önerisi.',
  tool_pdn: 'PDN ve dekuplaj',
  tool_pdn_desc: 'Hedef empedans, bulk kapasite ve kondansatör bankasının empedans grafiği.',
  tool_thermal: 'Termal ve bağlantı sıcaklığı',
  tool_thermal_desc: 'Bağlantı sıcaklığı, gerekli soğutucu ısıl direnci, lineer regülatör kaybı.',
  tool_ohm: 'Ohm yasası ve güç',
  tool_ohm_desc: 'Bilinen iki büyüklükten gerilim, akım, direnç ve gücü bulun.',
  tool_divider: 'Gerilim bölücü',
  tool_divider_desc: 'Çıkış gerilimi, yük etkisi ve hedef gerilim için E-serisi direnç seçimi.',
  tool_led: 'LED direnci',
  tool_led_desc: 'Seri direnç değeri, standart değer, direnç ve LED güç kaybı.',
  tool_rc: 'RC / RL / LC',
  tool_rc_desc: 'Zaman sabiti, kesim frekansı, reaktans ve rezonans.',
  tool_eseries: 'E-serisi değer bulucu',
  tool_eseries_desc: 'En yakın standart değerler ve hedefe en yakın iki dirençli kombinasyon.',
  tool_units: 'Birim dönüştürücü',
  tool_units_desc: 'Uzunluk, bakır ağırlığı, sıcaklık, dB/dBm/W ve AWG dönüşümleri.',

  homeTitle: 'Donanım tasarımında ihtiyaç duyduğunuz hesaplar, tek yerde',
  homeLead:
    'IPC kurallarına dayalı PCB hesapları, sinyal bütünlüğü, güç ve temel devre araçları. Kurulum yok, veri cihazınızdan çıkmaz, her sonuçla formülü ve geçerlilik uyarıları görünür.',
  homeRecent: 'Son kullanılanlar',
  homeAll: 'Tüm hesaplayıcılar',
  homeOpen: 'Aç',

  // Calculator framework
  results: 'Sonuçlar',
  formula: 'Formül',
  warnings: 'Uyarılar',
  copyLink: 'Bağlantı',
  copyLinkTitle: 'Girdileri içeren bağlantıyı kopyala',
  copySummary: 'Özet',
  copySummaryTitle: 'Girdi ve sonuçları metin olarak kopyala',
  print: 'Yazdır',
  printTitle: 'Rapor olarak yazdır / PDF kaydet',
  reset: 'Sıfırla',
  resetTitle: 'Varsayılan değerlere dön',
  copied: 'Kopyalandı',
  copyValue: 'Değeri kopyala',
  inputs: 'Girdiler',
  optional: 'isteğe bağlı',
  moreInfo: 'Açıklama',
  inputsInvalid: 'Hesaplamak için işaretli alanları düzeltin.',
  showResult: 'Sonuca git',
  summaryInputs: 'Girdiler',
  summaryResults: 'Sonuçlar',
  printedAt: 'Oluşturulma',
  fe_number: 'Geçerli bir sayı girin.',
  fe_required: 'Bu alan gerekli.',
  fe_positive: 'Sıfırdan büyük olmalı.',
  fe_nonneg: 'Negatif olamaz.',
  fe_min: 'En az {min} olmalı.',
  fe_max: 'En fazla {max} olmalı.',
  fe_integer: 'Tam sayı olmalı.',
  siHint: 'SI önekleri kullanılabilir: 4k7, 100n, 2.2µ, 1M',

  // Shared field labels
  sectionSetup: 'Kurulum',
  sectionInputs: 'Girdiler',
  sectionDc: 'DC analiz',
  sectionEnv: 'Ortam',
  mode: 'Hesap yönü',
  standard: 'Standart',
  pcbClass: 'IPC sınıfı',
  classN: 'Sınıf {n}',
  layer: 'Katman',
  external: 'Dış katman',
  internal: 'İç katman',
  current: 'Akım',
  voltage: 'Gerilim',
  resistance: 'Direnç',
  power: 'Güç',
  frequency: 'Frekans',
  tempRise: 'Sıcaklık artışı',
  ambientTemp: 'Ortam sıcaklığı',
  copperThickness: 'Bakır kalınlığı',
  traceWidth: 'İz genişliği',
  traceLength: 'İz uzunluğu',
  boardThickness: 'Kart kalınlığı',
  voltageDrop: 'Gerilim düşümü',
  powerLoss: 'Güç kaybı',
  conductorTemp: 'İletken sıcaklığı',
  dielectricConstant: 'Dielektrik sabiti (εr)',
};

const en = {
  appName: 'Umay PCB Toolkit',
  tagline: 'Open-source PCB and electronics calculators for hardware design engineers',
  skip: 'Skip to content',
  menu: 'Menu',
  home: 'Home',
  search: 'Search',
  searchPlaceholder: 'Search calculators… (e.g. impedance, via, LED)',
  searchHint: 'Ctrl K to search',
  noResults: 'No results',
  langToggle: 'TR',
  langToggleTitle: 'Türkçeye geç',
  themeToggleTitle: 'Light/dark theme',
  unitsMetric: 'mm',
  unitsImperial: 'mil',
  unitsToggleTitle: 'Default length unit (mm / mil)',
  sourceCode: 'Source code',
  testsLink: 'Engine tests',
  methodology: 'Method and sources',
  disclaimer:
    'Results are engineering estimates to support design decisions. For critical designs, rely on the official IPC standards and your fabricator’s rules.',
  loadError: 'The page could not be loaded. Check your connection and reload.',
  notFound: 'No such calculator.',

  catPcb: 'PCB & IPC rules',
  catSi: 'Signal integrity',
  catPower: 'Power & thermal',
  catCircuit: 'Circuit basics',
  catTools: 'Tools',

  tool_trace: 'Trace width & current',
  tool_trace_desc: 'Current capacity, temperature rise and DC losses with IPC-2152 and IPC-2221; solves both ways.',
  tool_spacing: 'Conductor spacing',
  tool_spacing_desc: 'IPC-2221 Table 6-1: minimum spacing for a voltage, or allowed voltage for a spacing.',
  tool_via: 'Via',
  tool_via_desc: 'DC resistance, current capacity, thermal resistance, parasitic L/C and via count.',
  tool_padstack: 'Pad & annular ring',
  tool_padstack_desc: 'IPC-2221/2222 land and hole size, IPC-6012 class checks.',
  tool_fusing: 'Fusing current',
  tool_fusing_desc: 'Fusing current and time for a trace or via (Onderdonk and Preece).',
  tool_ipcref: 'IPC rules reference',
  tool_ipcref_desc: 'Annular ring, plating, bow & twist, dielectric and other acceptance criteria by class.',
  tool_impedance: 'Impedance',
  tool_impedance_desc: 'Microstrip, embedded microstrip, stripline, CPWG and differential pairs; loss and delay.',
  tool_signal: 'Signal integrity basics',
  tool_signal_desc: 'Rise time, bandwidth, critical length, wavelength, skin depth and skew.',
  tool_crosstalk: 'Crosstalk',
  tool_crosstalk_desc: 'Near-end crosstalk estimate between adjacent traces and spacing guidance.',
  tool_pdn: 'PDN & decoupling',
  tool_pdn_desc: 'Target impedance, bulk capacitance and an impedance plot of the capacitor bank.',
  tool_thermal: 'Thermal & junction temperature',
  tool_thermal_desc: 'Junction temperature, required heatsink thermal resistance, linear regulator loss.',
  tool_ohm: 'Ohm’s law & power',
  tool_ohm_desc: 'Find voltage, current, resistance and power from any two known values.',
  tool_divider: 'Voltage divider',
  tool_divider_desc: 'Output voltage, loading effect and E-series resistor choice for a target voltage.',
  tool_led: 'LED resistor',
  tool_led_desc: 'Series resistor value, standard value, resistor and LED dissipation.',
  tool_rc: 'RC / RL / LC',
  tool_rc_desc: 'Time constant, cutoff frequency, reactance and resonance.',
  tool_eseries: 'E-series value finder',
  tool_eseries_desc: 'Nearest standard values and the best two-resistor combination for a target.',
  tool_units: 'Unit converter',
  tool_units_desc: 'Length, copper weight, temperature, dB/dBm/W and AWG conversions.',

  homeTitle: 'The calculations hardware design needs, in one place',
  homeLead:
    'PCB calculations based on IPC rules, plus signal integrity, power and circuit tools. Nothing to install, no data leaves your device, and every result shows its formula and validity warnings.',
  homeRecent: 'Recently used',
  homeAll: 'All calculators',
  homeOpen: 'Open',

  results: 'Results',
  formula: 'Formula',
  warnings: 'Warnings',
  copyLink: 'Link',
  copyLinkTitle: 'Copy a link that includes the inputs',
  copySummary: 'Summary',
  copySummaryTitle: 'Copy inputs and results as text',
  print: 'Print',
  printTitle: 'Print as a report / save as PDF',
  reset: 'Reset',
  resetTitle: 'Back to default values',
  copied: 'Copied',
  copyValue: 'Copy value',
  inputs: 'Inputs',
  optional: 'optional',
  moreInfo: 'Explanation',
  inputsInvalid: 'Fix the highlighted fields to calculate.',
  showResult: 'Go to result',
  summaryInputs: 'Inputs',
  summaryResults: 'Results',
  printedAt: 'Generated',
  fe_number: 'Enter a valid number.',
  fe_required: 'This field is required.',
  fe_positive: 'Must be greater than zero.',
  fe_nonneg: 'Cannot be negative.',
  fe_min: 'Must be at least {min}.',
  fe_max: 'Must be at most {max}.',
  fe_integer: 'Must be a whole number.',
  siHint: 'SI prefixes allowed: 4k7, 100n, 2.2µ, 1M',

  sectionSetup: 'Setup',
  sectionInputs: 'Inputs',
  sectionDc: 'DC analysis',
  sectionEnv: 'Environment',
  mode: 'Solve for',
  standard: 'Standard',
  pcbClass: 'IPC class',
  classN: 'Class {n}',
  layer: 'Layer',
  external: 'External',
  internal: 'Internal',
  current: 'Current',
  voltage: 'Voltage',
  resistance: 'Resistance',
  power: 'Power',
  frequency: 'Frequency',
  tempRise: 'Temperature rise',
  ambientTemp: 'Ambient temperature',
  copperThickness: 'Copper thickness',
  traceWidth: 'Trace width',
  traceLength: 'Trace length',
  boardThickness: 'Board thickness',
  voltageDrop: 'Voltage drop',
  powerLoss: 'Power loss',
  conductorTemp: 'Conductor temperature',
  dielectricConstant: 'Dielectric constant (εr)',
};

const DICTS = { tr, en };
const STORAGE_KEY = 'umay.lang';
const listeners = new Set();

function detect() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DICTS[saved]) return saved;
  } catch { /* storage unavailable */ }
  const nav = (typeof navigator !== 'undefined' && navigator.language || 'en').toLowerCase();
  return nav.startsWith('tr') ? 'tr' : 'en';
}

let lang = typeof localStorage !== 'undefined' ? detect() : 'en';

export const getLang = () => lang;
export const locale = () => (lang === 'tr' ? 'tr-TR' : 'en-US');

export function setLang(next) {
  if (!DICTS[next] || next === lang) return;
  lang = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  document.documentElement.lang = next;
  listeners.forEach((fn) => fn(next));
}

export const onLangChange = (fn) => listeners.add(fn);

/** Merge page-specific strings: { tr: {...}, en: {...} }. */
export function registerStrings(dicts) {
  for (const l of Object.keys(DICTS)) Object.assign(DICTS[l], dicts?.[l] ?? {});
}

export function t(key, vars) {
  let s = DICTS[lang][key] ?? DICTS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

/** Look up a key in a specific language (used by search across languages). */
export const tIn = (l, key) => DICTS[l]?.[key] ?? key;

export const dictionaries = DICTS;
