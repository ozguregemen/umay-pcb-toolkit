// "Next step" links under a result: where this calculation is usually taken
// next, opened with the values already known. The links themselves are listed
// in ../nextsteps.js.

import { t } from '../i18n.js';
import { esc } from './format.js';
import { icon } from './icons.js';
import { toolById } from '../registry.js';
import { NEXT } from '../nextsteps.js';

/** A number as it goes into a link: six significant digits, no rounding noise. */
const tidy = (x) => String(Number(x.toPrecision(6)));

/** Query string from { key: value }; empty and non-finite values are left out. */
export function nextQuery(params) {
  const q = new URLSearchParams();
  for (const [k, val] of Object.entries(params ?? {})) {
    if (val === undefined || val === null || val === '') continue;
    if (typeof val === 'number') {
      if (!Number.isFinite(val)) continue;
      q.set(k, tidy(val));
    } else {
      q.set(k, String(val));
    }
  }
  return q.toString();
}

/**
 * The follow-up links of a tool for one result.
 * @returns {{to: string, icon: string, href: string, why: string}[]}
 */
export function nextSteps(id, r, v, u) {
  const out = [];
  for (const step of NEXT[id] ?? []) {
    const tool = toolById(step.to);
    if (!tool) continue;
    let params;
    try {
      params = step.q ? step.q(r, v, u) : {};
    } catch {
      params = null; // a link that cannot be built is left out, never a broken page
    }
    if (!params) continue;
    const query = nextQuery(params);
    out.push({ to: step.to, icon: tool.icon, href: `#/${step.to}${query ? `?${query}` : ''}`, why: step.why });
  }
  return out;
}

/** The block shown under a result; empty when the tool has no follow-up. */
export function nextStepsHtml(id, r, v, u) {
  const list = nextSteps(id, r, v, u);
  if (!list.length) return '';
  const cards = list.map((s) => `<a class="next-card" href="${esc(s.href)}">${icon(s.icon, 18)}<span><b>${esc(t(`tool_${s.to}`))}</b><small>${esc(t(s.why))}</small></span>${icon('right', 16)}</a>`).join('');
  return `<nav class="block next-steps" aria-label="${esc(t('nextSteps'))}"><h2>${esc(t('nextSteps'))}</h2><div class="next-list">${cards}</div></nav>`;
}
