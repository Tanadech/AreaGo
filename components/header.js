/**
 * header.js
 * แถบบนสุด: โลโก้ + ช่องค้นหา + ตัวนับรายการโปรด
 * รับ search-box เข้ามาเป็น slot เพื่อไม่ผูกกันแน่น (composition)
 */

import { el } from '../lib/dom.js';
import { ICONS } from '../lib/icons.js';

/**
 * @param {{searchBox:HTMLElement, favoriteCount:number}} props
 * @returns {HTMLElement}
 */
export function Header({ searchBox, favoriteCount = 0 }) {
  const favBadge = el('span', {
    class: 'header__fav-count',
    text: String(favoriteCount),
    'data-role': 'fav-count',
  });

  return el('header', { class: 'header' }, [
    el('div', { class: 'header__brand' }, [
      el('span', { class: 'header__logo', html: ICONS.pin }),
      el('div', {}, [
        el('h1', { class: 'header__title', text: 'AreaScan' }),
        el('p', { class: 'header__tagline', text: 'สำรวจพื้นที่ ค้นหาที่เที่ยว' }),
      ]),
    ]),
    el('div', { class: 'header__search' }, [searchBox]),
    el('div', { class: 'header__fav' }, [
      el('span', { class: 'header__fav-icon', html: ICONS.heart }),
      favBadge,
    ]),
  ]);
}
