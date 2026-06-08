#!/usr/bin/env python3
"""
Re-encode all enrolled users with the InsightFace/ArcFace model.

Recomputes embeddings from each user's stored ``face_*.jpg`` images so existing
users keep working after a model change — no manual re-registration required.

Usage (from the backend directory):
    python -m scripts.reencode_faces
    # or
    python scripts/reencode_faces.py
"""

import glob
import os
import sys

# Ensure the backend root (containing the `app` package) is importable.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings  # noqa: E402
from app.services.face_recognition import face_service  # noqa: E402


def main():
    dataset_dir = settings.DATASET_DIR
    if not os.path.isdir(dataset_dir):
        print(f"[ERROR] Dataset directory '{dataset_dir}' not found.")
        return

    user_dirs = [d for d in os.listdir(dataset_dir) if os.path.isdir(os.path.join(dataset_dir, d))]
    if not user_dirs:
        print("[INFO] No enrolled users found.")
        return

    print(f"[INFO] Re-encoding {len(user_dirs)} user(s) with model '{face_service.model_name}'...\n")
    ok, failed = 0, 0

    for user_id in user_dirs:
        images = sorted(glob.glob(os.path.join(dataset_dir, user_id, "face_*.jpg")))
        if not images:
            print(f"  [SKIP] {user_id}: no face images on disk")
            failed += 1
            continue
        try:
            result = face_service.train_user_face(user_id, images, check_liveness=False)
            stats = result["statistics"]
            print(f"  [OK]   {user_id}: {stats['successfully_encoded']} embeddings "
                  f"(avg quality {stats['average_quality_score']:.1f})")
            ok += 1
        except Exception as e:
            print(f"  [FAIL] {user_id}: {e}")
            failed += 1

    print(f"\n[DONE] Re-encoded {ok} user(s); {failed} failed/skipped.")


if __name__ == "__main__":
    main()
