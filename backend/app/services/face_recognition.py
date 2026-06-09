"""
Advanced face recognition service.

Uses InsightFace (SCRFD detector + ArcFace w600k_r50 512-d embeddings, ONNX /
onnxruntime, CPU-capable) for detection and recognition.

Design highlights (production-oriented):
  * Stores ALL per-image embeddings per user (not a single averaged vector).
  * Matching uses cosine similarity with per-user best-match + k-NN voting and
    a tuned threshold, returning a real confidence score.
  * In-memory embedding matrix cache, refreshed by file mtime, for fast
    vectorized comparison against every enrolled embedding at once.
"""

import os
import json
import pickle
import logging
from datetime import datetime
from typing import List, Optional, Dict

import cv2
import numpy as np

from app.core.config import settings

logger = logging.getLogger("smart_attendance.face")

DATASET_DIR = settings.DATASET_DIR


class FaceRecognitionService:
    def __init__(self):
        self.model_name = settings.FACE_MODEL_PACK
        self.det_size = (640, 640)

        # Cosine-similarity thresholds for ArcFace L2-normalized embeddings.
        self.match_threshold = settings.FACE_MATCH_THRESHOLD
        self.duplicate_threshold = settings.FACE_DUPLICATE_THRESHOLD
        self.knn_k = settings.FACE_KNN_K

        # Real quality gates (used at enrollment).
        self.min_det_score = settings.FACE_MIN_DET_SCORE
        self.min_face_size = settings.FACE_MIN_FACE_SIZE
        self.min_blur_var = settings.FACE_MIN_BLUR_VAR
        self.min_quality_score = settings.FACE_MIN_QUALITY_SCORE
        self.min_required_encodings = settings.FACE_MIN_ENCODINGS

        # Liveness is enforced on the attendance path via the client-side
        # active blink/motion check (MediaPipe). Kept for API compatibility.
        self.enable_liveness_check = True
        self.min_liveness_confidence = 20

        self.recognition_max_dim = 1024  # downscale very large frames before detection

        self._app = None  # lazily initialized FaceAnalysis

        # In-memory embedding cache (flattened across all users).
        self._cache_embeddings = None   # np.ndarray (M, 512) float32, L2-normalized
        self._cache_labels = []         # length M; user_id for each row
        self._cache_mtimes = {}         # user_id -> encoding.pkl mtime

    # ------------------------------------------------------------------ #
    # Model
    # ------------------------------------------------------------------ #
    @property
    def app(self):
        """Lazily load the InsightFace model pack (first use only)."""
        if self._app is None:
            from insightface.app import FaceAnalysis
            logger.info(f"Loading InsightFace model pack '{self.model_name}' (CPU)...")
            app = FaceAnalysis(name=self.model_name, providers=["CPUExecutionProvider"])
            app.prepare(ctx_id=-1, det_size=self.det_size)
            self._app = app
            logger.info("InsightFace model loaded.")
        return self._app

    def _read_image(self, image_path: str) -> Optional[np.ndarray]:
        img = cv2.imread(image_path)
        if img is None:
            logger.warning(f"Could not read image: {image_path}")
            return None
        h, w = img.shape[:2]
        longest = max(h, w)
        if longest > self.recognition_max_dim:
            scale = self.recognition_max_dim / longest
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        return img

    @staticmethod
    def _largest_face(faces):
        """Return the face with the biggest bounding box (closest to camera)."""
        if not faces:
            return None
        return max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

    def _detect_primary_face(self, image_path: str):
        img = self._read_image(image_path)
        if img is None:
            return None, None
        faces = self.app.get(img)
        return self._largest_face(faces), img

    def get_embedding(self, image_path: str) -> Optional[np.ndarray]:
        """Return the L2-normalized 512-d ArcFace embedding for the primary face."""
        face, _ = self._detect_primary_face(image_path)
        if face is None:
            return None
        return np.asarray(face.normed_embedding, dtype=np.float32)

    # ------------------------------------------------------------------ #
    # Quality (real, InsightFace + OpenCV based)
    # ------------------------------------------------------------------ #
    def check_image_quality(self, image_path: str) -> Dict:
        """
        Assess real face quality using detection score, face size, sharpness
        (Laplacian variance) and brightness. Returns a 0-100 overall score.
        """
        try:
            img = self._read_image(image_path)
            if img is None:
                return self._quality_fail("Could not load image")

            faces = self.app.get(img)
            if not faces:
                return self._quality_fail("No face detected", recommendation="Face the camera with good lighting")

            face = self._largest_face(faces)
            x1, y1, x2, y2 = [int(v) for v in face.bbox]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(img.shape[1], x2), min(img.shape[0], y2)
            face_w, face_h = x2 - x1, y2 - y1
            face_size = min(face_w, face_h)

            crop = img[y1:y2, x1:x2]
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if crop.size else None
            blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var()) if gray is not None and gray.size else 0.0
            brightness = float(np.mean(gray)) if gray is not None and gray.size else 0.0

            det_score = float(face.det_score)

            det_component = min(100.0, det_score * 100.0)
            size_component = min(100.0, (face_size / max(1, self.min_face_size)) * 60.0)
            sharp_component = min(100.0, (blur_var / max(1.0, self.min_blur_var)) * 60.0)
            if brightness <= 0:
                bright_component = 0.0
            elif brightness < 60:
                bright_component = (brightness / 60.0) * 60.0
            elif brightness > 210:
                bright_component = max(0.0, 100.0 - (brightness - 210))
            else:
                bright_component = 100.0

            overall = round(
                det_component * 0.35
                + size_component * 0.25
                + sharp_component * 0.25
                + bright_component * 0.15,
                1,
            )

            issues = []
            if det_score < self.min_det_score:
                issues.append("Low detection confidence")
            if face_size < self.min_face_size:
                issues.append("Face too small / too far")
            if blur_var < self.min_blur_var:
                issues.append("Image too blurry")
            if brightness < 60:
                issues.append("Too dark")
            elif brightness > 210:
                issues.append("Overexposed")

            is_acceptable = (
                det_score >= self.min_det_score
                and face_size >= self.min_face_size
                and blur_var >= self.min_blur_var
                and overall >= self.min_quality_score
            )

            return {
                "is_acceptable": is_acceptable,
                "overall_score": overall,
                "metrics": {
                    "det_score": round(det_score, 3),
                    "face_size_px": int(face_size),
                    "sharpness": round(blur_var, 1),
                    "brightness": round(brightness, 1),
                },
                "issues": issues,
                "recommendations": ["Move closer with steady, well-lit framing"] if issues else [],
            }
        except Exception as e:
            logger.error(f"Quality check failed for {image_path}: {str(e)}")
            return self._quality_fail(f"Quality check error: {str(e)}")

    @staticmethod
    def _quality_fail(reason: str, recommendation: str = "Try capturing again") -> Dict:
        return {
            "is_acceptable": False,
            "overall_score": 0,
            "metrics": {},
            "issues": [reason],
            "recommendations": [recommendation],
        }

    def check_image_liveness(self, image_path: str) -> Dict:
        """
        Passive single-frame liveness cannot be done reliably without a
        dedicated anti-spoofing model. Real liveness is enforced on the
        attendance path via the client-side active blink/motion challenge.
        This returns a face-presence based response for API compatibility.
        """
        face, _ = self._detect_primary_face(image_path)
        present = face is not None
        return {
            "is_live": present,
            "confidence": round(float(face.det_score) * 100, 1) if present else 0.0,
            "spoof_probability": 0.0 if present else 100.0,
            "checks_passed": {"face_present": present},
            "recommendations": [] if present else ["No face detected"],
            "note": "Active blink/motion liveness is verified client-side at capture time.",
        }

    def validate_face_image(self, image_path: str) -> bool:
        face, _ = self._detect_primary_face(image_path)
        return face is not None

    # ------------------------------------------------------------------ #
    # Enrollment
    # ------------------------------------------------------------------ #
    def train_user_face(self, user_id: str, image_paths: List[str], check_liveness: bool = True) -> Dict:
        """
        Enroll a user by extracting and storing ALL per-image ArcFace
        embeddings (no averaging). Returns success status and statistics.
        """
        try:
            logger.info(f"Enrolling user {user_id} from {len(image_paths)} images using {self.model_name}")

            quality_reports = []
            embeddings = []
            per_face_quality = []

            for image_path in image_paths:
                quality = self.check_image_quality(image_path)
                quality_reports.append({"image": os.path.basename(image_path), **quality})

                if not quality["is_acceptable"]:
                    logger.warning(f"Rejected (quality) {os.path.basename(image_path)}: {quality['issues']}")
                    continue

                emb = self.get_embedding(image_path)
                if emb is None:
                    logger.warning(f"No embedding extracted from {os.path.basename(image_path)}")
                    continue

                embeddings.append(emb)
                per_face_quality.append({
                    "image": os.path.basename(image_path),
                    "overall_score": quality["overall_score"],
                    "accepted": True,
                    **quality.get("metrics", {}),
                })

            acceptable = len(embeddings)
            if acceptable < self.min_required_encodings:
                raise Exception(
                    f"Only {acceptable} usable face image(s); need at least "
                    f"{self.min_required_encodings}. Retake with clear, well-lit, front-facing photos."
                )

            embeddings_arr = np.vstack(embeddings).astype(np.float32)

            user_dir = os.path.join(DATASET_DIR, user_id)
            os.makedirs(user_dir, exist_ok=True)

            payload = {
                "user_id": user_id,
                "embeddings": embeddings_arr,        # (N, 512) L2-normalized
                "count": int(embeddings_arr.shape[0]),
                "model": self.model_name,
                "dim": int(embeddings_arr.shape[1]),
                "created_at": datetime.utcnow().isoformat(),
            }
            with open(os.path.join(user_dir, "encoding.pkl"), "wb") as f:
                pickle.dump(payload, f)

            with open(os.path.join(user_dir, "encoding.json"), "w") as f:
                json.dump({
                    "user_id": user_id,
                    "count": payload["count"],
                    "model": self.model_name,
                    "dim": payload["dim"],
                    "created_at": payload["created_at"],
                }, f, indent=2)

            with open(os.path.join(user_dir, "quality_scores.json"), "w") as f:
                json.dump({"faces": [
                    {"image": q["image"], "overall_score": q["overall_score"], "accepted": True}
                    for q in per_face_quality
                ]}, f, indent=2)

            avg_quality = float(np.mean([q["overall_score"] for q in per_face_quality])) if per_face_quality else 0.0
            logger.info(f"Enrolled {user_id} with {payload['count']} embeddings (avg quality {avg_quality:.1f})")

            return {
                "success": True,
                "message": f"Enrolled with {payload['count']} high-quality face embeddings",
                "statistics": {
                    "total_images": len(image_paths),
                    "acceptable_images": acceptable,
                    "successfully_encoded": payload["count"],
                    "rejected_images": len(image_paths) - acceptable,
                    "average_quality_score": avg_quality,
                    "liveness_checked": False,
                    "average_liveness_confidence": None,
                    "model": self.model_name,
                },
                "quality_reports": quality_reports,
                "liveness_reports": None,
            }
        except Exception as e:
            logger.error(f"Enrollment failed for {user_id}: {str(e)}")
            raise Exception(f"Face enrollment failed: {str(e)}")

    # ------------------------------------------------------------------ #
    # Embedding cache
    # ------------------------------------------------------------------ #
    def _refresh_cache(self):
        """Reload only changed users' embeddings, drop removed users, rebuild matrix."""
        if not os.path.exists(DATASET_DIR):
            self._cache_embeddings, self._cache_labels, self._cache_mtimes = None, [], {}
            return

        per_user = {}
        changed = False
        current_ids = set()
        if self._cache_embeddings is not None:
            for uid in set(self._cache_labels):
                rows = self._cache_embeddings[[i for i, l in enumerate(self._cache_labels) if l == uid]]
                per_user[uid] = rows

        for user_id in os.listdir(DATASET_DIR):
            enc = os.path.join(DATASET_DIR, user_id, "encoding.pkl")
            if not os.path.isfile(enc):
                continue
            current_ids.add(user_id)
            try:
                mtime = os.path.getmtime(enc)
            except OSError:
                continue
            if self._cache_mtimes.get(user_id) == mtime and user_id in per_user:
                continue
            try:
                with open(enc, "rb") as f:
                    data = pickle.load(f)
                if "embeddings" not in data:
                    logger.warning(f"Skipping legacy/incompatible encoding for {user_id} (re-enroll needed)")
                    per_user.pop(user_id, None)
                    continue
                emb = np.asarray(data["embeddings"], dtype=np.float32)
                if emb.ndim == 1:
                    emb = emb.reshape(1, -1)
                per_user[user_id] = emb
                self._cache_mtimes[user_id] = mtime
                changed = True
            except Exception as e:
                logger.error(f"Failed to load embeddings for {user_id}: {str(e)}")

        for uid in list(per_user.keys()):
            if uid not in current_ids:
                per_user.pop(uid, None)
                self._cache_mtimes.pop(uid, None)
                changed = True

        if changed or self._cache_embeddings is None:
            labels, mats = [], []
            for uid, emb in per_user.items():
                mats.append(emb)
                labels.extend([uid] * emb.shape[0])
            self._cache_embeddings = np.vstack(mats).astype(np.float32) if mats else None
            self._cache_labels = labels

    # ------------------------------------------------------------------ #
    # Recognition
    # ------------------------------------------------------------------ #
    def recognize(self, image_path: str) -> Optional[Dict]:
        """
        Recognize the primary face. Returns dict with user_id, confidence and
        similarity, or None if no confident match.
        """
        try:
            q = self.get_embedding(image_path)
            if q is None:
                logger.info("No face detected for recognition")
                return None

            self._refresh_cache()
            if self._cache_embeddings is None or not self._cache_labels:
                logger.info("No enrolled embeddings available")
                return None

            sims = self._cache_embeddings @ q  # cosine similarity (all L2-normalized)
            labels = self._cache_labels

            best_per_user: Dict[str, float] = {}
            for sim, lbl in zip(sims, labels):
                s = float(sim)
                if lbl not in best_per_user or s > best_per_user[lbl]:
                    best_per_user[lbl] = s

            top_user = max(best_per_user, key=best_per_user.get)
            top_sim = best_per_user[top_user]

            # k-NN voting: when there are fewer embeddings than k, adjust k
            k = min(self.knn_k, len(labels))
            if k > 0:
                top_idx = np.argsort(-sims)[:k]
                knn_labels = [labels[i] for i in top_idx]
                # Count votes
                from collections import Counter
                vote_counts = Counter(knn_labels)
                # Get the winner(s) with max count
                max_count = max(vote_counts.values())
                winners = [user for user, count in vote_counts.items() if count == max_count]
                # If tie, prefer the top_user (highest similarity)
                vote_winner = top_user if top_user in winners else winners[0]
            else:
                vote_winner = top_user

            confidence = round(max(0.0, min(1.0, top_sim)) * 100, 1)

            # Match only if top similarity meets threshold AND voting agrees
            if top_sim >= self.match_threshold and vote_winner == top_user:
                logger.info(f"Recognized {top_user} (sim={top_sim:.3f}, conf={confidence}%)")
                return {"user_id": top_user, "confidence": confidence, "similarity": round(top_sim, 4)}

            logger.info(
                f"No confident match (best={top_user} sim={top_sim:.3f}, "
                f"vote={vote_winner}, threshold={self.match_threshold})"
            )
            return None
        except Exception as e:
            logger.error(f"Recognition failed: {str(e)}")
            return None

    def recognize_face(self, image_path: str) -> Optional[str]:
        """Backward-compatible helper returning just the matched user_id."""
        result = self.recognize(image_path)
        return result["user_id"] if result else None

    # ------------------------------------------------------------------ #
    # Duplicate detection (enrollment guard)
    # ------------------------------------------------------------------ #
    def find_duplicate_face(self, image_path: str, db, current_user_id: str) -> Optional[Dict]:
        """Return user info if this face is already enrolled under a different user."""
        try:
            q = self.get_embedding(image_path)
            if q is None:
                logger.warning("No face detected during duplicate check")
                return None

            self._refresh_cache()
            if self._cache_embeddings is None or not self._cache_labels:
                return None

            sims = self._cache_embeddings @ q
            labels = self._cache_labels

            best_per_user: Dict[str, float] = {}
            for sim, lbl in zip(sims, labels):
                if lbl == current_user_id:
                    continue
                s = float(sim)
                if lbl not in best_per_user or s > best_per_user[lbl]:
                    best_per_user[lbl] = s

            if not best_per_user:
                return None

            top_user = max(best_per_user, key=best_per_user.get)
            top_sim = best_per_user[top_user]

            if top_sim >= self.duplicate_threshold:
                from app.models import User
                user = db.query(User).filter(User.unique_id == top_user).first()
                if user:
                    logger.warning(f"Duplicate face: matches {user.full_name} ({user.unique_id}) sim={top_sim:.3f}")
                    return {
                        "unique_id": user.unique_id,
                        "full_name": user.full_name,
                        "email": user.email,
                        "similarity": round(top_sim, 4),
                    }
            return None
        except Exception as e:
            logger.error(f"Duplicate detection failed: {str(e)}")
            return None


# Module-level singleton used across the API.
face_service = FaceRecognitionService()
