---
title: Smart Attendance System API
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 8000
pinned: false
---

# Smart Attendance System — Backend API

FastAPI service for face-recognition attendance, powered by InsightFace
(ArcFace, 512-d embeddings) on onnxruntime (CPU). The backend is stateless:
face embeddings and enrollment images are stored in the database, so it
survives restarts and redeploys.

## Runtime configuration (environment variables)

| Variable | Description | Example |
| --- | --- | --- |
| `DATABASE_URL` | SQLAlchemy DSN. SQLite locally, PostgreSQL in production. | `postgresql+psycopg2://user:pass@host/db?sslmode=require` |
| `SECRET_KEY` | JWT signing key (>= 32 chars). Required when `DEBUG=false`. | output of `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `ADMIN_EMAIL` | Email that is granted the admin role on registration. | `you@example.com` |
| `BACKEND_CORS_ORIGINS` | Comma-separated allowed origins. | `https://your-app.vercel.app` |
| `DEBUG` | `true` for local dev (relaxes secret check). | `false` |

Schema is managed by Alembic and applied automatically at startup.

## Local development

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Docker

```bash
docker build -t attendance-api .
docker run -p 8000:8000 --env-file .env attendance-api
```

Interactive API docs are served at `/docs`.
