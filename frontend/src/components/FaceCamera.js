import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import Webcam from 'react-webcam';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

/**
 * FaceCamera — real-time face detection and active liveness using MediaPipe
 * FaceLandmarker (468 landmarks + blink blendshapes), running locally in the
 * browser via WASM. No simulated/heuristic detection.
 *
 * Both modes ("attendance" and "capture"/registration) require a genuine blink
 * before reporting ready; the mode only affects the prompt wording. The blink
 * verdict expires as soon as the subject leaves the frame, so it cannot be
 * transferred from a real person to a photo presented straight afterwards.
 *
 * Note this is an ACTIVE liveness challenge and is not by itself sufficient
 * against a replayed video or a moving photo that happens to trigger the blink
 * blendshapes. Passive anti-spoofing (texture/depth) belongs server-side.
 *
 * Imperative handle: getScreenshot(), resetLiveness(), video.
 * onStatus(status) reports { cameraReady, modelReady, faceDetected, centered,
 *   livenessVerified, blinkCount, quality, ready, message }.
 */
const BLINK_CLOSE = 0.5;   // blendshape score above which an eye is "closed"
const BLINK_OPEN = 0.25;   // and below which it is "open" again
const STATUS_THROTTLE_MS = 120;
// Frames without a face before the liveness verdict is discarded. At ~30fps
// this is roughly a third of a second: long enough to survive a dropped
// detection, short enough that a face swap cannot reuse the previous blink.
const FACE_LOST_GRACE_FRAMES = 10;

const FaceCamera = forwardRef(({
  mode = 'attendance',
  height = 480,
  width = '100%',
  onStatus,
  style,
}, ref) => {
  const webcamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);

  const eyesClosedRef = useRef(false);
  const blinkCountRef = useRef(0);
  const livenessRef = useRef(false);
  const lastStatusRef = useRef(0);
  const runningRef = useRef(false);
  // Consecutive frames with no face. Used to expire the liveness verdict once
  // the subject leaves, without reacting to a single dropped detection.
  const missingFramesRef = useRef(0);

  const [cameraReady, setCameraReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  const videoConstraints = { width: 1280, height: 720, facingMode: 'user' };

  useImperativeHandle(ref, () => ({
    getScreenshot: () => webcamRef.current?.getScreenshot(),
    resetLiveness: () => {
      blinkCountRef.current = 0;
      livenessRef.current = false;
      eyesClosedRef.current = false;
      missingFramesRef.current = 0;
    },
    get video() {
      return webcamRef.current?.video || null;
    },
  }), []);

  // Load the MediaPipe model once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
        let landmarker;
        try {
          landmarker = await FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: '/models/face_landmarker.task', delegate: 'GPU' },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: true,
          });
        } catch (gpuErr) {
          // Fall back to CPU delegate if WebGL is unavailable
          landmarker = await FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: '/models/face_landmarker.task', delegate: 'CPU' },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: true,
          });
        }
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setModelReady(true);
      } catch (e) {
        console.error('FaceLandmarker load failed:', e);
        if (!cancelled) setLoadError('Failed to load face detection model.');
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (landmarkerRef.current) {
        try { landmarkerRef.current.close(); } catch (_) {}
        landmarkerRef.current = null;
      }
    };
  }, []);

  const emitStatus = useCallback((status) => {
    if (onStatus) onStatus(status);
  }, [onStatus]);

  const detectLoop = useCallback(() => {
    const landmarker = landmarkerRef.current;
    const video = webcamRef.current?.video;

    if (!landmarker || !video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    let faceDetected = false;
    let centered = false;
    let quality = 0;

    try {
      const result = landmarker.detectForVideo(video, performance.now());
      const landmarks = result.faceLandmarks && result.faceLandmarks[0];

      if (landmarks && landmarks.length) {
        faceDetected = true;
        missingFramesRef.current = 0;

        // Bounding box from normalized landmarks
        let minX = 1, minY = 1, maxX = 0, maxY = 0;
        for (const p of landmarks) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
        const fw = maxX - minX;
        const fh = maxY - minY;
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        // Well framed: reasonable size and roughly centered
        const goodSize = fw > 0.18 && fw < 0.85 && fh > 0.22;
        const goodCenter = cx > 0.25 && cx < 0.75 && cy > 0.2 && cy < 0.8;
        centered = goodSize && goodCenter;
        quality = Math.round(Math.min(100, Math.max(0, (fw / 0.45) * 100)));

        // Blink detection from blendshapes (active liveness)
        const cats = result.faceBlendshapes && result.faceBlendshapes[0]
          ? result.faceBlendshapes[0].categories
          : [];
        let blink = 0;
        for (const c of cats) {
          if (c.categoryName === 'eyeBlinkLeft' || c.categoryName === 'eyeBlinkRight') {
            if (c.score > blink) blink = c.score;
          }
        }
        if (blink > BLINK_CLOSE) {
          eyesClosedRef.current = true;
        } else if (blink < BLINK_OPEN && eyesClosedRef.current) {
          eyesClosedRef.current = false;
          blinkCountRef.current += 1;
        }
        if (centered && blinkCountRef.current >= 1) {
          livenessRef.current = true;
        }
      } else {
        // The subject left the frame. Expire the liveness verdict entirely
        // after a short grace period (long enough to ride out an occasional
        // dropped detection). Previously only `eyesClosedRef` was cleared, so
        // `livenessRef` stayed true for the rest of the session — meaning one
        // real blink could be inherited by whatever appeared next, such as a
        // photo held up to the camera immediately afterwards.
        eyesClosedRef.current = false;
        missingFramesRef.current += 1;
        if (missingFramesRef.current >= FACE_LOST_GRACE_FRAMES) {
          blinkCountRef.current = 0;
          livenessRef.current = false;
        }
      }
    } catch (e) {
      // transient detection error; keep looping
    }

    const livenessVerified = livenessRef.current;
    // Liveness is required for enrollment as well as attendance. Enrolling from
    // a photo is worse than a single bad attendance mark: it permanently puts a
    // spoofable identity in the gallery, which every later match trusts.
    const ready = faceDetected && centered && livenessVerified;

    const now = performance.now();
    if (now - lastStatusRef.current >= STATUS_THROTTLE_MS) {
      lastStatusRef.current = now;
      let message;
      if (!faceDetected) message = 'No face detected';
      else if (!centered) message = 'Move closer and center your face';
      else if (!livenessVerified) {
        message = mode === 'capture'
          ? 'Blink to confirm a live person before we capture'
          : 'Please blink to confirm liveness';
      }
      else message = 'Ready';
      emitStatus({
        cameraReady: true,
        modelReady: true,
        faceDetected,
        centered,
        livenessVerified,
        blinkCount: blinkCountRef.current,
        quality,
        ready,
        message,
      });
    }

    rafRef.current = requestAnimationFrame(detectLoop);
  }, [mode, emitStatus]);

  // Start the loop when both camera and model are ready.
  useEffect(() => {
    if (cameraReady && modelReady && !runningRef.current) {
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(detectLoop);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    };
  }, [cameraReady, modelReady, detectLoop]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored
        screenshotFormat="image/jpeg"
        screenshotQuality={0.95}
        videoConstraints={videoConstraints}
        onUserMedia={() => setCameraReady(true)}
        onUserMediaError={() => setLoadError('Camera access denied or unavailable.')}
        height={height}
        style={{ width, height, objectFit: 'cover', display: 'block', ...style }}
      />

      {(!cameraReady || !modelReady) && !loadError && (
        <Box sx={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2,
          background: 'rgba(0,0,0,0.55)', color: '#fff',
        }}>
          <CircularProgress size={32} sx={{ color: '#f97316' }} />
          <Typography variant="body2" sx={{ fontFamily: '"Inter", sans-serif' }}>
            {!cameraReady ? 'Starting camera…' : 'Loading face engine…'}
          </Typography>
        </Box>
      )}

      {loadError && (
        <Box sx={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', p: 3, textAlign: 'center',
          background: 'rgba(0,0,0,0.7)', color: '#fff',
        }}>
          <Typography variant="body2" sx={{ fontFamily: '"Inter", sans-serif' }}>{loadError}</Typography>
        </Box>
      )}
    </Box>
  );
});

FaceCamera.displayName = 'FaceCamera';

export default FaceCamera;
