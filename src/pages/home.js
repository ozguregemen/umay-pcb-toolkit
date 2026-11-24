import { t } from '../i18n.js';
import { esc } from '../ui/format.js';

const TOOLS = [
  { id: 'trace', title: 'navTrace', desc: 'homeTraceDesc', tag: 'IPC-2221 · IPC-2152',
    icon: '<path d="M3 17h5l3-10h10"/><path d="M3 21h18" opacity=".35"/>' },
  { id: 'impedance', title: 'navImpedance', desc: 'homeImpedanceDesc', tag: 'IPC-2141',
    icon: '<path d="M2 12h3l2-5 3 10 3-10 3 10 2-5h4"/>' },
  { id: 'spacing', title: 'navSpacing', desc: 'homeSpacingDesc', tag: 'IPC-2221 6-1',
    icon: '<path d="M4 4v16M20 4v16"/><path d="M8 12h8M8 12l3-3M8 12l3 3M16 12l-3-3M16 12l-3 3"/>' },
  { id: 'via', title: 'navVia', desc: 'homeViaDesc', tag: 'DC · Thermal',
    icon: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/>' },
];

export function mountHome(root) {
  root.innerHTML = `
    <section class="home-hero">
      <h1>${esc(t('homeTitle'))}</h1>
      <p class="lead">${esc(t('homeLead'))}</p>
    </section>
    <section class="tools">
      ${TOOLS.map((x) => `
        <a class="card tool" href="#/${x.id}">
          <svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true">${x.icon}</svg>
          <div class="tool-body">
            <div class="tool-head"><h2>${esc(t(x.title))}</h2><span class="tag">${esc(x.tag)}</span></div>
            <p>${esc(t(x.desc))}</p>
            <span class="tool-open">${esc(t('homeOpen'))} →</span>
          </div>
        </a>`).join('')}
    </section>
    <section class="card why">
      <h2>${esc(t('homeWhyTitle'))}</h2>
      <ul>${['homeWhy1', 'homeWhy2', 'homeWhy3', 'homeWhy4'].map((k) => `<li>${esc(t(k))}</li>`).join('')}</ul>
    </section>`;
}
