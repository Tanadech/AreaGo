/**
 * category-filter.js
 * แถบชิปกรองหมวดหมู่ — emit categoryId ผ่าน onSelectCategory
 * มีชิป "ทั้งหมด" เป็นค่าเริ่มต้นเสมอ
 */

import { el } from '../lib/dom.js';
import { ALL_CATEGORIES } from '../lib/constants.js';

/**
 * @param {{categories:Array, activeCategoryId:string, onSelectCategory:(id:string)=>void}} props
 * @returns {HTMLElement}
 */
export function CategoryFilter({ categories, activeCategoryId, onSelectCategory }) {
  const allChips = [{ id: ALL_CATEGORIES, name: 'ทั้งหมด', icon: '🧭' }, ...categories];

  const chips = allChips.map((category) => {
    const isActive = category.id === activeCategoryId;
    return el(
      'button',
      {
        class: `chip ${isActive ? 'chip--active' : ''}`,
        type: 'button',
        dataset: { categoryId: category.id },
        onClick: () => onSelectCategory(category.id),
      },
      [
        el('span', { class: 'chip__icon', text: category.icon }),
        el('span', { class: 'chip__label', text: category.name }),
      ],
    );
  });

  return el('div', { class: 'category-filter' }, chips);
}
