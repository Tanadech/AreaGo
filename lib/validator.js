/**
 * validator.js
 * ตรวจสอบ/ทำความสะอาด input จากผู้ใช้ก่อนนำไปใช้
 * แยกออกมาเพื่อให้กฎการ validate อยู่ที่เดียว ไม่กระจายในหลายไฟล์
 */

/** ตัดช่องว่างหัวท้ายและบีบช่องว่างซ้ำให้เหลือช่องเดียว */
export function normalizeQuery(text) {
  return String(text ?? '').trim().replace(/\s+/g, ' ');
}

/** คำค้นใช้ได้จริงไหม (ต้องมีอย่างน้อย 1 ตัวอักษรที่ไม่ใช่ช่องว่าง) */
export function isValidQuery(text) {
  return normalizeQuery(text).length > 0;
}

/**
 * ตัดข้อความยาวเกินไป ป้องกัน UI ล้น
 * @param {string} text
 * @param {number} maxLength
 */
export function truncate(text, maxLength = 120) {
  const value = String(text ?? '');
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}
