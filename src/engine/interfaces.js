// PCB layout rules for common interfaces, plus skew ⇄ length conversion.
//
// Data model
// - SOURCES: every document a value was taken from (title, number, revision,
//   URL, access date). Rule rows, impedances and limits carry source ids.
// - RULE_SETS: one entry per interface (or per PCIe generation / DDR signal
//   group / Ethernet side). Numbers the page computes with (impedance, skew
//   limits) are stored as data; the prose of each rule row lives in the page
//   strings under `if_<s>` (s defaults to `<set id>_<row kind>`).
// - Vendors disagree on many values. `nom/tol` is the value of one named
//   source; `range` is the spread across the sources listed; the prose says
//   which vendor says what. Values were not invented: a field is left out
//   when no source gave it.

import { MM_PER_MIL } from './units.js';

const C0 = 299792458; // m/s
const ACCESSED = '2026-11-25';

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

const src = (short, org, title, doc, rev, url) => ({ short, org, title, doc, rev, url, accessed: ACCESSED });

export const SOURCES = {
  spraar7: src('TI SPRAAR7J', 'Texas Instruments', 'High-Speed Interface Layout Guidelines', 'SPRAAR7J', 'Feb 2023', 'https://www.ti.com/lit/an/spraar7j/spraar7j.pdf'),
  snla426: src('TI SNLA426', 'Texas Instruments', 'High-Speed PCB Layout for PCIe Gen 5', 'SNLA426', 'Jun 2023', 'https://www.ti.com/lit/an/snla426/snla426.pdf'),
  renUsb2: src('Renesas R01AN4964', 'Renesas', 'RZ/A2M Group Guidelines for High-Speed USB2.0 Board Design', 'R01AN4964EJ0120', 'Rev 1.20, May 2020', 'https://www.renesas.com/eu/en/document/apn/rza2m-group-guidelines-high-speed-usb20-board-design-r01an4964ej0120'),
  nxpAn13462: src('NXP AN13462', 'NXP', 'PTN3222 layout guidelines (§2.5, USB 2.0 impedance)', 'AN13462', 'Rev 1.0, Dec 2021', 'https://www.nxp.com/docs/en/application-note/AN13462.pdf'),
  nxpHdg: src('NXP IMX8MPHDG', 'NXP', 'i.MX 8M Plus Hardware Developer’s Guide (Table 24, §3 checklists)', 'IMX8MPHDG', 'Rev 0, Mar 2021', 'https://community.nxp.com/pwmxy87654/attachments/pwmxy87654/other/21907/1/IMX8MPHDG.pdf'),
  tusb2e22: src('TI TUSB2E22', 'Texas Instruments', 'TUSB2E22 datasheet (USB 2.0 HS termination and levels, citing USB 2.0 §7.1.1)', 'SNLS648C', 'Aug 2024', 'https://www.ti.com/lit/ds/symlink/tusb2e22.pdf'),
  slvaf82: src('TI SLVAF82B', 'Texas Instruments', 'ESD and Surge Protection for USB Interfaces', 'SLVAF82B', 'Jan 2024', 'https://www.ti.com/lit/pdf/slvaf82'),
  tusb1002a: src('TI TUSB1002A', 'Texas Instruments', 'TUSB1002A USB 3.1 Gen 2 redriver datasheet (layout guidelines, Table 7-1/7-4)', 'SLLSF63C', 'Jul 2024', 'https://www.ti.com/lit/ds/symlink/tusb1002a.pdf'),
  snps: src('Synopsys PCIe blog', 'Synopsys', 'Understanding Bandwidth: Back to Basics (PCIe Gen1–Gen4 encoding)', 'blog, R. Solomon', 'Apr 2016', 'https://www.synopsys.com/blogs/chip-design/pcie-gen1-speed-basics.html'),
  astera: src('Astera Labs', 'Astera Labs', 'PCI Express 5.0 Architecture Channel Insertion Loss Budget', 'blog', 'undated', 'https://www.asteralabs.com/resources/blog/pci-express-5-0-architecture-channel-insertion-loss-budget/'),
  plx: src('Broadcom/PLX', 'PLX Technology (Broadcom)', 'PCB Layout Review – Quick Guide (quotes PCIe CEM 2.0 §4.6.6)', 'v1.1', 'Sep 2012', 'https://docs.broadcom.com/doc/pcie-pcb-layout-review'),
  qcom: src('Qualcomm 80-PV086-5P', 'Qualcomm', 'QRB5165 hardware design guidelines: PCIe layout guidelines', '80-PV086-5P', 'Jul 2023', 'https://docs.qualcomm.com/bundle/publicresource/80-PV086-5P/topics/PCIe%20layout%20guidelines.md'),
  mchpPf: src('Microchip PolarFire PCIe UG', 'Microchip', 'PolarFire Family PCI Express User Guide, §6.1 AC-Coupling', 'UG0685', 'rev. J', 'https://onlinedocs.microchip.com/oxy/GUID-E54C85EF-C33B-4E1E-A006-276B04B0FF9B-en-US-12/GUID-048B4E4B-3A92-44F4-9746-EE23AF5FD685.html'),
  lvpe5421: src('TI SN75LVPE5421', 'Texas Instruments', 'SN75LVPE5421 PCIe 5.0 redriver datasheet (§7.2.1.1 layout)', 'SNLS692B', 'Dec 2023', 'https://www.ti.com/lit/ds/symlink/sn75lvpe5421.pdf'),
  lvpe801: src('TI SN75LVPE801', 'Texas Instruments', 'SN75LVPE801 SATA redriver datasheet (§10.2)', 'SLLSEW8', 'Sep 2016', 'https://www.ti.com/lit/ds/symlink/sn75lvpe801.pdf'),
  c6748: src('TI TMS320C6748', 'Texas Instruments', 'TMS320C6748 datasheet (§6.14 SATA layout, Tables 6-45/6-46)', 'SPRS590G', 'Jan 2017', 'https://www.ti.com/lit/ds/symlink/tms320c6748.pdf'),
  tiHdmi: src('TI HDMI Design Guide', 'Texas Instruments', 'HDMI Design Guide (TMDS341A), spec skew and impedance summary', 'no number', 'Jun 2007', 'https://e2e.ti.com/cfs-file/__key/communityserver-discussions-components-files/138/4812.Texas-Instruments-HDMI-Design-Guide.pdf'),
  slla324: src('TI SLLA324', 'Texas Instruments', 'TPD12S016 PCB Layout Guidelines for HDMI ESD', 'SLLA324', 'Feb 2012', 'https://www.ti.com/lit/an/slla324/slla324.pdf'),
  tmds181: src('TI TMDS181', 'Texas Instruments', 'TMDS181 6 Gbps TMDS retimer datasheet (§8.3.10 sink termination)', 'SLASE75D', 'Sep 2017', 'https://www.ti.com/lit/ds/symlink/tmds181.pdf'),
  mipiVh: src('MIPI D-PHY history', 'MIPI Alliance', 'MIPI D-PHY Version History Table', 'feature table', 'Mar 2026', 'https://www.mipi.org/hubfs/Specification-Feature-Tables/MIPI-D-PHY-Version-History-Table-March-2026.pdf'),
  lvdsOm: src('TI LVDS Owner’s Manual', 'Texas Instruments', 'LVDS Owner’s Manual, 4th edition', 'SNLA187', '2008', 'https://www.ti.com/lit/ug/snla187/snla187.pdf'),
  lv028a: src('TI DS90LV028A', 'Texas Instruments', 'DS90LV028A LVDS receiver datasheet (§11.1 layout guidelines)', 'SNLS013F', 'Jun 2016', 'https://www.ti.com/lit/ds/symlink/ds90lv028a.pdf'),
  snla302: src('TI SNLA302', 'Texas Instruments', 'High-Speed Layout Guidelines for Reducing EMI for LVDS SerDes Designs', 'SNLA302', 'Nov 2018', 'https://www.ti.com/lit/an/snla302/snla302.pdf'),
  snla387: src('TI SNLA387', 'Texas Instruments', 'Ethernet PHY PCB Design Layout Checklist', 'SNLA387', 'Jun 2021', 'https://www.ti.com/lit/an/snla387/snla387.pdf'),
  dp83867: src('TI DP83867', 'Texas Instruments', 'DP83867IR/CR Gigabit Ethernet PHY datasheet (§9 application and layout)', 'SNLS484J', 'Jun 2026', 'https://www.ti.com/lit/ds/symlink/dp83867ir.pdf'),
  snla079: src('TI SNLA079', 'Texas Instruments', 'AN-1469 PHYTER Design & Layout Guide (§2.3 Bob Smith termination)', 'SNLA079D', 'Apr 2013', 'https://www.ti.com/lit/an/snla079d/snla079d.pdf'),
  renRgmii: src('Renesas R01AN6272', 'Renesas', 'RZ/G Series PCB Design Guideline for RGMII Interface', 'R01AN6272EJ0141', 'Rev 1.41, Jul 2026', 'https://www.renesas.com/us/en/document/apn/guide-using-rgmii-making-ethernet-if-connection'),
  ug583: src('AMD UG583', 'AMD', 'UltraScale Architecture PCB Design User Guide (DDR3/DDR4 routing constraints)', 'UG583', 'v1.29, Dec 2025', 'https://docs.amd.com/r/en-US/ug583-ultrascale-pcb-design'),
  ug863: src('AMD UG863', 'AMD', 'Versal Adaptive SoC PCB Design User Guide (DDR4/DDR5, RGMII)', 'UG863', 'v1.12, Jun 2026', 'https://docs.amd.com/r/en-US/ug863-versal-pcb-design'),
  sprabi1: src('TI SPRABI1D', 'Texas Instruments', 'DDR3 design requirements for KeyStone devices', 'SPRABI1D', 'Jul 2022', 'https://www.ti.com/lit/an/sprabi1d/sprabi1d.pdf'),
  sprad06: src('TI SPRAD06C', 'Texas Instruments', 'AM62x, AM62Lx DDR Board Design and Layout Guidelines', 'SPRAD06C', 'Mar 2025', 'https://www.ti.com/lit/an/sprad06c/sprad06c.pdf'),
  tn4113: src('Micron TN-41-13', 'Micron', 'DDR3 Point-to-Point Design Support', 'TN-41-13', 'Rev B, Aug 2013', 'https://cdn.hackaday.io/files/19354828041536/tn4113_ddr3_point_to_point_design.pdf'),
  jesd79_4: src('JEDEC JESD79-4', 'JEDEC', 'DDR4 SDRAM standard (speed bins, supply, RTT values)', 'JESD79-4', 'Sep 2012', 'https://www.jedec.org/standards-documents/docs/jesd79-4a'),
  mt60b: src('Micron MT60B', 'Micron', '16Gb DDR5 SDRAM addendum, die rev D', 'MT60B', 'Rev F, Apr 2024', 'https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/7969/16gb-ddr5-sdram-dierevd.pdf'),
  mddr5: src('Micron DDR5 brief', 'Micron', 'DDR5 Server DRAM product brief', 'product brief', '2022', 'https://docs.rs-online.com/0a21/A700000009681055.pdf'),
  slla270: src('TI SLLA270', 'Texas Instruments', 'Controller Area Network Physical Layer Requirements', 'SLLA270', 'Jan 2008', 'https://www.ti.com/lit/an/slla270/slla270.pdf'),
  tcan1044a: src('TI TCAN1044A', 'Texas Instruments', 'TCAN1044A-Q1 CAN FD transceiver datasheet (§9 application and layout)', 'SLLSFJ3D', 'Oct 2024', 'https://www.ti.com/lit/ds/symlink/tcan1044a-q1.pdf'),
  slla272: src('TI SLLA272D', 'Texas Instruments', 'The RS-485 Design Guide', 'SLLA272D', 'May 2021', 'https://www.ti.com/lit/an/slla272d/slla272d.pdf'),
  um10204: src('NXP UM10204', 'NXP', 'I²C-bus specification and user manual', 'UM10204', 'Rev 7.0, Oct 2021', 'https://www.nxp.com/docs/en/user-guide/UM10204.pdf'),
  cc3135: src('TI CC3135', 'Texas Instruments', 'CC3135 datasheet, §9.2.4 SPI host interface layout', 'SWAS037', 'Dec 2024', 'https://www.ti.com/lit/ds/symlink/cc3135.pdf'),
  mt094: src('ADI MT-094', 'Analog Devices', 'MT-094 Microstrip and Stripline Design (IPC-2141A delay formulas)', 'MT-094', 'Rev 0, 2009', 'https://www.analog.com/media/en/training-seminars/tutorials/MT-094.pdf'),
  an958: src('Intel AN 958', 'Intel', 'AN 958: Board Design Guidelines (microstrip/stripline propagation delay)', 'AN 958', '2023', 'https://www.intel.com/content/www/us/en/docs/programmable/683073/current/microstrip-layout-propagation-delay.html'),
};

// ---------------------------------------------------------------------------
// Rule sets
// ---------------------------------------------------------------------------

/** Rule-row kinds, in display order. `z` and `skew` rows are built from data. */
export const ROW_KINDS = ['signal', 'z', 'skew', 'group', 'length', 'vias', 'spacing', 'plane', 'ac', 'term', 'esd', 'other'];

const row = (k, sources, s) => ({ k, src: sources, ...(s ? { s } : {}) });

/**
 * Limit: { id: 'pair'|'group', value (max) or min+max (window, ps), unit: 'ps'|'mil'|'mm', src, ref?, pm?, spread? }
 * `ref` names what the group is matched to (string key suffix: if_ref_<ref>).
 */
const pairLim = (value, unit, sources) => ({ id: 'pair', value, unit, src: sources });
// pm: ± around the reference (DDR); spread: total spread among the members (RGMII);
// neither: max |difference| to the reference.
const groupLim = (value, unit, sources, ref, opts = {}) => ({ id: 'group', value, unit, src: sources, ref, ...opts });
const windowLim = (min, max, unit, sources, ref) => ({ id: 'group', min, max, unit, src: sources, ref });

// General high-speed differential rules (TI SPRAAR7J §2–3, SNLA426 §14).
export const GENERAL_HS = [
  row('g_tune', ['spraar7', 'snla426']),
  row('g_plane', ['spraar7']),
  row('g_bend', ['spraar7']),
  row('g_via', ['spraar7']),
  row('g_smd', ['spraar7']),
  row('g_weave', ['spraar7']),
];

const PCIE_RATE = { gen1: 2.5, gen2: 5, gen3: 8, gen4: 16, gen5: 32 };

function pcie(gen) {
  const old = gen === 'gen1' || gen === 'gen2';
  const late = gen === 'gen4' || gen === 'gen5';
  return {
    id: `pcie_${gen}`,
    name: `PCI Express ${gen.replace('gen', 'Gen')}`,
    kind: 'diff',
    rate: { v: [PCIE_RATE[gen]], unit: 'GT/s', src: gen === 'gen5' ? ['astera', 'snla426'] : ['snps'] },
    z: old
      ? { diff: { nom: 100, tol: 10, src: ['spraar7'] }, se: { nom: 60, tol: 15, src: ['spraar7'] } }
      : { diff: { nom: 85, tol: 10, range: [70, 100], src: ['snla426', 'nxpHdg'] } },
    limits: [pairLim(5, 'mil', ['spraar7', 'snla426'])],
    rows: [
      row('signal', gen === 'gen5' ? ['astera', 'snla426'] : ['snps', 'snla426'], `pcie_${gen}_signal`),
      row('z', old ? ['spraar7'] : ['snla426', 'nxpHdg'], `pcie_${old ? 'g12' : 'g3p'}_z`),
      row('skew', ['plx', 'snla426'], 'pcie_skew'),
      row('group', ['snla426', 'spraar7'], 'pcie_group'),
      row('length', old ? ['spraar7'] : ['snla426', 'astera'], old ? 'pcie_g12_length' : `pcie_${gen}_length`),
      row('vias', late ? ['snla426', 'lvpe5421'] : ['spraar7'], `pcie_${late ? 'g45' : 'g13'}_vias`),
      row('ac', old ? ['mchpPf', 'qcom'] : late ? ['snla426', 'lvpe5421'] : ['qcom', 'tusb1002a'], `pcie_${old ? 'g12' : late ? 'g45' : 'g3'}_ac`),
      row('term', ['snla426'], 'pcie_term'),
      row('other', ['snla426', 'nxpHdg'], 'pcie_other'),
    ],
    imp: { mode: 'diff', Z: old ? 100 : 85, tol: 10 },
    diagram: 'pair',
    hs: true,
  };
}

function ddr(n, grp, def) {
  return { id: `ddr${n}_${grp}`, name: `DDR${n} · ${grp}`, ...def, diagram: grp === 'clock' ? 'pair' : 'group' };
}

const DDR_TIME = row('other', ['nxpHdg', 'ug583'], 'ddr_time');

export const RULE_SETS = [
  {
    id: 'usb2',
    name: 'USB 2.0 High-Speed',
    kind: 'diff',
    rate: { v: [480], unit: 'Mbit/s', src: ['renUsb2', 'slvaf82'] },
    z: {
      diff: { nom: 90, tol: 10, src: ['spraar7', 'renUsb2', 'nxpHdg'] },
      se: { nom: 45, tol: 10, src: ['spraar7'] },
    },
    limits: [pairLim(50, 'mil', ['spraar7'])],
    rows: [
      row('signal', ['renUsb2', 'tusb2e22']),
      row('z', ['nxpAn13462', 'spraar7']),
      row('skew', ['renUsb2']),
      row('length', ['renUsb2']),
      row('vias', ['spraar7', 'renUsb2']),
      row('spacing', ['spraar7']),
      row('ac', ['tusb2e22']),
      row('esd', ['slvaf82', 'renUsb2', 'spraar7']),
    ],
    imp: { mode: 'diff', Z: 90, tol: 10 },
    diagram: 'pair',
    hs: true,
  },
  {
    id: 'usb3',
    name: 'USB 3.x SuperSpeed',
    kind: 'diff',
    rate: { v: [5, 10, 20], unit: 'Gbit/s', src: ['slvaf82'] },
    z: { diff: { nom: 90, tol: 10, range: [83.7, 99.75], src: ['nxpHdg', 'spraar7', 'tusb1002a'] } },
    limits: [pairLim(5, 'mil', ['spraar7'])],
    rows: [
      row('signal', ['slvaf82', 'spraar7']),
      row('z', ['spraar7', 'tusb1002a']),
      row('skew', ['tusb1002a', 'spraar7']),
      row('group', ['spraar7', 'tusb1002a']),
      row('length', ['spraar7']),
      row('vias', ['spraar7', 'tusb1002a']),
      row('ac', ['tusb1002a', 'spraar7']),
      row('esd', ['slvaf82', 'tusb1002a', 'spraar7']),
    ],
    imp: { mode: 'diff', Z: 90, tol: 10 },
    diagram: 'pair',
    hs: true,
  },
  ...['gen1', 'gen2', 'gen3', 'gen4', 'gen5'].map(pcie),
  {
    id: 'sata',
    name: 'SATA',
    kind: 'diff',
    rate: { v: [1.5, 3, 6], unit: 'Gbit/s', src: ['lvpe801'] },
    z: { diff: { nom: 100, tol: 15, src: ['spraar7', 'c6748'] } },
    limits: [pairLim(5, 'mil', ['spraar7'])],
    rows: [
      row('signal', ['lvpe801']),
      row('length', ['spraar7', 'c6748']),
      row('vias', ['spraar7', 'c6748']),
      row('ac', ['lvpe801', 'c6748']),
    ],
    imp: { mode: 'diff', Z: 100, tol: 15 },
    diagram: 'pair',
    hs: true,
  },
  {
    id: 'hdmi',
    name: 'HDMI (TMDS)',
    kind: 'diff',
    rate: { v: [3.4, 6], unit: 'Gbit/s', src: ['slla324', 'tmds181'] },
    z: { diff: { nom: 100, tol: 10, range: [85, 115], src: ['spraar7', 'nxpHdg', 'tiHdmi'] } },
    limits: [pairLim(5, 'mil', ['spraar7'])],
    rows: [
      row('signal', ['slla324', 'tmds181']),
      row('z', ['tiHdmi', 'spraar7', 'nxpHdg']),
      row('skew', ['tiHdmi']),
      row('group', ['tiHdmi']),
      row('length', ['spraar7']),
      row('ac', ['tmds181']),
      row('esd', ['slla324']),
    ],
    imp: { mode: 'diff', Z: 100, tol: 10 },
    diagram: 'pair',
    hs: true,
  },
  {
    id: 'mipi',
    name: 'MIPI D-PHY (CSI-2 / DSI)',
    kind: 'diff',
    rate: { v: [1.5, 2.5, 4.5], unit: 'Gbit/s', src: ['mipiVh'] },
    z: {
      diff: { nom: 100, tol: 15, src: ['spraar7', 'nxpHdg'] },
      se: { nom: 50, src: ['spraar7'] },
    },
    limits: [pairLim(8, 'ps', ['spraar7']), groupLim(40, 'ps', ['spraar7'], 'clkLane')],
    rows: [
      row('signal', ['mipiVh', 'spraar7']),
      row('z', ['spraar7', 'nxpHdg']),
      row('skew', ['spraar7', 'nxpHdg']),
      row('group', ['spraar7']),
      row('length', ['spraar7']),
      row('other', ['nxpHdg']),
    ],
    imp: { mode: 'diff', Z: 100, tol: 15 },
    diagram: 'pair',
    hs: true,
  },
  {
    id: 'lvds',
    name: 'LVDS (TIA/EIA-644)',
    kind: 'diff',
    z: { diff: { nom: 100, tol: 10, src: ['nxpHdg', 'lv028a'] } },
    limits: [pairLim(30, 'ps', ['snla302'])],
    rows: [
      row('signal', ['lvdsOm']),
      row('z', ['lv028a']),
      row('skew', ['snla302', 'lv028a']),
      row('vias', ['lv028a']),
      row('term', ['lv028a']),
    ],
    imp: { mode: 'diff', Z: 100, tol: 10 },
    diagram: 'pair',
    hs: true,
  },
  {
    id: 'eth_mdi',
    name: 'Ethernet 10/100/1000BASE-T · MDI',
    kind: 'diff',
    rate: { v: [10, 100, 1000], unit: 'Mbit/s', src: ['dp83867'] },
    z: { diff: { nom: 100, tol: 10, src: ['snla387'] }, se: { nom: 50, src: ['dp83867'] } },
    limits: [pairLim(20, 'mil', ['snla387'])],
    rows: [
      row('signal', ['dp83867']),
      row('z', ['snla387']),
      row('skew', ['snla387']),
      row('length', ['snla387']),
      row('vias', ['snla387', 'dp83867']),
      row('spacing', ['snla387']),
      row('plane', ['snla387', 'dp83867']),
      row('term', ['snla079', 'dp83867']),
      row('esd', ['snla387']),
    ],
    imp: { mode: 'diff', Z: 100, tol: 10 },
    diagram: 'pair',
    hs: true,
  },
  {
    id: 'eth_rgmii',
    name: 'Ethernet · RGMII',
    kind: 'se',
    rate: { v: [1000], unit: 'Mbit/s', src: ['renRgmii'] },
    z: { se: { nom: 50, tol: 10, src: ['snla387', 'nxpHdg', 'dp83867'] } },
    limits: [groupLim(11, 'ps', ['dp83867'], 'rgmiiClk', { spread: true })],
    rows: [
      row('signal', ['renRgmii']),
      row('group', ['snla387', 'ug863']),
      row('length', ['dp83867']),
      row('term', ['ug863']),
      row('other', ['renRgmii', 'dp83867']),
    ],
    imp: { mode: 'se', Z: 50, tol: 10 },
    diagram: 'group',
  },
  // ---- DDR3 (AMD UG583, TI SPRABI1D, Micron TN-41-13) ----
  ddr(3, 'data', {
    kind: 'se',
    rate: { v: [800, 1600], range: true, unit: 'MT/s', src: ['tn4113'] },
    z: { se: { nom: 40, tol: 10, range: [39, 50], src: ['tn4113', 'ug583', 'sprabi1'] }, diff: { range: [76, 100], src: ['ug583', 'sprabi1'] } },
    limits: [groupLim(10, 'ps', ['ug583'], 'dqs', { pm: true }), pairLim(2, 'ps', ['ug583'])],
    rows: [
      row('signal', ['tn4113', 'sprabi1'], 'ddr3_signal'),
      row('z', ['ug583', 'sprabi1', 'tn4113']),
      row('group', ['sprabi1']),
      row('length', ['ug583']),
      row('vias', ['sprabi1', 'ug583']),
      row('spacing', ['ug583']),
      row('plane', ['sprabi1', 'tn4113'], 'ddr3_plane'),
      row('term', ['tn4113']),
      DDR_TIME,
    ],
    imp: { mode: 'se', Z: 40, tol: 10 },
  }),
  ddr(3, 'clock', {
    kind: 'diff',
    rate: { v: [800, 1600], range: true, unit: 'MT/s', src: ['tn4113'] },
    z: { diff: { nom: 100, tol: 5, range: [76, 100], src: ['sprabi1', 'ug583'] } },
    limits: [pairLim(2, 'ps', ['ug583']), windowLim(-149, 1796, 'ps', ['ug583'], 'dqsCk')],
    rows: [
      row('signal', ['sprabi1'], 'ddr_clock_signal'),
      row('z', ['sprabi1', 'ug583']),
      row('skew', ['sprabi1']),
      row('group', ['ug583'], 'ddr_wl'),
      row('vias', ['ug583', 'sprabi1']),
      row('plane', ['sprabi1'], 'ddr3_plane'),
      row('term', ['sprabi1']),
      DDR_TIME,
    ],
    imp: { mode: 'diff', Z: 100, tol: 5 },
  }),
  ddr(3, 'addr', {
    kind: 'se',
    rate: { v: [800, 1600], range: true, unit: 'MT/s', src: ['tn4113'] },
    z: { se: { nom: 50, tol: 5, src: ['sprabi1'] } },
    limits: [groupLim(8, 'ps', ['ug583'], 'ck', { pm: true })],
    rows: [
      row('signal', ['sprabi1'], 'ddr_addr_signal'),
      row('group', ['sprabi1']),
      row('length', ['ug583']),
      row('vias', ['sprabi1']),
      row('plane', ['sprabi1']),
      row('term', ['sprabi1']),
      DDR_TIME,
    ],
    imp: { mode: 'se', Z: 50, tol: 5 },
  }),
  // ---- DDR4 (AMD UG583/UG863, TI SPRAD06C, JEDEC JESD79-4) ----
  ddr(4, 'data', {
    kind: 'se',
    rate: { v: [1600, 3200], range: true, unit: 'MT/s', src: ['jesd79_4'] },
    z: { se: { nom: 40, tol: 10, range: [39, 50], src: ['sprad06', 'ug583', 'ug863'] }, diff: { nom: 80, tol: 10, range: [76, 90], src: ['sprad06', 'ug583', 'nxpHdg', 'ug863'] } },
    limits: [groupLim(10, 'ps', ['ug583'], 'dqs', { pm: true }), pairLim(2, 'ps', ['ug583', 'ug863'])],
    rows: [
      row('signal', ['jesd79_4', 'sprad06'], 'ddr4_signal'),
      row('z', ['ug583', 'sprad06', 'nxpHdg', 'ug863']),
      row('skew', ['sprad06']),
      row('length', ['ug583', 'sprad06']),
      row('vias', ['ug863', 'sprad06']),
      row('spacing', ['sprad06', 'ug863']),
      row('plane', ['ug863', 'sprad06'], 'ddr45_plane'),
      row('term', ['jesd79_4', 'ug863']),
      DDR_TIME,
    ],
    imp: { mode: 'se', Z: 40, tol: 10 },
  }),
  ddr(4, 'clock', {
    kind: 'diff',
    rate: { v: [1600, 3200], range: true, unit: 'MT/s', src: ['jesd79_4'] },
    z: { diff: { nom: 80, tol: 10, range: [76, 90], src: ['sprad06', 'ug583', 'ug863'] } },
    limits: [pairLim(2, 'ps', ['ug583', 'ug863']), windowLim(-149, 1796, 'ps', ['ug583', 'ug863'], 'dqsCk')],
    rows: [
      row('signal', ['sprad06'], 'ddr_clock_signal'),
      row('z', ['ug583', 'sprad06', 'ug863']),
      row('group', ['ug583', 'ug863'], 'ddr45_wl'),
      row('vias', ['ug583', 'ug863']),
      row('plane', ['sprad06']),
      row('term', ['sprad06', 'ug863']),
      DDR_TIME,
    ],
    imp: { mode: 'diff', Z: 80, tol: 10 },
  }),
  ddr(4, 'addr', {
    kind: 'se',
    rate: { v: [1600, 3200], range: true, unit: 'MT/s', src: ['jesd79_4'] },
    z: { se: { nom: 40, tol: 10, range: [40, 50], src: ['sprad06', 'ug863'] } },
    limits: [groupLim(8, 'ps', ['ug583'], 'ck', { pm: true })],
    rows: [
      row('signal', ['sprad06'], 'ddr_addr_signal'),
      row('group', ['ug863', 'sprad06']),
      row('length', ['ug583', 'ug863', 'sprad06']),
      row('vias', ['sprad06', 'ug863']),
      row('plane', ['sprad06']),
      row('term', ['ug863', 'sprad06']),
      DDR_TIME,
    ],
    imp: { mode: 'se', Z: 40, tol: 10 },
  }),
  // ---- DDR5 (AMD UG863, Micron) ----
  ddr(5, 'data', {
    kind: 'se',
    rate: { v: [4800, 8800], range: true, unit: 'MT/s', src: ['mddr5', 'mt60b'] },
    z: { se: { nom: 40, tol: 10, src: ['ug863'] }, diff: { nom: 75, tol: 10, src: ['ug863'] } },
    limits: [groupLim(50, 'ps', ['ug863'], 'dqs', { pm: true }), pairLim(2, 'ps', ['ug863'])],
    rows: [
      row('signal', ['mddr5', 'mt60b'], 'ddr5_signal'),
      row('length', ['ug863']),
      row('vias', ['ug863']),
      row('spacing', ['ug863']),
      row('plane', ['ug863'], 'ddr45_plane'),
      row('term', ['ug863']),
      DDR_TIME,
    ],
    imp: { mode: 'se', Z: 40, tol: 10 },
  }),
  ddr(5, 'clock', {
    kind: 'diff',
    rate: { v: [4800, 8800], range: true, unit: 'MT/s', src: ['mddr5', 'mt60b'] },
    z: { diff: { nom: 75, tol: 10, src: ['ug863'] } },
    limits: [pairLim(2, 'ps', ['ug863']), windowLim(-149, 1796, 'ps', ['ug863'], 'dqsCk')],
    rows: [
      row('signal', ['ug863'], 'ddr_clock_signal'),
      row('group', ['ug863'], 'ddr45_wl'),
      row('vias', ['ug863']),
      row('plane', ['ug863'], 'ddr45_plane'),
      row('term', ['ug863']),
      DDR_TIME,
    ],
    imp: { mode: 'diff', Z: 75, tol: 10 },
  }),
  ddr(5, 'addr', {
    kind: 'se',
    rate: { v: [4800, 8800], range: true, unit: 'MT/s', src: ['mddr5', 'mt60b'] },
    z: { se: { nom: 40, tol: 10, src: ['ug863'] } },
    limits: [groupLim(50, 'ps', ['ug863'], 'ck', { pm: true })],
    rows: [
      row('signal', ['ug863'], 'ddr_addr_signal'),
      row('length', ['ug863']),
      row('spacing', ['ug863']),
      row('plane', ['ug863'], 'ddr45_plane'),
      row('term', ['ug863']),
      DDR_TIME,
    ],
    imp: { mode: 'se', Z: 40, tol: 10 },
  }),
  // ---- Field buses and low-speed notes ----
  {
    id: 'can',
    name: 'CAN / CAN FD',
    kind: 'bus',
    rate: { v: [1, 5], unit: 'Mbit/s', src: ['slla270', 'tcan1044a'], note: true },
    z: { diff: { nom: 120, src: ['slla270'] } },
    limits: [],
    rows: [
      row('signal', ['slla270', 'tcan1044a']),
      row('z', ['slla270']),
      row('length', ['slla270']),
      row('term', ['slla270', 'tcan1044a']),
      row('esd', ['tcan1044a', 'slla270']),
    ],
    imp: { mode: 'diff', Z: 120 },
    diagram: 'bus',
    bus: 'ends',
  },
  {
    id: 'rs485',
    name: 'RS-485 (TIA/EIA-485-A)',
    kind: 'bus',
    rate: { v: [10], unit: 'Mbit/s', src: ['slla272'], note: true },
    z: { diff: { nom: 120, src: ['slla272'] } },
    limits: [],
    rows: [
      row('signal', ['slla272']),
      row('z', ['slla272']),
      row('length', ['slla272']),
      row('spacing', ['slla272']),
      row('term', ['slla272']),
      row('other', ['slla272']),
    ],
    imp: { mode: 'diff', Z: 120 },
    diagram: 'bus',
    bus: 'ends',
  },
  {
    id: 'i2c',
    name: 'I²C',
    kind: 'note',
    rate: { v: [0.1, 0.4, 1, 3.4], unit: 'Mbit/s', src: ['um10204'], note: true },
    z: { none: true, src: ['um10204'] },
    limits: [],
    rows: [
      row('signal', ['um10204']),
      row('z', ['um10204']),
      row('other', ['um10204']),
      row('term', ['um10204']),
      row('length', ['um10204']),
    ],
    diagram: 'bus',
    bus: 'pullup',
  },
  {
    id: 'spi',
    name: 'SPI',
    kind: 'note',
    z: { se: { nom: 50, src: ['cc3135'] } },
    limits: [],
    rows: [
      row('signal', ['cc3135']),
      row('z', ['cc3135']),
      row('term', ['cc3135']),
      row('length', ['cc3135']),
    ],
    imp: { mode: 'se', Z: 50 },
    diagram: 'bus',
    bus: 'series',
  },
];

export const RULES = Object.fromEntries(RULE_SETS.map((s) => [s.id, s]));

/** Interface menu (page select). Sub-choices pick the rule set. */
export const INTERFACES = ['usb2', 'usb3', 'pcie', 'sata', 'hdmi', 'mipi', 'lvds', 'eth', 'ddr3', 'ddr4', 'ddr5', 'can', 'rs485', 'i2c', 'spi'];
export const PCIE_GENS = ['gen1', 'gen2', 'gen3', 'gen4', 'gen5'];
export const DDR_GROUPS = ['data', 'clock', 'addr'];
export const ETH_PARTS = ['mdi', 'rgmii'];

/** Rule set for a menu choice and its sub-choice. */
export function ruleSetFor(iface, { gen = 'gen3', grp = 'data', eth = 'mdi' } = {}) {
  if (iface === 'pcie') return RULES[`pcie_${PCIE_GENS.includes(gen) ? gen : 'gen3'}`];
  if (iface === 'eth') return RULES[`eth_${ETH_PARTS.includes(eth) ? eth : 'mdi'}`];
  if (/^ddr[345]$/.test(iface)) return RULES[`${iface}_${DDR_GROUPS.includes(grp) ? grp : 'data'}`];
  return RULES[iface] ?? RULES.usb2;
}

/** String key (without the `if_` prefix) of a rule row's prose. */
export const rowKey = (set, r) => r.s ?? `${set.id}_${r.k}`;

/** All source ids a rule set cites (z, rate, limits, rows), first use first. */
export function sourcesOf(set, extra = []) {
  const ids = [
    ...(set.rate?.src ?? []),
    ...Object.values(set.z ?? {}).flatMap((z) => z?.src ?? []),
    ...set.limits.flatMap((l) => l.src),
    ...set.rows.flatMap((r) => r.src),
    ...extra.flatMap((r) => r.src),
  ];
  return [...new Set(ids)];
}

// ---------------------------------------------------------------------------
// Skew ⇄ length
// ---------------------------------------------------------------------------

/** Delay of 1 mm in vacuum, ps (= 1e-3 m / c). */
export const PS_PER_MM_VACUUM = 1e9 / C0;

/**
 * Effective dielectric constant for delay.
 * stripline: εeff = εr (homogeneous dielectric).
 * microstrip: εeff ≈ 0.475·εr + 0.67 (IPC-2141A delay formula, via ADI MT-094 / Intel AN 958).
 * known: the value given is already εeff (e.g. from the impedance calculator).
 */
export function erEffective(structure, er) {
  if (structure === 'microstrip') return 0.475 * er + 0.67;
  return er;
}

/** Propagation delay in ps/mm for an effective dielectric constant. */
export const delayPsPerMm = (erEff) => Math.sqrt(erEff) * PS_PER_MM_VACUUM;

const MM_PER = { mm: 1, mil: MM_PER_MIL, in: 25.4 };

/** A skew or length value → picoseconds, at tpd ps/mm. Unit: ps | ns | mm | mil | in. */
export function toPs(value, unit, tpdPsPerMm) {
  if (unit === 'ps') return value;
  if (unit === 'ns') return value * 1000;
  const k = MM_PER[unit];
  if (k === undefined) throw new Error(`Unknown skew unit: ${unit}`);
  return value * k * tpdPsPerMm;
}

/** Equivalent delay and lengths of a skew or length value. */
export function convertSkew(value, unit, tpdPsPerMm) {
  const ps = toPs(value, unit, tpdPsPerMm);
  const mm = ps / tpdPsPerMm;
  return { ps, mm, mil: mm / MM_PER_MIL };
}

/** A limit converted to ps / mm / mil (value, or min and max for a window). */
export function limitIn(limit, tpdPsPerMm) {
  const conv = (x) => convertSkew(x, limit.unit, tpdPsPerMm);
  if (limit.min !== undefined) return { window: true, min: conv(limit.min), max: conv(limit.max) };
  return { window: false, max: conv(limit.value) };
}

/** Does a mismatch (in ps, sign ignored for ± limits) satisfy a limit? */
export function withinLimit(limit, ps, tpdPsPerMm) {
  const l = limitIn(limit, tpdPsPerMm);
  const eps = 1e-9;
  if (l.window) return ps >= l.min.ps - eps && ps <= l.max.ps + eps;
  return Math.abs(ps) <= l.max.ps + eps;
}
