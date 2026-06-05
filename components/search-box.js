/**
 * search-box.js
 * ช่องค้นหา — emit คำค้นแบบ debounce ผ่าน callback onSearch
 * ไม่รู้จัก business logic เลย แค่ส่งข้อความที่ผู้ใช้พิมพ์ออกไป
 */

import { el, debounce } from '../lib/dom.js';
import { ICONS } from '../lib/icons.js';
import { CONFIG } from '../lib/constants.js';

/**
 * @param {{onSearch:(query:string)=>void, placeholder?:string}} props
 * @returns {HTMLElement}
 */
export function SearchBox({ onSearch, placeholder = 'ค้นหาสถานที่ หรือกิจกรรม...' }) {
  const emit = debounce((value) => onSearch(value), CONFIG.searchDebounceMs);

  const input = el('input', {
    type: 'search',
    class: 'search-box__input',
    placeholder,
    'aria-label': 'ค้นหาสถานที่',
    onInput: (event) => emit(event.target.value),
  });

  return el('div', { class: 'search-box' }, [
    el('span', { class: 'search-box__icon', html: ICONS.search }),
    input,
  ]);
}
