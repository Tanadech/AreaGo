# API Contract — `/api/v1`

> REST, JSON, FastAPI + Pydantic v2. Auth = `Authorization: Bearer <access>`. Refresh = httpOnly cookie.
> Errors เป็นรูปแบบเดียว: `{ "error": { "code": "string", "message": "string", "details": {...} } }`.
> List endpoints รองรับ `?page=&size=&sort=` และคืน `{ "items": [...], "page", "size", "total" }`.

## Auth
| Method | Path | Body / Query | Auth | Description |
|--------|------|--------------|------|-------------|
| POST | `/auth/register` | `{email,password,display_name}` | – | สมัครสมาชิก (role=traveler) |
| POST | `/auth/login` | `{email,password}` | – | → access + set refresh cookie |
| POST | `/auth/google` | `{id_token}` | – | Google login/upsert |
| POST | `/auth/refresh` | (cookie) | – | rotate → access ใหม่ |
| POST | `/auth/logout` | (cookie) | user | revoke refresh family |
| GET  | `/auth/me` | – | user | profile + roles |

## Catalog (public read)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/categories` | place categories |
| GET | `/provinces` · `/provinces/{id}/districts` | geo lookup |
| GET | `/places` | filter: `category_id, kind, province_id, q, sort` (rating\|popular\|name) |
| GET | `/places/search` | `?lat=&lng=&radius_m=&category_id=` → geo radius (PostGIS) |
| GET | `/places/{id}` | detail + images + tags + (restaurant/shop ext) |
| GET | `/places/{id}/reviews` | paginated |
| GET | `/places/{id}/nearby` | `?radius_m=` ร้านอาหาร/สถานที่ใกล้เคียง (F11) |
| GET | `/restaurants` · `/shops` · `/activities` | filtered views ของ places |

## Member (auth required)
| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/favorites` | list / add `{place_id}` |
| DELETE | `/favorites/{place_id}` | remove |
| POST | `/places/{id}/reviews` | `{rating,comment}` (1 ต่อ place) |
| GET/POST | `/trips` | list mine / create |
| GET/PATCH/DELETE | `/trips/{id}` | detail (พร้อม items) / update / delete |
| POST | `/trips/{id}/items` | `{place_id,day_no,sort_order,start_time,...}` |
| PATCH/DELETE | `/trips/{id}/items/{itemId}` | reorder/update / remove |

## AI (auth + rate-limited)
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/ai/recommend` | `{lat,lng,prefs[],budget?}` | แนะนำสถานที่ (F11) |
| POST | `/ai/generate-trip` | `{province,days,budget,interests[],pace?}` | F12 → itinerary |
| POST | `/ai/summarize-reviews` | `{place_id}` | สรุปรีวิว → `reviews.ai_summary` |

**`POST /ai/generate-trip` response (ตัวอย่าง "เชียงใหม่ 3 วัน งบ 5,000"):**
```json
{
  "trip": {
    "title": "เชียงใหม่ 3 วัน",
    "province": "เชียงใหม่",
    "days": 3,
    "budget": 5000,
    "currency": "THB"
  },
  "itinerary": [
    { "day": 1, "items": [
        { "place_id": "uuid", "name": "วัดพระธาตุดอยสุเทพ", "start_time": "09:00",
          "duration_min": 90, "est_cost": 50, "category": "temple",
          "travel_to_next": { "mode": "car", "distance_km": 12.4, "minutes": 25 } }
    ]},
    { "day": 2, "items": [ ... ] },
    { "day": 3, "items": [ ... ] }
  ],
  "route": { "total_distance_km": 87.3, "total_travel_min": 210 },
  "budget_breakdown": { "food": 1800, "transport": 1200, "tickets": 900, "misc": 600, "total": 4500, "remaining": 500 },
  "nearby_restaurants": [ { "place_id": "uuid", "name": "ข้าวซอยแม่สาย", "rating": 4.6 } ]
}
```

**AI implementation note**: ใช้ Claude **tool use** — model เลือก place จาก candidate set ที่ backend ดึงจาก PostGIS ก่อน (grounding กัน hallucinate ชื่อสถานที่) แล้วจัดลำดับ/เวลา/งบ. ระยะทาง+เวลาเดินทางคำนวณจริงด้วย Google Directions API ไม่ใช่ให้ LLM เดา. ผลลัพธ์ validate ด้วย Pydantic ก่อนส่งกลับ; cache ตาม hash ของ input ใน Redis.

## Merchant / Admin
| Method | Path | Role | Notes |
|--------|------|------|-------|
| POST/PATCH | `/merchant/places` | merchant | สร้าง/แก้ร้านตัวเอง (status=pending) |
| GET | `/merchant/stats` | merchant | dashboard analytics |
| GET | `/admin/places?status=pending` | admin | คิวรออนุมัติ |
| POST | `/admin/places/{id}/approve` · `/reject` | admin | F10 |
| GET | `/admin/users` · `/admin/reviews` | admin | จัดการ |
| GET | `/admin/stats` | admin | platform analytics (F13) |

## Conventions
- Versioned ที่ path (`/api/v1`)
- Idempotency: PUT/PATCH ใช้ full/partial replace; create คืน `201` + `Location`
- Rate-limit headers: `X-RateLimit-Limit/Remaining/Reset`
- OpenAPI auto จาก FastAPI ที่ `/api/v1/openapi.json` (gen TS client ให้ web)
