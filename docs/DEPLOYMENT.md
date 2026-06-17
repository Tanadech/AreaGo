# GCP Deployment Runbook — `travel-planner-499706`

> รันบน **project เดียว** ที่มีอยู่: `travel-planner-499706` · region `asia-southeast1` · Cloud SQL instance `travel-db`.
> คำสั่งทั้งหมดสมมติว่า `gcloud auth login` แล้ว. ตั้ง project ก่อน:
> ```bash
> gcloud config set project travel-planner-499706
> export PROJECT_ID=travel-planner-499706
> export REGION=asia-southeast1
> export SQL_INSTANCE=travel-db
> export CONN_NAME=$PROJECT_ID:$REGION:$SQL_INSTANCE   # travel-planner-499706:asia-southeast1:travel-db
> ```

## สถานะปัจจุบัน (facts)
- ✅ Project + billing, ✅ Cloud Run API, ✅ Cloud SQL API, ✅ instance `travel-db` (PostgreSQL, asia-southeast1)
- ❌ database `travel_app`, ❌ Maps APIs, ❌ Artifact Registry / Secret Manager / WIF, ❌ services deployed

---

## STEP 1 — เปิด API ที่เหลือ (Priority 1)
```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com \
  servicenetworking.googleapis.com \
  vpcaccess.googleapis.com \
  maps-backend.googleapis.com \
  places-backend.googleapis.com \
  directions-backend.googleapis.com \
  geocoding-backend.googleapis.com \
  --project $PROJECT_ID
```
> `maps-backend` = Maps JavaScript API · `places-backend` = Places API · `directions-backend` = Directions API · `geocoding-backend` = Geocoding API.

## STEP 2 — สร้าง database + user + PostGIS (Priority 1)
```bash
# 2.1 application databases (prod + non-prod บน instance เดียว)
gcloud sql databases create travel_app     --instance=$SQL_INSTANCE
gcloud sql databases create travel_app_uat --instance=$SQL_INSTANCE
gcloud sql databases create travel_app_dev --instance=$SQL_INSTANCE

# 2.2 application DB user (อย่าใช้ postgres superuser ในแอป)
gcloud sql users create areascan_app --instance=$SQL_INSTANCE --password='<STRONG_PASSWORD>'

# 2.3 เปิด extensions — ต้องรันใน SQL (Cloud SQL รองรับ PostGIS)
#   วิธี A: Cloud SQL Auth Proxy แล้ว psql (แนะนำ), วิธี B: gcloud sql connect (ต้องเปิด public IP/authorized net ชั่วคราว)
gcloud sql connect $SQL_INSTANCE --user=postgres --database=travel_app
```
ใน psql ของแต่ละ database (`travel_app`, `travel_app_uat`, `travel_app_dev`):
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
GRANT ALL PRIVILEGES ON DATABASE travel_app TO areascan_app;
```
> Schema/table จริงจะถูกสร้างด้วย **Alembic migration** (รันใน CI ก่อน deploy) ไม่ใช่มือ.

## STEP 3 — Artifact Registry (เก็บ Docker images)
```bash
gcloud artifacts repositories create areascan \
  --repository-format=docker --location=$REGION \
  --description="AreaScan container images"

gcloud auth configure-docker $REGION-docker.pkg.dev   # ให้ docker push ได้
# image path: asia-southeast1-docker.pkg.dev/travel-planner-499706/areascan/<api|web>:<tag>
```

## STEP 4 — Secret Manager (ไม่มี secret ใน repo/compose ตอน deploy)
```bash
# DATABASE_URL สำหรับ Cloud Run = unix socket ผ่าน Cloud SQL connector (ไม่ใช่ host:port แบบ local)
printf '%s' "postgresql+asyncpg://areascan_app:<PW>@/travel_app?host=/cloudsql/$CONN_NAME" \
  | gcloud secrets create DATABASE_URL --data-file=-

printf '%s' "<generated-jwt-secret>"        | gcloud secrets create JWT_SECRET            --data-file=-
printf '%s' "<anthropic-key>"               | gcloud secrets create ANTHROPIC_API_KEY     --data-file=-
printf '%s' "<maps-server-key>"             | gcloud secrets create GOOGLE_MAPS_SERVER_KEY --data-file=-
printf '%s' "<oauth-client-id>"             | gcloud secrets create GOOGLE_OAUTH_CLIENT_ID --data-file=-
```

## STEP 5 — Runtime service account + IAM
```bash
gcloud iam service-accounts create areascan-run \
  --display-name="AreaScan Cloud Run runtime"
export RUN_SA=areascan-run@$PROJECT_ID.iam.gserviceaccount.com

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUN_SA" --role="roles/cloudsql.client"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUN_SA" --role="roles/secretmanager.secretAccessor"
```

## STEP 6 — Deploy services (asia-southeast1)
```bash
# Backend API — เชื่อม Cloud SQL ผ่าน connector, อ่าน secret จาก Secret Manager
gcloud run deploy areascan-api \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/areascan/api:<tag> \
  --region=$REGION --service-account=$RUN_SA \
  --add-cloudsql-instances=$CONN_NAME \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,GOOGLE_MAPS_SERVER_KEY=GOOGLE_MAPS_SERVER_KEY:latest,GOOGLE_OAUTH_CLIENT_ID=GOOGLE_OAUTH_CLIENT_ID:latest \
  --set-env-vars=ENV=prod,CORS_ORIGINS=https://<web-url> \
  --min-instances=1 --concurrency=80 --allow-unauthenticated

# Frontend Web — ชี้ไปที่ URL ของ api
export API_URL=$(gcloud run services describe areascan-api --region=$REGION --format='value(status.url)')
gcloud run deploy areascan-web \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/areascan/web:<tag> \
  --region=$REGION \
  --set-env-vars=NEXT_PUBLIC_API_BASE_URL=$API_URL/api/v1,NEXT_PUBLIC_GOOGLE_MAPS_KEY=<maps-browser-key> \
  --min-instances=0 --allow-unauthenticated
```
> **สำคัญ — Cloud SQL connection string ต่างจาก local**: บน Cloud Run ใช้ unix socket `host=/cloudsql/$CONN_NAME` (มาจาก `--add-cloudsql-instances`). docker-compose ฝั่ง local ใช้ `@db:5432`. ทั้งคู่ควบคุมด้วย env `DATABASE_URL` ตัวเดียว.
> **NEXT_PUBLIC_GOOGLE_MAPS_KEY** เป็น browser key (จำกัด HTTP referrer); **GOOGLE_MAPS_SERVER_KEY** (Places/Directions/Geocoding) อยู่ฝั่ง api เท่านั้น ห้ามหลุดมา client.

## STEP 7 — CI/CD auth ด้วย Workload Identity Federation (ไม่มี SA key ใน GitHub)
```bash
gcloud iam service-accounts create areascan-deployer --display-name="GitHub Actions deployer"
export DEPLOY_SA=areascan-deployer@$PROJECT_ID.iam.gserviceaccount.com
for ROLE in roles/run.admin roles/artifactregistry.writer roles/cloudsql.client \
            roles/iam.serviceAccountUser roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$DEPLOY_SA" --role=$ROLE
done

gcloud iam workload-identity-pools create github --location=global --display-name="GitHub"
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --workload-identity-pool=github --location=global \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='<OWNER>/<REPO>'"
# ผูก repo → impersonate deployer SA
gcloud iam service-accounts add-iam-policy-binding $DEPLOY_SA \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github/attribute.repository/<OWNER>/<REPO>"
```
GitHub secrets ที่ต้องตั้ง: `GCP_PROJECT_ID`, `GCP_WIF_PROVIDER` (resource name ของ provider), `GCP_DEPLOYER_SA`.

## CI/CD flow (`.github/workflows/deploy.yml` — scaffold กำลังสร้างโครง)
```
PR/push  → ci.yml: ruff+pytest (api), eslint+tsc+next build (web)
merge    → build images → push Artifact Registry
         → Alembic `upgrade head` (Cloud Run Job ต่อ env)
         → deploy areascan-api + areascan-web (env suffix)
         → smoke test GET /api/v1/health
prod     → ต้องผ่าน GitHub Environment approval ก่อน deploy
rollback → gcloud run services update-traffic areascan-api --to-revisions <PREV>=100 --region $REGION
```

## ของที่ยังไม่ต้องทำตอน MVP
- **Memorystore (Redis)**: ต้องมี Serverless VPC Access connector → เลื่อนไปทำตอนต้องใช้ cache/rate-limit จริง. MVP ให้ backend treat Redis เป็น optional (health check degrade ได้อยู่แล้ว).
- **Custom domain / HTTPS LB**: หลัง services ขึ้นแล้วค่อย map domain ผ่าน Cloud Run domain mapping หรือ external HTTPS LB + Cloud Armor.
