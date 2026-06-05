/**
 * format.js
 * แปลงข้อมูลดิบให้เป็นข้อความที่ผู้ใช้อ่านง่าย (pure functions ล้วน)
 * ทุกการแสดงผลตัวเลข/หน่วย ต้องผ่านที่นี่ เพื่อให้รูปแบบทั้งเว็บสอดคล้องกัน
 */

/** คะแนนรีวิว: 4.4 -> "4.4" (ทศนิยม 1 ตำแหน่งเสมอ) */
export function formatRating(rating) {
  return Number(rating).toFixed(1);
}

/** จำนวนรีวิว: 12840 -> "12.8k", 980 -> "980" */
export function formatReviewCount(count) {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

/** ระดับราคา: 0 -> "ฟรี", 1 -> "฿", 2 -> "฿฿", 3 -> "฿฿฿" */
export function formatPriceLevel(level) {
  if (!level) return 'ฟรี';
  return '฿'.repeat(level);
}

/** ระยะทาง: 0.4 -> "400 ม.", 12.3 -> "12.3 กม." */
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} ม.`;
  return `${km.toFixed(1)} กม.`;
}

/** จำนวนผลลัพธ์: ใช้แสดงหัวตาราง/สรุปผล */
export function formatResultCount(count) {
  return `พบ ${count.toLocaleString('th-TH')} สถานที่`;
}
