"""
Advanced, DB-backed face recognition service.

Uses InsightFace (SCRFD detector + ArcFace w600k_r50 512-d embeddings, ONNX /
onnxruntime, CPU-capable) for detection and recognition.

Persistence: embeddings and face images live in the database (FaceEmbedding /
FaceImage), not on disk — so the backend is stateless and recognition data
survives restarts and redeploys. Matching stores ALL per-image embeddings per
user (no averaging) and uses cosine similarity with per-user best-match plus
k-NN voting and a tuned threshold, returning a real confidence score.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional

import cv2
import numpy as np
from sqlalchemy import func

from app.core.config import settings

logger = logging.getLogger("smart_attendance.face")


class FaceRecognitionService:
    def __init__(self):
        self.model_name = settings.FACE_MODEL_PACK
        self.det_size = (640, 640)

        self.match_threshold = settings.FACE_MATCH_THRESHOLD
        self.duplicate_threshold = settings.FACE_DUPLICATE_THRESHOLD
        self.knn_k = settings.FACE_KNN_K

        self.min_det_score = settings.FACE_MIN_DET_SCORE
        self.min_face_size = settings.FACE_MIN_FACE_SIZE
        self.min_blur_var = settings.FACE_MIN_BLUR_VAR
        self.min_quality_score = settings.FACE_MIN_QUALITY_SCORE
        self.min_required_encodings = settings.FACE_MIN_ENCODINGS

        self.enable_liveness_check = True
        self.min_liveness_confidence = 20
        self.recognition_max_dim = 1024

        self._app = None  # lazily initialized FaceAnalysis

        # In-memory cache of all embeddings, rebuilt when the DB signature changes.
        self._cache_embeddings = None     # np.ndarray (M, 512) float32
        self._cache_labels: List[str] = []  # user unique_id per row
        self._cache_signature = None      # (row_count, max_updated_at)

    # ------------------------------------------------------------------ #
    # Model
    # ------------------------------------------------------------------ #
    @property
    def app(self):
        if self._app is None:
            from insightface.app import FaceAnalysis
            if settings.FACE_USE_GPU:
                providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
                ctx_id = 0
            else:
                providers = ["CPUExecutionProvider"]
                ctx_id = -1
            logger.info(f"Loading InsightFace model pack '{self.model_name}' (GPU={settings.FACE_USE_GPU})...")
            app = FaceAnalysis(name=self.model_name, providers=providers)
            app.prepare(ctx_id=ctx_id, det_size=self.det_size)
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
        face, _ = self._detect_primary_face(image_path)
        if face is None:
            return None
        return np.asarray(face.normed_embedding, dtype=np.float32)

    # ------------------------------------------------------------------ #
    # Quality
    # ------------------------------------------------------------------ #
    def check_image_quality(self, image_path: str) -> Dict:
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
            face_size = min(x2 - x1, y2 - y1)

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
                det_component * 0.35 + size_component * 0.25 + sharp_component * 0.25 + bright_component * 0.15,
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
    # Enrollment (writes embeddings + images to the database)
    # ------------------------------------------------------------------ #
    def enroll_user(self, db, user, image_paths: List[str]) -> Dict:
        from app.models import FaceEmbedding, FaceImage

        logger.info(f"Enrolling {user.unique_id} from {len(image_paths)} images using {self.model_name}")

        embeddings, image_blobs, qualities = [], [], []
        for path in image_paths:
            quality = self.check_image_quality(path)
            if not quality["is_acceptable"]:
                logger.warning(f"Rejected (quality) {path}: {quality['issues']}")
                continue
            emb = self.get_embedding(path)
            if emb is None:
                continue
            with open(path, "rb") as f:
                image_blobs.append(f.read())
            embeddings.append(emb)
            qualities.append(quality["overall_score"])

        acceptable = len(embeddings)
        if acceptable < self.min_required_encodings:
            raise Exception(
                f"Only {acceptable} usable face image(s); need at least "
                f"{self.min_required_encodings}. Retake with clear, well-lit, front-facing photos."
            )

        arr = np.vstack(embeddings).astype(np.float32)

        # Replace any existing enrollment for this user.
        db.query(FaceImage).filter(FaceImage.user_id == user.id).delete()
        db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user.id).delete()

        db.add(FaceEmbedding(
            user_id=user.id,
            embeddings=arr.tobytes(),
            count=int(arr.shape[0]),
            dim=int(arr.shape[1]),
            model=self.model_name,
        ))
        for i, (blob, qs) in enumerate(zip(image_blobs, qualities), start=1):
            db.add(FaceImage(user_id=user.id, position=i, image_data=blob, quality_score=qs))

        user.face_registered = True
        db.commit()

        avg_quality = float(np.mean(qualities)) if qualities else 0.0
        logger.info(f"Enrolled {user.unique_id} with {acceptable} embeddings (avg quality {avg_quality:.1f})")

        return {
            "success": True,
            "message": f"Enrolled with {acceptable} high-quality face embeddings",
            "statistics": {
                "total_images": len(image_paths),
                "acceptable_images": acceptable,
                "successfully_encoded": acceptable,
                "rejected_images": len(image_paths) - acceptable,
                "average_quality_score": avg_quality,
                "liveness_checked": False,
                "average_liveness_confidence": None,
                "model": self.model_name,
            },
        }

    # ------------------------------------------------------------------ #
    # Embedding cache (rebuilt from DB when signature changes)
    # ------------------------------------------------------------------ #
    def _refresh_cache(self, db) -> None:
        from app.models import FaceEmbedding, User

        signature = db.query(
            func.count(FaceEmbedding.id), func.max(FaceEmbedding.updated_at)
        ).one()

        if signature == self._cache_signature and self._cache_embeddings is not None:
            return

        rows = (
            db.query(FaceEmbedding, User.unique_id)
            .join(User, FaceEmbedding.user_id == User.id)
            .all()
        )
        mats, labels = [], []
        for fe, unique_id in rows:
            arr = np.frombuffer(fe.embeddings, dtype=np.float32).reshape(fe.count, fe.dim)
            mats.append(arr)
            labels.extend([unique_id] * fe.count)

        self._cache_embeddings = np.vstack(mats).astype(np.float32) if mats else None
        self._cache_labels = labels
        self._cache_signature = signature

    def invalidate_cache(self) -> None:
        self._cache_signature = None
        self._cache_embeddings = None
        self._cache_labels = []

    # ------------------------------------------------------------------ #
    # Recognition
    # ------------------------------------------------------------------ #
    def recognize(self, image_path: str, db) -> Optional[Dict]:
        try:
            q = self.get_embedding(image_path)
            if q is None:
                logger.info("No face detected for recognition")
                return None

            self._refresh_cache(db)
            if self._cache_embeddings is None or not self._cache_labels:
                logger.info("No enrolled embeddings available")
                return None

            sims = self._cache_embeddings @ q
            labels = self._cache_labels

            best_per_user: Dict[str, float] = {}
            for sim, lbl in zip(sims, labels):
                s = float(sim)
                if lbl not in best_per_user or s > best_per_user[lbl]:
                    best_per_user[lbl] = s

            top_user = max(best_per_user, key=best_per_user.get)
            top_sim = best_per_user[top_user]

            # k-NN vote among nearest embeddings; ties broken by best similarity
            # (favours the highest-confidence user). This guards against a lone
            # outlier embedding while staying correct on small datasets.
            from collections import Counter

            k = min(self.knn_k, len(labels))
            top_idx = np.argsort(-sims)[:k]
            knn_labels = [labels[i] for i in top_idx]
            counts = Counter(knn_labels)
            max_count = max(counts.values())
            tied = [lbl for lbl, c in counts.items() if c == max_count]
            vote_winner = max(tied, key=lambda lbl: best_per_user.get(lbl, -1.0))

            confidence = round(max(0.0, min(1.0, top_sim)) * 100, 1)

            if top_sim >= self.match_threshold and vote_winner == top_user:
                logger.info(f"Recognized {top_user} (sim={top_sim:.3f}, conf={confidence}%)")
                return {"user_id": top_user, "confidence": confidence, "similarity": round(top_sim, 4)}

            logger.info(f"No confident match (best={top_user} sim={top_sim:.3f})")
            return None
        except Exception as e:
            logger.error(f"Recognition failed: {str(e)}")
            return None

    def recognize_face(self, image_path: str, db) -> Optional[str]:
        result = self.recognize(image_path, db)
        return result["user_id"] if result else None

    def recognize_frames(self, image_paths: List[str], db) -> Optional[Dict]:
        """Recognize across frames; require a strict majority to agree."""
        from collections import Counter

        results = [self.recognize(p, db) for p in image_paths]
        results = [r for r in results if r]
        if not results:
            return None

        counts = Counter(r["user_id"] for r in results)
        top_user, top_count = counts.most_common(1)[0]

        majority = len(image_paths) // 2 + 1
        if top_count < majority:
            logger.info(f"No frame agreement (top={top_user} {top_count}/{len(image_paths)})")
            return None

        agreeing = [r for r in results if r["user_id"] == top_user]
        best = max(agreeing, key=lambda r: r["confidence"])
        return {
            "user_id": top_user,
            "confidence": best["confidence"],
            "similarity": best["similarity"],
            "frames_agreed": top_count,
            "frames_total": len(image_paths),
        }

    # ------------------------------------------------------------------ #
    # Duplicate detection (enrollment guard)
    # ------------------------------------------------------------------ #
    def find_duplicate_face(self, image_path: str, db, current_user_id: str) -> Optional[Dict]:
        try:
            q = self.get_embedding(image_path)
            if q is None:
                logger.warning("No face detected during duplicate check")
                return None

            self._refresh_cache(db)
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
