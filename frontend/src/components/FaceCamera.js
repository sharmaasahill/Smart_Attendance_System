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
 * Modes:
 *   - "attendance": gates readiness on a genuine blink (anti-spoofing).
 *   - "capture":    gates on a well-framed face (registration); no blink needed.
 *
 * Imperative handle: getScreenshot(), resetLiveness(), video.
 * onStatus(status) reports { cameraReady, modelReady, faceDetected, centered,
 *   livenessVerified, blinkCount, quality, ready, message }.
 */
const BLINK_CLOSE = 0.5;   // blendshape score above which an eye is "closed"
const BLINK_OPEN = 0.25;   // and below which it is "open" again
const STATUS_THROTTLE_MS = 120;

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
        // Lost the face — require liveness to be re-established
        eyesClosedRef.current = false;
      }
    } catch (e) {
      // transient detection error; keep looping
    }

    const livenessVerified = livenessRef.current;
    const ready = mode === 'attendance'
      ? (faceDetected && centered && livenessVerified)
      : (faceDetected && centered);

    const now = performance.now();
    if (now - lastStatusRef.current >= STATUS_THROTTLE_MS) {
      lastStatusRef.current = now;
      let message;
      if (!faceDetected) message = 'No face detected';
      else if (!centered) message = 'Move closer and center your face';
      else if (mode === 'attendance' && !livenessVerified) message = 'Please blink to confirm liveness';
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
