# Smart Attendance System - Backend (FastAPI + InsightFace, CPU)
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System libraries required by OpenCV / InsightFace
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the InsightFace model pack so the image is self-contained
# (no model download on first request).
RUN python -c "from insightface.app import FaceAnalysis; a = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider']); a.prepare(ctx_id=-1, det_size=(640, 640))"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
