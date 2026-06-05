/**
 * geo.js
 * คำนวณระยะทางเชิงภูมิศาสตร์ — หัวใจของฟีเจอร์ "สแกนพื้นที่"
 * แยกออกมาเป็นไฟล์เดียวเพราะเป็น logic เฉพาะทางและถูกทดสอบ/ใช้ซ้ำได้ (กฎข้อ 2, 9)
 */

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * ระยะทางระหว่างพิกัดสองจุดด้วยสูตร Haversine
 * @param {{lat:number, lng:number}} from
 * @param {{lat:number, lng:number}} to
 * @returns {number} ระยะทางหน่วยกิโลเมตร
 */
export function distanceKm(from, to) {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * จุดอยู่ในรัศมีที่กำหนดจากศูนย์กลางหรือไม่
 * @param {{lat:number, lng:number}} center จุดศูนย์กลาง (พื้นที่ที่เลือก)
 * @param {{lat:number, lng:number}} point จุดที่ตรวจ (สถานที่)
 * @param {number} radiusKm รัศมีกิโลเมตร
 */
export function isWithinRadius(center, point, radiusKm) {
  return distanceKm(center, point) <= radiusKm;
}
