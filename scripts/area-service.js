/**
 * area-service.js
 * Business logic เกี่ยวกับ "พื้นที่" และการสแกนหาสถานที่ในรัศมี
 * เป็น pure logic — รับ data เข้า คืนผลลัพธ์ออก ไม่ยุ่งกับ DOM (กฎข้อ 2)
 */

import { distanceKm, isWithinRadius } from '../lib/geo.js';
import { CONFIG } from '../lib/constants.js';

/**
 * หาพื้นที่จาก id
 * @param {Array} areas
 * @param {string} areaId
 */
export function findArea(areas, areaId) {
  return areas.find((area) => area.id === areaId) ?? null;
}

/**
 * "สแกน" พื้นที่: คืนสถานที่ที่อยู่ในรัศมีของพื้นที่ที่เลือก
 * พร้อมแนบระยะทาง (distanceKm) ให้แต่ละสถานที่เพื่อใช้แสดงผล/เรียงลำดับ
 * @param {Object} area พื้นที่ศูนย์กลาง
 * @param {Array} places สถานที่ทั้งหมด
 * @param {number} [radiusKm]
 * @returns {Array} สถานที่ในพื้นที่ (แต่ละตัวมี field distanceKm เพิ่ม)
 */
export function scanArea(area, places, radiusKm = CONFIG.scanRadiusKm) {
  const center = { lat: area.lat, lng: area.lng };

  return places
    .filter((place) => isWithinRadius(center, place, radiusKm))
    .map((place) => ({
      ...place,
      distanceKm: distanceKm(center, place),
    }));
}
