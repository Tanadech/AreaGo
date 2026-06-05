/**
 * storage.js
 * ห่อ localStorage ไว้ทั้งหมด — ที่อื่นห้ามแตะ localStorage ตรง ๆ
 * ทำให้เปลี่ยนวิธีเก็บ (เช่นไป backend) ได้โดยไม่กระทบ component
 */

import { STORAGE_KEYS } from './constants.js';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* โหมดส่วนตัว/พื้นที่เต็ม — ข้ามไปเงียบ ๆ ไม่ให้แอปพัง */
  }
}

/* ---------- รายการโปรด (favorites) ---------- */

/** @returns {string[]} รายการ id สถานที่ที่ถูกบันทึก */
export const getFavorites = () => readJson(STORAGE_KEYS.favorites, []);

export const isFavorite = (placeId) => getFavorites().includes(placeId);

/**
 * สลับสถานะโปรด/ไม่โปรด แล้วคืนสถานะใหม่
 * @returns {boolean} true = ตอนนี้เป็นรายการโปรดแล้ว
 */
export function toggleFavorite(placeId) {
  const favorites = getFavorites();
  const index = favorites.indexOf(placeId);

  if (index === -1) {
    favorites.push(placeId);
  } else {
    favorites.splice(index, 1);
  }
  writeJson(STORAGE_KEYS.favorites, favorites);
  return index === -1;
}

/* ---------- พื้นที่ล่าสุดที่เลือก ---------- */

export const getLastAreaId = () => readJson(STORAGE_KEYS.lastAreaId, null);

export const setLastAreaId = (areaId) =>
  writeJson(STORAGE_KEYS.lastAreaId, areaId);
