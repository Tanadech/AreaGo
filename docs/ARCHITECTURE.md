# AreaScan Tourism Platform — Architecture Blueprint

> เวอร์ชัน 1.0 · เฟส Design (ก่อนลงโค้ด) · เป้าหมาย: Production-ready, cloud-native บน Google Cloud

---

## 1. Requirement Analysis

### 1.1 Functional Requirements
| # | Feature | Actor | Notes |
|---|---------|-------|-------|
| F1 | แผนที่ Google Maps + markers | Traveler | Places/Restaurants/Shops layers |
| F2–F4 | แสดงสถานที่ / ร้านอาหาร / ร้านค้า | Traveler | filter, sort, pagination |
| F5 | ค้นหาสถานที่ (text + geo radius) | Traveler | full-text + spatial query |
| F6 | รายละเอียดสถานที่ + รีวิว + รูป | Traveler | |
| F7–F8 | Trip Planner + บันทึกแผน | Member | CRUD trips, trip_items |
| F9 | ระบบสมาชิก (JWT + Google) | All | refresh token rotation |
| F10 | Admin จัดการข้อมูล/อนุมัติร้าน | Admin | RBAC |
| F11 | AI Travel Recommendation | Member | Claude API |
| F12 | AI Trip Generator | Member | "เชียงใหม่ 3 วัน งบ 5,000" → itinerary |
| F13 | Dashboard / Analytics | Merchant, Admin | |

### 1.2 Non-Functional Requirements
- **Performance**: p95 API < 300ms (ยกเว้น AI endpoints), spatial query ใช้ index
- **Scalability**: stateless services, scale-to-zero บน Cloud Run
- **Security**: OWASP Top 10, JWT + refresh rotation, rate limiting, secrets ใน Secret Manager
- **Availability**: 3 envs (dev/uat/prod), zero-downtime deploy (Cloud Run revisions)
- **Observability**: structured logs → Cloud Logging, request tracing
- **i18n**: TH primary, EN secondary (ฟิลด์ `name_th` / `name_en`)

### 1.3 MVP Cut (เฟสแรกที่จะ ship)
Auth → Places (list/detail/search/geo) → Map → Trip Planner → AI Trip Generator → Admin approve. (Merchant analytics + review AI summary เป็นเฟส 2)

---

## 2. Target Architecture

```
                         ┌─────────────────────────────────────────┐
        Browser ───────► │  Cloud Run: web  (Next.js 15, SSR/ISR)   │
   (TH users, mobile)    │  - React Query, Zustand, Tailwind        │
                         │  - Google Maps JS SDK                    │
                         └───────────────┬─────────────────────────┘
                                         │ HTTPS /api/v1 (JWT Bearer)
                                         ▼
                         ┌─────────────────────────────────────────┐
                         │  Cloud Run: api  (FastAPI, Python 3.12)  │
                         │  - SQLAlchemy 2.0 (async) + Pydantic v2  │
                         │  - Auth, RBAC, rate-limit, validation    │
                         └───┬───────────────┬───────────────┬──────┘
                             │               │               │
                  ┌──────────▼───┐   ┌───────▼──────┐  ┌──────▼─────────┐
                  │ Cloud SQL    │   │ Memorystore  │  │ External APIs  │
                  │ Postgres 16  │   │ Redis        │  │ - Claude API   │
                  │ + PostGIS    │   │ (cache,      │  │ - Google Maps  │
                  │              │   │  rate-limit) │  │   (Places/Dir) │
                  └──────────────┘   └──────────────┘  └────────────────┘

  Cross-cutting GCP: Artifact Registry · Cloud Storage (images) ·
  Secret Manager · Cloud Logging/Monitoring · IAM service accounts
```

### 2.1 Why this architecture
| Decision | เหตุผล | Trade-off / ทางเลือกที่ตัดทิ้ง |
|----------|--------|-------------------------------|
| 2 Cloud Run services (web/api) แยกกัน | scale อิสระ, deploy แยก, ภาษาต่างกัน | ตัด: monolith เดียว (ง่ายกว่าแต่ผูก lifecycle) |
| FastAPI async + SQLAlchemy 2.0 async | throughput สูงกับ I/O-bound, type-safe กับ Pydantic | ตัด: Django (หนักเกินสำหรับ API-only) |
| PostGIS แทน geo lib ฝั่งแอป | spatial index (GIST) เร็วและถูกต้องระดับ DB | ตัด: คำนวณ Haversine ใน Python (ช้า, scan เต็ม) |
| Redis cache + rate-limit | ลด DB load, sliding-window limiter | optional ตอน dev (fakeredis) |
| Next.js App Router (SSR/ISR) | SEO หน้า place, hydrate React Query | ตัด: SPA ล้วน (SEO แย่กับหน้า public) |
| Claude API สำหรับ AI | quality สูง, structured output (tool use) | ต้องคุม cost ด้วย cache + model tiering |

---

## 3. Folder Structure (Monorepo)

```
areascan/
├── apps/
│   ├── web/                      # Next.js 15 (App Router)
│   │   ├── src/app/              # routes (route groups: (public) (member) (admin))
│   │   ├── src/components/
│   │   ├── src/features/         # map, places, trips, ai (feature-sliced)
│   │   ├── src/lib/              # api client, query keys, maps loader
│   │   ├── src/stores/           # zustand
│   │   └── Dockerfile
│   └── api/                      # FastAPI
│       ├── app/
│       │   ├── main.py
│       │   ├── core/             # config, security, db, redis, logging
│       │   ├── models/           # SQLAlchemy ORM
│       │   ├── schemas/          # Pydantic
│       │   ├── api/v1/           # routers per resource
│       │   ├── services/         # business logic (places, trips, ai, geo)
│       │   ├── repositories/     # data access
│       │   └── deps.py           # FastAPI dependencies (auth, db session)
│       ├── alembic/              # migrations
│       ├── tests/
│       └── Dockerfile
├── infra/
│   ├── terraform/                # GCP IaC per env (modules + envs/)
│   └── sql/                      # seed, extensions, PostGIS init
├── .github/workflows/            # ci.yml, deploy.yml
├── docs/                         # ← this blueprint (ARCHITECTURE/DATABASE/API)
└── docker-compose.yml            # local: postgis + redis + api + web
```

See **DATABASE.md** (schema) and **API.md** (contract).

---

## 4. Security Design

| Control | Implementation |
|---------|----------------|
| Authentication | JWT access (15 min, RS256) + refresh token (7 วัน, httpOnly+Secure+SameSite=Strict cookie) |
| Refresh rotation | เก็บ **hash** ของ refresh token ใน `refresh_tokens`, rotate ทุกครั้ง + detect reuse → revoke ทั้ง family |
| Google Login | OAuth code flow → verify `id_token` (google_sub) → upsert user |
| Password | Argon2id (`argon2-cffi`) |
| Authorization | RBAC ผ่าน `roles`/`user_roles`, FastAPI dependency `require_role(...)` |
| Rate limiting | Redis sliding-window (`slowapi`) — login 5/min, AI 10/min, public read 120/min |
| Input validation | Pydantic v2 ทุก request body/query |
| SQL injection | SQLAlchemy parameterized เท่านั้น — ห้าม raw f-string SQL |
| XSS | React escape by default + sanitize HTML ที่ผู้ใช้ป้อน (รีวิว) ด้วย bleach/DOMPurify |
| CSRF | refresh cookie = SameSite=Strict + double-submit token สำหรับ state-changing |
| Secrets | Secret Manager (DB url, JWT keys, Claude key, Maps server key) — ไม่มี secret ใน repo |
| Headers | CSP, HSTS, X-Content-Type-Options, Referrer-Policy ผ่าน middleware |
| Maps key | client key จำกัด HTTP referrer + เฉพาะ Maps JS; server key (Places/Directions) เก็บฝั่ง API เท่านั้น |

> ⚠️ **Action item ทันที**: key `AIzaSyC8...` ใน `index.html` ของแอปเดิมหลุดใน git แล้ว — ต้อง **rotate** และตั้ง referrer restriction ก่อนนำไปใช้ที่ไหนก็ตาม

---

## 5. Deployment Design

### 5.1 Environments (อัปเดตให้ตรง GCP จริง)
> ของจริง: **project เดียว** `travel-planner-499706`, region `asia-southeast1`, Cloud SQL instance `travel-db` (มีแล้ว).
> MVP เริ่มแบบ single-project + แยก env ด้วย service suffix + แยก database บน instance เดียว; ค่อยแยก prod ออกเป็น project ของตัวเองก่อน go-live จริง. รายละเอียด command ดู **DEPLOYMENT.md**.

| Env | Cloud Run services | Database (บน `travel-db`) | Trigger |
|-----|--------------------|---------------------------|---------|
| Dev | `areascan-api-dev`, `areascan-web-dev` | `travel_app_dev` | push → `develop` |
| UAT | `areascan-api-uat`, `areascan-web-uat` | `travel_app_uat` | push → `release/*` / manual |
| Prod | `areascan-api`, `areascan-web` | `travel_app` | tag `v*` + manual approval |

> หมายเหตุ cost: instance เดียวหลาย database โอเคสำหรับ MVP. ก่อน production จริงควรแยก prod ไปอีก instance (HA + PITR) และพิจารณาแยก GCP project เพื่อ blast-radius isolation.

### 5.2 CI/CD (GitHub Actions)
```
ci.yml (ทุก PR):   lint (ruff/eslint) → typecheck (mypy/tsc) → unit tests → build check
deploy.yml:        build image → push Artifact Registry → run Alembic migration job
                   → deploy Cloud Run (web+api) → smoke test → (prod: manual approve gate)
```
- Auth ไปยัง GCP ด้วย **Workload Identity Federation** (ไม่มี long-lived SA key ใน GitHub)
- Migrations รันเป็น Cloud Run **Job** ก่อน deploy service ใหม่
- Rollback = `gcloud run services update-traffic --to-revisions PREV=100`

### 5.3 Runtime
- web: `min-instances=0` (dev/uat), `=1` (prod), concurrency 80
- api: `min-instances=0/1`, connect Cloud SQL ผ่าน Cloud SQL connector (private IP + VPC connector สำหรับ prod)
- images → Cloud Storage bucket ต่อ env, เสิร์ฟผ่าน signed URL / CDN

---

## 6. Build Roadmap (เฟสถัดไป)

| Phase | Scope | Output |
|-------|-------|--------|
| **P0 — Design** ✅ | blueprint นี้ | docs/ |
| **P1 — Scaffold** | monorepo skeleton, docker-compose (postgis+redis), config, healthcheck | รันแอปเปล่าได้ local |
| **P2 — Backend core** | models + Alembic + auth (JWT/refresh/Google) + RBAC + places/categories CRUD + geo search | API + tests |
| **P3 — Frontend core** | Next.js shell, auth, map, places list/detail/search, React Query + Zustand | web เชื่อม API |
| **P4 — Trips + AI** | trips/trip_items CRUD, AI recommend, AI trip generator (Claude tool use) | F7,F8,F11,F12 |
| **P5 — Merchant/Admin** | dashboards, approve flow, analytics | F10,F13 |
| **P6 — Infra/CI/CD** | Terraform GCP, GitHub Actions, deploy 3 envs | live บน Cloud Run |
| **P7 — Migrate data** | แปลง `data/*.json` เดิม → seed Postgres, ย้ายแอปเก่าไป `legacy/` | |

ผมจะเดินทีละเฟส แต่ละเฟสมี: design diff → code → test → verify ก่อนไปต่อ
