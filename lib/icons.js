/**
 * icons.js
 * SVG ไอคอนแบบ inline ใช้ซ้ำทั้งเว็บ — UI ซ้ำต้องรวมเป็นที่เดียว (กฎข้อ 10)
 * คืนค่าเป็น string เพื่อใส่ใน innerHTML ได้สะดวก
 */

const svg = (path) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

export const ICONS = Object.freeze({
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  heart: svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/>'),
  pin: svg('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
  star: svg('<path d="m12 2 3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  radar: svg('<circle cx="12" cy="12" r="9"/><path d="M12 12 19 5"/><path d="M12 12a6 6 0 0 1 6-6"/>'),
});
