#!/usr/bin/env python3
"""
One-time migration: move on-disk face data (dataset/<uid>/encoding.pkl + face_*.jpg)
into the database (FaceEmbedding / FaceImage), making the backend stateless.

Run AFTER the schema migration has been applied (start the server once, or run
`python -m alembic upgrade head`), then:

    python -m scripts.migrate_faces_to_db
"""

import glob
import json
import os
import pickle
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models import FaceEmbedding, FaceImage, User  # noqa: E402


def main():
    dataset_dir = settings.DATASET_DIR
    if not os.path.isdir(dataset_dir):
        print(f"[INFO] No dataset directory at '{dataset_dir}'. Nothing to migrate.")
        return

    db = SessionLocal()
    migrated, skipped = 0, 0
    try:
        for unique_id in sorted(os.listdir(dataset_dir)):
            user_dir = os.path.join(dataset_dir, unique_id)
            enc_path = os.path.join(user_dir, "encoding.pkl")
            if not os.path.isfile(enc_path):
                continue

            user = db.query(User).filter(User.unique_id == unique_id).first()
            if not user:
                print(f"  [SKIP] {unique_id}: no matching user in DB")
                skipped += 1
                continue

            if db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user.id).first():
                print(f"  [SKIP] {unique_id}: already in DB")
                skipped += 1
                continue

            try:
                with open(enc_path, "rb") as f:
                    data = pickle.load(f)
                if "embeddings" not in data:
                    print(f"  [SKIP] {unique_id}: legacy encoding format (re-enroll needed)")
                    skipped += 1
                    continue
                arr = np.asarray(data["embeddings"], dtype=np.float32)
                if arr.ndim == 1:
                    arr = arr.reshape(1, -1)

                # Per-image quality (optional)
                quality_map = {}
                q_path = os.path.join(user_dir, "quality_scores.json")
                if os.path.isfile(q_path):
                    with open(q_path) as qf:
                        for face in json.load(qf).get("faces", []):
                            quality_map[face.get("image")] = face.get("overall_score")

                db.add(FaceEmbedding(
                    user_id=user.id,
                    embeddings=arr.tobytes(),
                    count=int(arr.shape[0]),
                    dim=int(arr.shape[1]),
                    model=data.get("model", settings.FACE_MODEL_PACK),
                ))

                images = sorted(glob.glob(os.path.join(user_dir, "face_*.jpg")))
                for pos, img_path in enumerate(images, start=1):
                    with open(img_path, "rb") as imgf:
                        blob = imgf.read()
                    db.add(FaceImage(
                        user_id=user.id,
                        position=pos,
                        image_data=blob,
                        quality_score=quality_map.get(os.path.basename(img_path)),
                    ))

                user.face_registered = True
                db.commit()
                print(f"  [OK]   {unique_id}: {arr.shape[0]} embeddings, {len(images)} images")
                migrated += 1
            except Exception as e:
                db.rollback()
                print(f"  [FAIL] {unique_id}: {e}")
                skipped += 1
    finally:
        db.close()

    print(f"\n[DONE] Migrated {migrated} user(s); {skipped} skipped.")


if __name__ == "__main__":
    main()
