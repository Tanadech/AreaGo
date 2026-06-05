/**
 * bottom-nav.js
 * แถบนำทางด้านล่างสำหรับมือถือ — แสดงเฉพาะ role นักท่องเที่ยว
 */

import { el } from '../lib/dom.js';
import { navigate } from '../lib/router.js';

const TRAVELER_TABS = [
  { page: 'home',     icon: '🏠', label: 'หน้าแรก' },
  { page: 'map',      icon: '🗺️', label: 'แผนที่'  },
  { page: 'scan',     icon: '📡', label: 'สแกน'    },
  { page: 'trip',     icon: '📋', label: 'แผนเที่ยว'},
  { page: 'profile',  icon: '👤', label: 'โปรไฟล์' },
];

const MERCHANT_TABS = [
  { page: 'home',     icon: '📊', label: 'Dashboard' },
  { page: 'store',    icon: '🏪', label: 'ร้านค้า'   },
  { page: 'promo',    icon: '🎯', label: 'โปรโมชั่น' },
  { page: 'stats',    icon: '📈', label: 'สถิติ'      },
  { page: 'profile',  icon: '👤', label: 'โปรไฟล์'   },
];

/**
 * @param {{role:'traveler'|'merchant', activePage:string}} props
 */
export function BottomNav({ role, activePage }) {
  const tabs = role === 'merchant' ? MERCHANT_TABS : TRAVELER_TABS;

  const items = tabs.map(({ page, icon, label }) => {
    const isActive = page === activePage;
    return el('button', {
      class: `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`,
      type: 'button',
      onClick: () => navigate(role, page),
    }, [
      el('span', { class: 'bottom-nav__icon', text: icon }),
      el('span', { class: 'bottom-nav__label', text: label }),
    ]);
  });

  /* ปุ่มสแกนตรงกลาง (FAB) ตรงกับ design */
  if (role === 'traveler') {
    const scanItem = items[2];
    scanItem.classList.add('bottom-nav__item--fab');
  }

  return el('nav', { class: 'bottom-nav' }, items);
}
