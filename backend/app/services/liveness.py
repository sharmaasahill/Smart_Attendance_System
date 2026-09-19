"""
Server-verified active liveness.

Why this exists
---------------
The browser runs a blink challenge with MediaPipe, but its result reaches the
server as a client-supplied boolean, so it proves nothing on its own: anything
that can post a form can claim it. Passive single-image anti-spoofing models
were evaluated and rejected — the candidate model scored every one of 64 real
enrollment photos as a spoof, which would have locked out all users.

So verification here is geometric and deterministic rather than statistical:

  1. The server issues a challenge naming a random direction (left or right).
  2. The client captures a burst of frames while the user turns their head.
  3. The server re-detects every frame and checks the head actually swept the
     required number of degrees, predominantly in the direction it asked for.

A printed photo or a phone screen showing a face cannot change its yaw, so it
sweeps ~0 degrees and fails. Because the direction is chosen per attempt and the
challenge is single-use, a pre-recorded video cannot be prepared in advance.

Limits, stated plainly: this is an active-challenge defence. Someone who can
render a live, pose-controllable puppet of the target in real time would defeat
it. It stops photos, phone/monitor screens showing stills, and replayed clips
that do not match the requested direction.
"""

import logging
import secrets
import threading
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

from app.core.config import settings

logger = logging.getLogger("smart_attendance.liveness")

# Direction the user is asked to turn. Values are the sign the yaw delta should
# take; InsightFace reports yaw with positive values as the subject turns to
# their own left in image coordinates.
DIRECTIONS: Dict[str, int] = {"left": +1, "right": -1}

INSTRUCTIONS = {
    "left": "Slowly turn your head to your LEFT, then back to centre",
    "right": "Slowly turn your head to your RIGHT, then back to centre",
}


class LivenessError(Exception):
    """Liveness verification failed for a reason safe to show the user."""


@dataclass
class Challenge:
    challenge_id: str
    direction: str
    created_at: float
    consumed: bool = False
    meta: dict = field(default_factory=dict)

    @property
    def expired(self) -> bool:
        return (time.time() - self.created_at) > settings.LIVENESS_CHALLENGE_TTL_SECONDS

    @property
    def instruction(self) -> str:
        return INSTRUCTIONS[self.direction]


class ChallengeStore:
    """
    In-process store of outstanding challenges.

    Deliberately in-memory: a challenge is a short-lived single-use nonce, so
    losing them on restart is harmless (the user simply retries). This matches
    how the existing rate limiter is scoped. If the backend is ever scaled to
    multiple workers or replicas this must move to Redis or a table, otherwise a
    challenge issued by one worker is unknown to another.
    """

    def __init__(self) -> None:
        self._items: Dict[str, Challenge] = {}
        self._lock = threading.Lock()

    def issue(self) -> Challenge:
        direction = secrets.choice(list(DIRECTIONS.keys()))
        challenge = Challenge(
            challenge_id=secrets.token_urlsafe(24),
            direction=direction,
            created_at=time.time(),
        )
        with self._lock:
            self._prune_locked()
            self._items[challenge.challenge_id] = challenge
        logger.info(f"Liveness challenge issued: {challenge.challenge_id[:8]}… direction={direction}")
        return challenge

    def consume(self, challenge_id: str) -> Challenge:
        """
        Fetch and atomically mark a challenge used.

        Single-use is what stops one successful turn from being replayed to mark
        attendance repeatedly, or to enrol after the fact.
        """
        with self._lock:
            self._prune_locked()
            challenge = self._items.get(challenge_id)
            if challenge is None:
                raise LivenessError(
                    "Liveness challenge not found or expired. Please start again."
                )
            if challenge.consumed:
                raise LivenessError(
                    "This liveness challenge was already used. Please start again."
                )
            if challenge.expired:
                del self._items[challenge_id]
                raise LivenessError("Liveness challenge expired. Please start again.")
            challenge.consumed = True
            return challenge

    def _prune_locked(self) -> None:
        stale = [cid for cid, c in self._items.items() if c.expired]
        for cid in stale:
            del self._items[cid]

    def clear(self) -> None:
        """Test helper."""
        with self._lock:
            self._items.clear()


challenge_store = ChallengeStore()


# ── Frame analysis ───────────────────────────────────────────────────────────

@dataclass
class FrameMeasurement:
    index: int
    yaw: float
    pitch: float
    roll: float
    landmarks: Optional[np.ndarray]
    bbox_area: float


def _measure_frames(image_paths: List[str]) -> List[FrameMeasurement]:
    """Detect the primary face in each frame and record its pose."""
    from app.services.face_recognition import face_service

    out: List[FrameMeasurement] = []
    for i, path in enumerate(image_paths):
        img = cv2.imread(path)
        if img is None:
            continue
        faces = face_service.app.get(img)
        if not faces:
            continue
        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        pose = getattr(face, "pose", None)
        if pose is None:
            continue
        lm = getattr(face, "landmark_2d_106", None)
        x1, y1, x2, y2 = face.bbox
        out.append(FrameMeasurement(
            index=i,
            pitch=float(pose[0]),
            yaw=float(pose[1]),
            roll=float(pose[2]),
            landmarks=np.asarray(lm, dtype=np.float32) if lm is not None else None,
            bbox_area=float((x2 - x1) * (y2 - y1)),
        ))
    return out


def _planar_residual(p1: np.ndarray, p2: np.ndarray) -> Optional[float]:
    """
    Median landmark reprojection error of the best-fit planar transform,
    normalised by face size (percent).

    A flat surface moving in front of the camera is fully described by a
    homography, so the residual stays near zero. A real head turning is not,
    so the residual rises. Measured for calibration; see
    LIVENESS_ENFORCE_PLANARITY.
    """
    if p1 is None or p2 is None or len(p1) < 4 or len(p2) < 4:
        return None
    H, _ = cv2.findHomography(p1, p2, cv2.RANSAC, 3.0)
    if H is None:
        return None
    proj = cv2.perspectiveTransform(p1.reshape(-1, 1, 2), H).reshape(-1, 2)
    err = np.linalg.norm(proj - p2, axis=1)
    scale = float(np.linalg.norm(p2.max(axis=0) - p2.min(axis=0)))
    if scale <= 0:
        return None
    return float(np.median(err) / scale * 100.0)


def verify_challenge_frames(challenge: Challenge, image_paths: List[str]) -> dict:
    """
    Verify a completed challenge against the frames that were submitted.

    Raises LivenessError with a user-facing message on failure. On success
    returns the measurements plus the indices of the most frontal frames, which
    callers should use for recognition — a turned head matches the gallery
    poorly, so recognising on the turn frames would hurt accuracy.
    """
    frame_count = len(image_paths)
    if frame_count < settings.LIVENESS_MIN_FRAMES:
        raise LivenessError(
            f"Liveness needs at least {settings.LIVENESS_MIN_FRAMES} frames "
            f"covering the movement; received {frame_count}."
        )
    if frame_count > settings.LIVENESS_MAX_FRAMES:
        raise LivenessError(f"Too many frames submitted (max {settings.LIVENESS_MAX_FRAMES}).")

    measurements = _measure_frames(image_paths)
    detected = len(measurements)
    ratio = detected / frame_count if frame_count else 0.0

    if detected < settings.LIVENESS_MIN_FRAMES or ratio < settings.LIVENESS_MIN_FACE_FRAME_RATIO:
        raise LivenessError(
            "Could not track your face through the movement. Keep your face in "
            "frame and well lit, then try again."
        )

    yaws = np.array([m.yaw for m in measurements], dtype=np.float32)
    yaw_min, yaw_max = float(yaws.min()), float(yaws.max())
    sweep = yaw_max - yaw_min

    # Signed extent in the requested direction, measured from the most frontal
    # frame so a subject who starts off-centre is not penalised.
    frontal_idx = int(np.argmin(np.abs(yaws)))
    baseline = float(yaws[frontal_idx])
    sign = DIRECTIONS[challenge.direction]
    directional = float(np.max((yaws - baseline) * sign))

    # Planarity across the widest pose change, where a real head and a flat
    # image differ most.
    i_lo, i_hi = int(np.argmin(yaws)), int(np.argmax(yaws))
    residual = _planar_residual(measurements[i_lo].landmarks, measurements[i_hi].landmarks)

    metrics = {
        "frames_submitted": frame_count,
        "frames_with_face": detected,
        "face_frame_ratio": round(ratio, 3),
        "yaw_min": round(yaw_min, 2),
        "yaw_max": round(yaw_max, 2),
        "yaw_sweep": round(float(sweep), 2),
        "yaw_directional": round(directional, 2),
        "requested_direction": challenge.direction,
        "planar_residual": round(residual, 4) if residual is not None else None,
    }

    # Logged on every attempt so thresholds can be tuned from real numbers
    # instead of guesses — including the planarity figure, which stays
    # unenforced until there is enough data to set it safely.
    logger.info(f"Liveness metrics: {metrics}")

    if sweep < settings.LIVENESS_MIN_YAW_SWEEP:
        # This is the check a photo or phone screen cannot pass.
        raise LivenessError(
            "No head movement detected. Please follow the on-screen prompt and "
            "turn your head so we can confirm you are really there."
        )

    if settings.LIVENESS_REQUIRE_DIRECTION and directional < settings.LIVENESS_MIN_YAW_SWEEP * 0.6:
        raise LivenessError(
            f"Expected you to turn {challenge.direction}. Please follow the "
            f"prompt exactly and try again."
        )

    if (
        settings.LIVENESS_ENFORCE_PLANARITY
        and residual is not None
        and residual < settings.LIVENESS_MIN_PLANAR_RESIDUAL
    ):
        raise LivenessError(
            "The movement looks like a flat image rather than a real face. "
            "Please use the live camera."
        )

    # Frames nearest frontal, best for recognition.
    order = sorted(range(len(measurements)), key=lambda k: abs(float(yaws[k])))
    frontal_paths = [image_paths[measurements[k].index] for k in order]

    return {"metrics": metrics, "frontal_paths": frontal_paths}
