/**
 * api.js
 * ชั้นเดียวที่คุยกับแหล่งข้อมูล (ตอนนี้คือไฟล์ JSON, อนาคตเปลี่ยนเป็น REST ได้ที่นี่จุดเดียว)
 * component และ service ห้าม fetch เองตรง ๆ — ต้องเรียกผ่านที่นี่ (กฎข้อ 7)
 */

import { DATA_PATHS } from './constants.js';

/**
 * ดึง JSON พร้อมจัดการ error ให้เป็นมาตรฐานเดียวกัน
 * @param {string} path
 * @returns {Promise<any>}
 */
async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`โหลดข้อมูลไม่สำเร็จ (${response.status}): ${path}`);
  }
  return response.json();
}

export const loadAreas = () => fetchJson(DATA_PATHS.areas);
export const loadPlaces = () => fetchJson(DATA_PATHS.places);
export const loadCategories = () => fetchJson(DATA_PATHS.categories);

/**
 * โหลดข้อมูลตั้งต้นทั้งหมดพร้อมกัน — เรียกครั้งเดียวตอนเปิดแอป
 * @returns {Promise<{areas:Array, places:Array, categories:Array}>}
 */
export async function loadInitialData() {
  const [areas, places, categories] = await Promise.all([
    loadAreas(),
    loadPlaces(),
    loadCategories(),
  ]);
  return { areas, places, categories };
}
