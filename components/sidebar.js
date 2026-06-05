/**
 * sidebar.js
 * รายการ "พื้นที่" ให้เลือกสแกน — emit areaId ที่เลือกผ่าน onSelectArea
 * ไฮไลต์พื้นที่ที่กำลังเลือกด้วย activeAreaId
 */

import { el } from '../lib/dom.js';
import { ICONS } from '../lib/icons.js';

/**
 * @param {{areas:Array, activeAreaId:string, onSelectArea:(areaId:string)=>void}} props
 * @returns {HTMLElement}
 */
export function Sidebar({ areas, activeAreaId, onSelectArea }) {
  const items = areas.map((area) => {
    const isActive = area.id === activeAreaId;
    return el(
      'button',
      {
        class: `area-item ${isActive ? 'area-item--active' : ''}`,
        type: 'button',
        dataset: { areaId: area.id },
        onClick: () => onSelectArea(area.id),
      },
      [
        el('span', { class: 'area-item__icon', html: ICONS.pin }),
        el('span', { class: 'area-item__body' }, [
          el('span', { class: 'area-item__name', text: area.name }),
          el('span', { class: 'area-item__region', text: `ภาค${area.region}` }),
        ]),
      ],
    );
  });

  return el('aside', { class: 'sidebar' }, [
    el('h2', { class: 'sidebar__title', text: 'เลือกพื้นที่' }),
    el('nav', { class: 'sidebar__list' }, items),
  ]);
}
