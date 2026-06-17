# MVP Roadmap — map กับ Priority ของโปรเจกต์

> เชื่อม Priority 1/2/3 ที่คุณวางไว้ เข้ากับ build phases (P0–P7) ใน ARCHITECTURE.md §6.

## ภาพรวม sprint

| Sprint | เป้าหมาย | ครอบ Priority | Phase | Acceptance |
|--------|----------|---------------|-------|------------|
| **S0** (now) | GCP foundation + repo scaffold | P1.1, P1.2 | P0,P1 | `docker compose up` รันได้ local; `travel_app` + Maps APIs พร้อม |
| **S1** | Backend core: auth + places + geo search | P2.5, P3.9 | P2 | login/refresh ได้; `/places/search` คืนผลตามรัศมีจริง (PostGIS) |
| **S2** | Frontend core: map + places + search + auth | P2.6 | P3 | web เชื่อม api; แผนที่แสดง marker จาก DB; ค้นหาได้ |
| **S3** | Trip planner + บันทึก + favorites + reviews | P3.10 | P4 | สร้าง/บันทึก trip + รีวิวได้ |
| **S4** | AI: recommend + trip generator | P3.11 | P4 | "เชียงใหม่ 3 วัน งบ 5,000" → itinerary + route + budget จริง |
| **S5** | Merchant/Admin dashboard + approve flow | P3.12 | P5 | admin อนุมัติร้าน; analytics ขึ้น |
| **S6** | Deploy 3 env + CI/CD + data migration | P2.7, P2.8 | P6,P7 | push → auto deploy Cloud Run; ข้อมูลเดิม seed เข้า Postgres |

## ทำได้เลย "วันนี้" (S0 — ไม่ต้องรอโค้ด)
ขนานกันได้ 2 สาย:

**สาย A — GCP (คุณรันได้เลย, ดู DEPLOYMENT.md):**
1. เปิด API ที่เหลือ (STEP 1)
2. สร้าง `travel_app` + user + PostGIS (STEP 2) — *Priority 1 ข้อ 1*
3. สร้าง browser Maps key (จำกัด referrer) + server Maps key แยกกัน — *Priority 1 ข้อ 2*
4. สร้าง Artifact Registry repo (STEP 3)

**สาย B — โค้ด (ผมทำ, กำลังรัน):**
1. ✅ Design docs (ARCHITECTURE / DATABASE / API / DEPLOYMENT / นี้)
2. 🔄 Monorepo scaffold (`apps/api`, `apps/web`, docker-compose, CI skeleton)
3. ⏭ ถัดไป: Alembic migration จาก schema → สร้างตารางจริงใน `travel_app`

## Critical path / ความเสี่ยง
- **PostGIS บน Cloud SQL**: ยืนยัน `CREATE EXTENSION postgis` ได้ก่อนเขียน geo query (รองรับ แต่ต้องเปิดเอง)
- **AI grounding**: ห้ามให้ LLM แต่งชื่อสถานที่ — ต้องดึง candidate จาก DB ก่อนเสมอ (ดู API.md)
- **Maps cost**: Directions/Places มีค่าใช้จ่ายต่อ call → cache ผลใน Redis/DB; ตั้ง quota + budget alert
- **Secret hygiene**: key เดิมใน `index.html` หลุด git → rotate ก่อนใช้ใหม่
