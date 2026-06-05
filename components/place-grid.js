/**
 * place-grid.js
 * จัดวางการ์ดสถานที่เป็นกริด + จัดการสถานะว่าง (empty state)
 * ไม่สร้างการ์ดเอง — รับ array ของ PlaceCard ที่ประกอบเสร็จแล้วเข้ามา (single responsibility)
 */

import { el } from '../lib/dom.js';

/**
 * @param {{cards:HTMLElement[], emptyMessage?:string}} props
 * @returns {HTMLElement}
 */
export function PlaceGrid({ cards, emptyMessage = 'ไม่พบสถานที่ที่ตรงกับเงื่อนไข' }) {
  if (!cards.length) {
    return el('div', { class: 'place-grid place-grid--empty' }, [
      el('span', { class: 'place-grid__empty-icon', text: '🗺️' }),
      el('p', { class: 'place-grid__empty-text', text: emptyMessage }),
    ]);
  }

  return el('div', { class: 'place-grid' }, cards);
}
