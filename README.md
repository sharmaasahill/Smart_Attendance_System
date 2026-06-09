# Smart Attendance System

![CI Status](https://github.com/sharmaasahill/Smart_Attendance_System/actions/workflows/ci.yml/badge.svg)

A production-grade attendance platform that marks attendance through **real-time
face recognition** with **active liveness detection**, plus role-based access,
admin management, and analytics.

Recognition is powered by **InsightFace (ArcFace, 512-d ONNX embeddings)** on the
backend and **MediaPipe FaceLandmarker** in the browser for genuine face
detection and a blink-based anti-spoofing challenge.

---

## Features

- **Automatic face attendance** — captures the moment a real, centered face passes a live blink check (no button press).
- **Advanced recognition** — ArcFace embeddings, all-image-per-user enrollment, cosine k-NN matching with a tuned threshold and real confidence scores.
- **Active liveness / anti-spoofing** — in-browser blink challenge (MediaPipe blendshapes) enforced on the attendance path.
- **Quality-gated enrollment** — detection score, face size, sharpness, and brightness checks.
- **Duplicate-face prevention** — a face can only be enrolled to one account.
- **Role-based access** — admin vs. user, JWT-authenticated.
- **Admin tools** — user/attendance management, face management, registered-face gallery.
- **Analytics** — trends, punctuality, anomalies, automated reports, CSV export.

## Tech stack

| Layer    | Technology |
|----------|------------|
| Frontend | React, Material UI, MediaPipe Tasks Vision |
| Backend  | FastAPI, SQLAlchemy, Pydantic Settings |
| ML       | InsightFace (SCRFD + ArcFace), onnxruntime, OpenCV |
| Database | PostgreSQL (production) / SQLite (local) |
| Auth     | JWT (python-jose), bcrypt |
| Ops      | Docker, docker-compose, Alembic |

## Project structure

```
backend/
  app/
    main.py                 # app factory, lifespan, router registration
    core/                   # config, security, logging
    db/                     # engine/session, declarative base
    models/                 # SQLAlchemy models
    schemas/                # Pydantic schemas
    services/               # face_recognition, analytics
    api/
      deps.py               # auth dependencies
      routers/              # auth, face, attendance, users, admin, analytics
  alembic/                  # database migrations
  scripts/                  # reencode_faces.py
  Dockerfile, requirements.txt
frontend/
  src/components/           # React components (FaceCamera, MarkAttendance, ...)
  src/services/api.js       # API client (env-driven base URL)
  public/models/, public/mediapipe/   # vendored MediaPipe model + WASM
  Dockerfile, nginx.conf
docker-compose.yml
```

---

## Quick start (Docker — recommended)

```bash
# from the repo root
docker compose up --build
```

- Frontend: <http://localhost:3000>
- API docs: <http://localhost:8000/docs>

Set secrets via environment (or a root `.env`): `SECRET_KEY`, `ADMIN_EMAIL`.

## Local development

### Backend

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate      # Windows
# source .venv/bin/activate                          # macOS/Linux
pip install -r requirements.txt
cp .env.example .env          # edit values

uvicorn app.main:app --reload --port 8000
```

The InsightFace model pack (`buffalo_l`) downloads automatically on first use.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env          # REACT_APP_API_URL
npm start
```

---

## Configuration

Backend settings are environment-driven (`backend/.env`, see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | local SQLite | e.g. `postgresql+psycopg2://user:pass@host:5432/db` |
| `SECRET_KEY` | dev value | JWT signing key (set a strong value in production) |
| `ADMIN_EMAIL` | — | email auto-assigned the admin role at registration |
| `BACKEND_CORS_ORIGINS` | `http://localhost:3000` | comma-separated allowed origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | JWT lifetime |

Frontend uses `REACT_APP_API_URL` to locate the backend.

## Database migrations

```bash
cd backend
alembic upgrade head                              # apply
alembic revision --autogenerate -m "message"      # create after model changes
```

## Maintenance scripts

```bash
cd backend
python -m scripts.reencode_faces   # rebuild embeddings from stored face images
```

---

## Security notes

- Face/biometric data (`backend/dataset/`) and the local DB are git-ignored.
- Always set a strong `SECRET_KEY` and restrict `BACKEND_CORS_ORIGINS` in production.
- Liveness is verified client-side; for hardened deployments consider adding a
  server-side passive anti-spoofing model.

## License

[MIT](LICENSE)
