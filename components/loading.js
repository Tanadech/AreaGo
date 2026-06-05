/**
 * loading.js
 * สถานะกำลังโหลด/กำลังสแกน — ใช้ร่วมกันทุกที่ที่ต้องรอข้อมูล
 */

import { el } from '../lib/dom.js';
import { ICONS } from '../lib/icons.js';

/**
 * @param {string} [message]
 * @returns {HTMLElement}
 */
export function Loading(message = 'กำลังสแกนพื้นที่...') {
  return el('div', { class: 'loading' }, [
    el('span', { class: 'loading__radar', html: ICONS.radar }),
    el('p', { class: 'loading__text', text: message }),
  ]);
}
