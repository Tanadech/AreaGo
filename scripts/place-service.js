/**
 * place-service.js
 * Business logic ของ "สถานที่": ค้นหา / กรองหมวด / เรียงลำดับ / แบ่งหน้า
 * รวม pipeline การประมวลผลผลลัพธ์ไว้ที่เดียว — controller แค่เรียกใช้
 */

import { normalizeQuery } from '../lib/validator.js';
import { SORT_OPTIONS, ALL_CATEGORIES, CONFIG } from '../lib/constants.js';

/** กรองด้วยคำค้น (ชื่อไทย/อังกฤษ/แท็ก) */
function filterByQuery(places, query) {
  const term = normalizeQuery(query).toLowerCase();
  if (!term) return places;

  return places.filter((place) => {
    const haystack = [place.name, place.nameEn, ...(place.tags ?? [])]
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  });
}

/** กรองด้วยหมวดหมู่ (ALL_CATEGORIES = ไม่กรอง) */
function filterByCategory(places, categoryId) {
  if (!categoryId || categoryId === ALL_CATEGORIES) return places;
  return places.filter((place) => place.categoryId === categoryId);
}

/** เรียงลำดับตามตัวเลือก (ไม่แก้ array เดิม) */
function sortPlaces(places, sortBy) {
  const sorted = [...places];
  switch (sortBy) {
    case SORT_OPTIONS.RATING:
      return sorted.sort((a, b) => b.rating - a.rating);
    case SORT_OPTIONS.POPULAR:
      return sorted.sort((a, b) => b.reviewCount - a.reviewCount);
    case SORT_OPTIONS.DISTANCE:
    default:
      return sorted.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }
}

/**
 * ประมวลผลผลลัพธ์ตามตัวกรองทั้งหมด แล้วแบ่งหน้า
 * @param {Array} places สถานที่ในพื้นที่ (ผ่าน scanArea มาแล้ว)
 * @param {{query?:string, categoryId?:string, sortBy?:string, page?:number}} filters
 * @returns {{items:Array, total:number, page:number, totalPages:number}}
 */
export function queryPlaces(places, filters = {}) {
  const { query = '', categoryId = ALL_CATEGORIES, sortBy = SORT_OPTIONS.DISTANCE, page = 1 } = filters;

  const matched = sortPlaces(
    filterByCategory(filterByQuery(places, query), categoryId),
    sortBy,
  );

  const totalPages = Math.max(1, Math.ceil(matched.length / CONFIG.pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * CONFIG.pageSize;

  return {
    items: matched.slice(start, start + CONFIG.pageSize),
    total: matched.length,
    page: safePage,
    totalPages,
  };
}
