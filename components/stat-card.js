/**
 * stat-card.js
 * การ์ดสถิติ 1 ใบ — ใช้ทั้งหน้า Traveler Home และ Admin Dashboard
 */

import { el } from '../lib/dom.js';

/**
 * @param {{icon:string, label:string, value:string|number, growth?:number, color?:string}} props
 */
export function StatCard({ icon, label, value, growth, color = 'var(--color-primary)' }) {
  const growthEl = growth != null
    ? el('span', {
        class: `stat-card__growth ${growth >= 0 ? 'stat-card__growth--up' : 'stat-card__growth--down'}`,
        text: `${growth >= 0 ? '+' : ''}${growth}%`,
      })
    : null;

  return el('div', { class: 'stat-card', style: `--card-color:${color}` }, [
    el('div', { class: 'stat-card__header' }, [
      el('span', { class: 'stat-card__icon', text: icon }),
      growthEl,
    ]),
    el('div', { class: 'stat-card__value', text: Number(value).toLocaleString('th-TH') }),
    el('div', { class: 'stat-card__label', text: label }),
  ]);
}
