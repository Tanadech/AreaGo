/**
 * router.js
 * Hash-based SPA router — ไม่ต้องพึ่ง server
 * route format: #role/page เช่น #traveler/map, #merchant/store, #admin/reports
 */

import { STORAGE_KEYS } from './constants.js';

const ROLE_KEY = 'ats:role';

export const ROLES = Object.freeze({ TRAVELER: 'traveler', MERCHANT: 'merchant', ADMIN: 'admin' });

/** อ่าน hash แล้วแยก role + page */
export function parseRoute() {
  const hash = (location.hash || '#').slice(1).replace(/^\//, '');
  const [role = '', page = 'home'] = hash.split('/');
  return { role, page };
}

/** เปลี่ยน route โดยไม่ต้อง reload */
export function navigate(role, page = 'home') {
  location.hash = `/${role}/${page}`;
}

/** บันทึก role ที่เลือกไว้ใน localStorage */
export function setActiveRole(role) {
  try { localStorage.setItem(ROLE_KEY, role); } catch {}
}

export function getActiveRole() {
  try { return localStorage.getItem(ROLE_KEY); } catch { return null; }
}

/**
 * ติดตั้ง listener — เรียกครั้งเดียวตอน bootstrap
 * @param {(role:string, page:string)=>void} onRoute
 */
export function initRouter(onRoute) {
  const dispatch = () => {
    const { role, page } = parseRoute();
    if (role) onRoute(role, page);
  };
  window.addEventListener('hashchange', dispatch);
  dispatch();
}
