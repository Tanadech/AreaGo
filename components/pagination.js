/**
 * pagination.js
 * ปุ่มเปลี่ยนหน้า — emit เลขหน้าใหม่ผ่าน onChangePage
 * แสดงเฉพาะเมื่อมีมากกว่า 1 หน้า
 */

import { el } from '../lib/dom.js';

/**
 * @param {{page:number, totalPages:number, onChangePage:(page:number)=>void}} props
 * @returns {HTMLElement|null}
 */
export function Pagination({ page, totalPages, onChangePage }) {
  if (totalPages <= 1) return el('div', { class: 'pagination pagination--hidden' });

  const button = (label, targetPage, disabled) =>
    el('button', {
      class: 'pagination__btn',
      type: 'button',
      disabled: disabled ? 'true' : null,
      text: label,
      onClick: () => !disabled && onChangePage(targetPage),
    });

  return el('div', { class: 'pagination' }, [
    button('‹ ก่อนหน้า', page - 1, page === 1),
    el('span', { class: 'pagination__status', text: `หน้า ${page} / ${totalPages}` }),
    button('ถัดไป ›', page + 1, page === totalPages),
  ]);
}
