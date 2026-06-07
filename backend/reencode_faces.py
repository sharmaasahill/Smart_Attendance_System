#!/usr/bin/env python3
"""
Re-encode all enrolled users with the new InsightFace/ArcFace model.

The recognition model was upgraded from dlib (128-d) to InsightFace ArcFace
(512-d). The two embedding spaces are not compatible, so existing users must be
re-encoded. This script recomputes embeddings from each user's stored
``face_*.jpg`` images — no manual re-registration required.

Usage (from the backend directory):
    python reencode_faces.py
"""

import os
import glob

from face_recognition_service import FaceRecognitionService, DATASET_DIR


def main():
    if not os.path.isdir(DATASET_DIR):
        print(f"[ERROR] Dataset directory '{DATASET_DIR}' not found.")
        return

    service = FaceRecognitionService()
    user_dirs = [d for d in os.listdir(DATASET_DIR) if os.path.isdir(os.path.join(DATASET_DIR, d))]

    if not user_dirs:
        print("[INFO] No enrolled users found.")
        return

    print(f"[INFO] Re-encoding {len(user_dirs)} user(s) with model '{service.model_name}'...\n")
    ok, failed = 0, 0

    for user_id in user_dirs:
        images = sorted(glob.glob(os.path.join(DATASET_DIR, user_id, "face_*.jpg")))
        if not images:
            print(f"  [SKIP] {user_id}: no face images on disk")
            failed += 1
            continue
        try:
            result = service.train_user_face(user_id, images, check_liveness=False)
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
