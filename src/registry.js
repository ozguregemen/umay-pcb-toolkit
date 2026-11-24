// Tool catalogue. Metadata lives here so navigation and search work without
// loading every calculator; the page module itself is imported on demand.

export const CATEGORIES = [
  { id: 'pcb', title: 'catPcb', icon: 'board' },
  { id: 'si', title: 'catSi', icon: 'wave' },
  { id: 'power', title: 'catPower', icon: 'bolt' },
  { id: 'circuit', title: 'catCircuit', icon: 'resistor' },
  { id: 'tools', title: 'catTools', icon: 'swap' },
];

/**
 * keywords: extra search terms (both languages, lower case).
 * load(): dynamic import of the page module (default export = page definition).
 */
export const TOOLS = [
  { id: 'trace', cat: 'pcb', icon: 'trace', keywords: 'ipc-2152 ipc-2221 akım current ampacity width genişlik iz track sıcaklık temperature rise',
    load: () => import('./pages/trace.js') },
  { id: 'spacing', cat: 'pcb', icon: 'spacing', keywords: 'clearance aralık boşluk gerilim voltage table 6-1 creepage izolasyon',
    load: () => import('./pages/spacing.js') },
  { id: 'via', cat: 'pcb', icon: 'via', keywords: 'via delik hole barrel plating kaplama thermal termal inductance endüktans capacitance',
    load: () => import('./pages/via.js') },
  { id: 'padstack', cat: 'pcb', icon: 'pad', keywords: 'pad land annular ring halka delik hole drill ipc-2222 ipc-7251 ipc-6012 through-hole',
    load: () => import('./pages/padstack.js') },
  { id: 'fanout', cat: 'pcb', icon: 'fanout', keywords: 'fanout bga pitch adım pad arası iz geçişi routing channel between pads escape',
    load: () => import('./pages/fanout.js') },
  { id: 'fusing', cat: 'pcb', icon: 'fuse', keywords: 'fusing eritme sigorta onderdonk preece kısa devre short circuit melt',
    load: () => import('./pages/fusing.js') },
  { id: 'ipcref', cat: 'pcb', icon: 'book', keywords: 'ipc-6012 class sınıf kural rules acceptance kabul bow twist plating annular dielectric',
    load: () => import('./pages/ipcref.js') },
  { id: 'impedance', cat: 'si', icon: 'impedance', keywords: 'impedance empedans microstrip stripline cpwg coplanar differential diferansiyel usb ddr 50 90 100 ohm',
    load: () => import('./pages/impedance.js') },
  { id: 'signal', cat: 'si', icon: 'wave', keywords: 'rise time yükselme bandwidth bant genişliği wavelength dalga boyu skin depth deri critical length kritik skew delay gecikme',
    load: () => import('./pages/signal.js') },
  { id: 'crosstalk', cat: 'si', icon: 'crosstalk', keywords: 'crosstalk karışma next fext 3w coupling kuplaj',
    load: () => import('./pages/crosstalk.js') },
  { id: 'reflection', cat: 'si', icon: 'reflect', keywords: 'reflection yansıma vswr return loss geri dönüş kaybı gamma mismatch uyumsuzluk',
    load: () => import('./pages/reflection.js') },
  { id: 'attenuator', cat: 'si', icon: 'attenuator', keywords: 'attenuator zayıflatıcı pad pi t bridged köprülü rf db',
    load: () => import('./pages/attenuator.js') },
  { id: 'inductor', cat: 'si', icon: 'spiral', keywords: 'planar inductor spiral bobin endüktör pcb coil wheeler mohan nfc',
    load: () => import('./pages/inductor.js') },
  { id: 'pdn', cat: 'power', icon: 'pdn', keywords: 'pdn decoupling dekuplaj target impedance hedef empedans capacitor kondansatör esl esr bulk',
    load: () => import('./pages/pdn.js') },
  { id: 'dcdc', cat: 'power', icon: 'dcdc', keywords: 'dc-dc buck boost converter dönüştürücü regulator regülatör inductor bobin ripple dalgalanma smps',
    load: () => import('./pages/dcdc.js') },
  { id: 'thermal', cat: 'power', icon: 'thermo', keywords: 'thermal termal junction bağlantı sıcaklık heatsink soğutucu theta ldo regulator regülatör',
    load: () => import('./pages/thermal.js') },
  { id: 'ohm', cat: 'circuit', icon: 'ohm', keywords: 'ohm law yasası voltage current resistance power güç direnç',
    load: () => import('./pages/ohm.js') },
  { id: 'divider', cat: 'circuit', icon: 'divider', keywords: 'voltage divider gerilim bölücü feedback geri besleme resistor',
    load: () => import('./pages/divider.js') },
  { id: 'led', cat: 'circuit', icon: 'led', keywords: 'led resistor direnç forward voltage ileri gerilim',
    load: () => import('./pages/led.js') },
  { id: 'rc', cat: 'circuit', icon: 'rc', keywords: 'rc rl lc time constant zaman sabiti cutoff kesim frequency frekans reactance reaktans resonance rezonans filter filtre',
    load: () => import('./pages/rc.js') },
  { id: 'eseries', cat: 'circuit', icon: 'resistor', keywords: 'e-series e12 e24 e96 standard value standart değer resistor direnç combination kombinasyon',
    load: () => import('./pages/eseries.js') },
  { id: 'timer555', cat: 'circuit', icon: 'timer', keywords: '555 timer zamanlayıcı astable monostable oscillator osilatör pulse darbe',
    load: () => import('./pages/timer555.js') },
  { id: 'colorcode', cat: 'circuit', icon: 'bands', keywords: 'color code renk kodu resistor direnç band bant iec 60062',
    load: () => import('./pages/colorcode.js') },
  { id: 'combine', cat: 'circuit', icon: 'combine', keywords: 'series parallel seri paralel combination eşdeğer equivalent resistor capacitor inductor',
    load: () => import('./pages/combine.js') },
  { id: 'crystal', cat: 'circuit', icon: 'crystal', keywords: 'crystal kristal xtal load capacitor yük kondansatörü ppm oscillator osilatör frequency tolerance',
    load: () => import('./pages/crystal.js') },
  { id: 'units', cat: 'tools', icon: 'swap', keywords: 'unit birim convert dönüştür mil mm oz dbm watt db awg temperature sıcaklık',
    load: () => import('./pages/units.js') },
];

export const toolById = (id) => TOOLS.find((t) => t.id === id);
export const titleKey = (id) => `tool_${id}`;
export const descKey = (id) => `tool_${id}_desc`;
