# Smart Attendance System

![CI Status](https://github.com/sharmaasahill/Smart_Attendance_System/actions/workflows/ci.yml/badge.svg)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

A production-grade attendance platform that marks attendance through **real-time
face recognition** with **active liveness detection**, backed by role-based
access control, admin management, and analytics.

Recognition is powered by **InsightFace (ArcFace, 512-d ONNX embeddings)** on the
server and **MediaPipe FaceLandmarker** in the browser for genuine face detection
and a blink-based anti-spoofing challenge. Face embeddings and enrollment images
live in the database, so the backend is **stateless** and survives restarts and
redeploys.

## Live demo

| Surface | URL |
|---------|-----|
| Web app | https://smart-attendance-system-kappa-brown.vercel.app |
| API docs (Swagger) | https://sharmaasahill-smart-attendance-api.hf.space/docs |

> First request after a period of inactivity may take ~20–30s while the free
> backend instance wakes and loads the recognition model.

---

## Features

- **Automatic face attendance** — marks the moment a real, centered face passes a live blink check, no button press.
- **Advanced recognition** — ArcFace embeddings, all-images-per-user enrollment, cosine k-NN matching with a tuned threshold and real confidence scores.
- **Multi-frame voting** — several frames are matched independently and must agree, reducing false accepts/rejects.
- **Active liveness / anti-spoofing** — in-browser blink challenge (MediaPipe blendshapes), enforced server-side on the attendance path.
- **Identity-locked marking** — when a user is logged in, only their own face is accepted; another person's face is rejected. Anonymous (kiosk) mode can recognize any enrolled user.
- **Quality-gated enrollment** — detection score, face size, sharpness, and brightness checks.
- **Duplicate-face prevention** — a face can only be enrolled to one account.
- **Role-based access** — admin vs. user, JWT-authenticated.
- **Admin tools** — user/attendance management, face management, registered-face gallery, paginated lists.
- **Analytics** — trends, punctuality, anomalies, automated reports, CSV export (computed only from real records).
- **Timezone-correct** — attendance dates/times recorded in a configurable organization timezone.
- **Hardened** — strong-secret enforcement, rate limiting, security headers, password policy.

## Architecture

```
Browser (React + MediaPipe)         Vercel (static hosting / CDN)
        │  HTTPS / JWT
        ▼
FastAPI + InsightFace (ArcFace)      Hugging Face Spaces (Docker)
        │  SQLAlchemy
        ▼
PostgreSQL  (users, attendance, face_embeddings, face_images)   Neon
```

The frontend is a static bundle served by Vercel; it calls the FastAPI backend,
which runs the recognition model and reads/writes all data — including face
embeddings and images — in PostgreSQL.

## Tech stack

| Layer    | Technology |
|----------|------------|
| Frontend | React, Material UI, Framer Motion, MediaPipe Tasks Vision |
| Backend  | FastAPI, SQLAlchemy 2, Pydantic Settings, SlowAPI (rate limiting) |
| ML       | InsightFace (SCRFD + ArcFace), onnxruntime, OpenCV |
| Database | PostgreSQL (production) / SQLite (local) |
| Auth     | JWT (python-jose), bcrypt |
| Ops      | Docker, Alembic, GitHub Actions CI |
| Hosting  | Vercel (frontend), Hugging Face Spaces (backend), Neon (database) |

## Project structure

```
backend/
  app/
    main.py                 # app factory, lifespan (migrations + security checks)
    core/                   # config, security, logging, rate limiter, time utils
    db/                     # engine/session, declarative base
    models/                 # User, Attendance, FaceEmbedding, FaceImage
    schemas/                # Pydantic schemas
    services/               # face_recognition (DB-backed), analytics
    api/
      deps.py               # auth dependencies (required + optional)
      routers/              # auth, face, attendance, users, admin, analytics
  alembic/                  # database migrations
  scripts/                  # one-time data/maintenance scripts
  Dockerfile, requirements.txt
frontend/
  src/components/           # React components (MarkAttendance, AdminDashboard, ...)
  src/services/api.js       # API client (env-driven base URL)
  public/models/, public/mediapipe/   # vendored MediaPipe model + WASM
  vercel.json, Dockerfile
.github/workflows/ci.yml    # backend tests + frontend build on every push
```

---

## Quick start (Docker)

```bash
docker compose up --build
```

- Frontend: <http://localhost:3000>
- API docs: <http://localhost:8000/docs>

Set `SECRET_KEY` and `ADMIN_EMAIL` via environment or a root `.env`.

## Local development

### Backend

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate      # Windows
# source .venv/bin/activate                          # macOS/Linux
pip install -r requirements.txt
cp .env.example .env          # edit values; set DEBUG=true for local

python -m uvicorn app.main:app --reload --port 8000
```

The InsightFace model pack (`buffalo_l`) downloads automatically on first use.
Locally the app defaults to a SQLite database (zero setup).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env          # REACT_APP_API_URL=http://localhost:8000
npm start
```

---

## Configuration

Backend settings are environment-driven (`backend/.env`, see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | local SQLite | e.g. `postgresql+psycopg2://user:pass@host:5432/db?sslmode=require` |
| `SECRET_KEY` | dev value | JWT signing key — must be strong (>=32 chars) when `DEBUG=false` |
| `ADMIN_EMAIL` | — | email auto-assigned the admin role at registration |
| `BACKEND_CORS_ORIGINS` | `http://localhost:3000` | comma-separated allowed origins |
| `APP_TIMEZONE` | `Asia/Kolkata` | IANA timezone used for attendance dates/times |
| `DEBUG` | `false` | `true` relaxes the strong-secret check for local dev |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | JWT lifetime |
| `RATE_LIMIT_LOGIN` / `RATE_LIMIT_ATTENDANCE` | `5/minute` / `20/minute` | request throttles |

The frontend uses `REACT_APP_API_URL` (baked at build time) to locate the backend.

## Database & migrations

Schema is managed by Alembic and applied automatically at startup. To work with
it manually:

```bash
cd backend
alembic upgrade head                              # apply migrations
alembic revision --autogenerate -m "message"      # create after model changes
```

A one-time script migrates legacy on-disk face data into the database:

```bash
python -m scripts.migrate_faces_to_db
```

## Testing & CI

```bash
cd backend && pytest          # backend tests
cd frontend && npm test       # frontend tests
```

GitHub Actions runs the backend test suite and a production frontend build on
every push (`.github/workflows/ci.yml`).

---

## Deployment (free stack)

The project is deployed entirely on free tiers:

- **Database — Neon:** managed, always-on PostgreSQL. Persistent storage that a
  containerized backend can share across restarts.
- **Backend — Hugging Face Spaces (Docker):** 2 vCPU / 16 GB RAM free tier,
  enough headroom for the InsightFace model. The image pre-downloads the model
  so the first request is fast.
- **Frontend — Vercel:** global CDN for the static React bundle, auto-deploying
  on every push, with free HTTPS.

Backend environment (set as Space secrets): `DATABASE_URL`, `SECRET_KEY`,
`ADMIN_EMAIL`, `BACKEND_CORS_ORIGINS` (the Vercel URL), `DEBUG=false`.

## Security notes

- Biometric data (face embeddings and images) is stored in the database; local
  artifacts and `.env` files are git-ignored.
- A strong `SECRET_KEY` is enforced at startup in production, and
  `BACKEND_CORS_ORIGINS` should be restricted to your frontend origin.
- Rate limiting, security headers, and a password policy are enabled.
- Liveness is verified client-side; for hardened deployments consider adding a
  server-side passive anti-spoofing model.

## License

[MIT](LICENSE)
