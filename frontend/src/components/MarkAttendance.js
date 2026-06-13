import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Fade,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Stack,
} from '@mui/material';
import { attendanceAPI, webcamCaptureToFile } from '../services/api';
import { format } from 'date-fns';
import {
  CheckCircleRounded,
  InfoRounded,
  ErrorRounded,
} from '@mui/icons-material';
import FaceCamera from './FaceCamera';

// Add pulse animation
const pulseAnimation = `
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

@keyframes scanLine {
  0% {
    top: 0%;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    top: 100%;
    opacity: 0;
  }
}

@keyframes scanRing {
  0% {
    transform: scale(0.85);
    opacity: 0.9;
  }
  100% {
    transform: scale(1.25);
    opacity: 0;
  }
}

@keyframes cornerGlow {
  0%, 100% {
    border-color: rgba(249,115,22,0.4);
  }
  50% {
    border-color: rgba(249,115,22,1);
  }
}
`;

const MarkAttendance = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const webcamRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [alreadyMarked, setAlreadyMarked] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceStatus, setAttendanceStatus] = useState('ready');
  const [faceDetected, setFaceDetected] = useState(false);
  const [liveness, setLiveness] = useState(false);
  const [detectReady, setDetectReady] = useState(false);
  const [detectMsg, setDetectMsg] = useState('Position your face in the frame');

  // --- Auto-capture control ---
  // How long a face must stay steady before we capture (avoids blurry frames)
  const STABILITY_MS = 700;
  // How long result overlays stay before auto-resetting for the next person
  const RESULT_DISPLAY_MS = 4000;
  // Cooldown before auto-retrying after a failed (not recognized) attempt
  const ERROR_RETRY_MS = 3000;

  const isCapturingRef = useRef(false);      // prevents overlapping requests
  const stabilityTimerRef = useRef(null);    // pending steady-face timer
  const resetTimerRef = useRef(null);        // pending auto-reset timer
  const requireFaceClearRef = useRef(false); // require face to leave before re-arming

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Clean up any pending timers on unmount
  useEffect(() => {
    return () => {
      if (stabilityTimerRef.current) clearTimeout(stabilityTimerRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleStatus = useCallback((status) => {
    setFaceDetected(status.faceDetected);
    setLiveness(status.livenessVerified);
    setDetectReady(status.ready);
    setDetectMsg(status.message);
  }, []);

  const scheduleReset = useCallback((delay) => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      resetTimerRef.current = null;
      setSuccess(null);
      setError('');
      setAlreadyMarked(null);
      setAttendanceStatus('ready');
      // Require a fresh blink from the next person
      if (webcamRef.current && webcamRef.current.resetLiveness) {
        webcamRef.current.resetLiveness();
      }
    }, delay);
  }, []);

  const captureAndMark = useCallback(async () => {
    if (isCapturingRef.current) return;
    if (!webcamRef.current || !webcamRef.current.getScreenshot) {
      return;
    }

    isCapturingRef.current = true;
    setLoading(true);
    setError('');
    setSuccess(null);
    setAlreadyMarked(null);
    setAttendanceStatus('scanning');

    try {
      // Capture multiple frames for multi-frame voting (more robust recognition)
      const FRAME_COUNT = 3;
      const FRAME_GAP_MS = 120;
      const frames = [];
      for (let i = 0; i < FRAME_COUNT; i++) {
        const src = webcamRef.current && webcamRef.current.getScreenshot
          ? webcamRef.current.getScreenshot()
          : null;
        if (src) {
          frames.push(await webcamCaptureToFile(src, `attendance_${i}.jpg`));
        }
        if (i < FRAME_COUNT - 1) {
          await new Promise((r) => setTimeout(r, FRAME_GAP_MS));
        }
      }

      if (frames.length === 0) {
        throw new Error('Failed to capture image.');
      }

      setAttendanceStatus('processing');

      // Liveness was verified live (blink) before this capture was allowed
      const response = await attendanceAPI.markAttendance(frames, true);

      setSuccess(response.data);
      setAttendanceStatus('success');
      requireFaceClearRef.current = true;
      scheduleReset(RESULT_DISPLAY_MS);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed';

      if (errorMessage.toLowerCase().includes('already marked')) {
        setAlreadyMarked({
          message: errorMessage,
          user: error.response?.data?.user || null,
        });
        setAttendanceStatus('already-marked');
        requireFaceClearRef.current = true;
        scheduleReset(RESULT_DISPLAY_MS);
      } else {
        // Not recognized / transient error: auto-retry after a short cooldown
        setError(errorMessage);
        setAttendanceStatus('error');
        requireFaceClearRef.current = false;
        scheduleReset(ERROR_RETRY_MS);
      }
    } finally {
      setLoading(false);
      isCapturingRef.current = false;
    }
  }, [scheduleReset]);

  // Automatic capture: trigger when a real, centered face passes the live
  // blink/liveness check (detectReady) and stays steady briefly.
  useEffect(() => {
    if (requireFaceClearRef.current && !faceDetected) {
      requireFaceClearRef.current = false;
    }

    const canCapture =
      detectReady &&
      !isCapturingRef.current &&
      attendanceStatus === 'ready' &&
      !requireFaceClearRef.current;

    if (canCapture) {
      if (!stabilityTimerRef.current) {
        stabilityTimerRef.current = setTimeout(() => {
          stabilityTimerRef.current = null;
          captureAndMark();
        }, STABILITY_MS);
      }
    } else if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current);
      stabilityTimerRef.current = null;
    }
  }, [detectReady, faceDetected, attendanceStatus, captureAndMark]);

  return (
    <>
      <style>{pulseAnimation}</style>
      <Box 
        sx={{ 
          background: 'linear-gradient(135deg, #f5f3f0 0%, #fafaf9 50%, #ffffff 100%)', 
          minHeight: '100vh', 
          py: 4,
        }}
      >
      <Container maxWidth="lg">
        {/* Compact Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight="800" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif', mb: 0.5 }}>
              Mark Attendance
            </Typography>
            <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif' }}>
              {format(currentTime, 'EEEE, MMMM dd, yyyy')}
            </Typography>
          </Box>
          <Box sx={{ px: 3, py: 2, borderRadius: '14px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Typography variant="h6" fontWeight="700" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif' }}>
              {format(currentTime, 'hh:mm:ss a')}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Camera Section - Larger */}
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.08)' }}>
              {/* Status Bar */}
              <Box sx={{ background: '#ffffff', borderBottom: '1px solid #f3f4f6', p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: faceDetected ? '#16a34a' : '#9ca3af', boxShadow: faceDetected ? '0 0 0 3px rgba(22,163,74,0.2)' : 'none', transition: 'all 0.3s ease' }} />
                  <Typography variant="body2" fontWeight="700" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif' }}>
                    {attendanceStatus === 'success' ? 'Attendance Verified' : attendanceStatus === 'already-marked' ? 'Already Marked Today' : attendanceStatus === 'error' ? 'Recognition Failed' : loading ? 'Processing...' : detectReady ? 'Live Face Verified' : faceDetected ? 'Blink to Verify' : 'Waiting for Face'}
                  </Typography>
                </Box>
                <Chip 
                  label={loading ? 'SCANNING' : faceDetected ? 'READY' : 'STANDBY'}
                  size="small"
                  sx={{ 
                    background: loading ? '#ffedd5' : faceDetected ? '#dcfce7' : '#fafaf9', 
                    color: loading ? '#f97316' : faceDetected ? '#16a34a' : '#78716c', 
                    fontWeight: '800', 
                    fontSize: '0.7rem',
                    fontFamily: '"Inter", sans-serif',
                    height: '24px'
                  }} 
                />
              </Box>

              {/* Camera Feed */}
              <Box sx={{ position: 'relative', background: '#000000', minHeight: isMobile ? 400 : 480 }}>
                <FaceCamera
                  ref={webcamRef}
                  mode="attendance"
                  height={isMobile ? 400 : 480}
                  width="100%"
                  onStatus={handleStatus}
                />

                {/* Liveness hint (blink) before a face is verified */}
                {!loading && !success && !error && !alreadyMarked && faceDetected && !liveness && (
                  <Box sx={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 2.5, py: 1, borderRadius: '999px', background: 'rgba(33,46,70,0.85)', backdropFilter: 'blur(6px)' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#fb923c', animation: 'pulse 1.2s ease-in-out infinite' }} />
                      <Typography variant="body2" fontWeight="700" sx={{ color: '#fff', fontFamily: '"Inter", sans-serif', letterSpacing: '0.04em' }}>
                        Please blink to confirm you're live
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Scanning Overlay (while recognizing) */}
                {loading && !success && !error && !alreadyMarked && (
                  <Fade in timeout={300}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', overflow: 'hidden' }}>
                      {/* Dark vignette */}
                      <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 100%)' }} />

                      {/* Sweeping scan line */}
                      <Box sx={{ position: 'absolute', left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, transparent 0%, #f97316 50%, transparent 100%)', boxShadow: '0 0 16px 3px rgba(249,115,22,0.7)', animation: 'scanLine 1.6s ease-in-out infinite' }} />

                      {/* Face framing box with glowing corners */}
                      <Box sx={{ position: 'relative', width: isMobile ? 200 : 240, height: isMobile ? 240 : 290, borderRadius: '16px' }}>
                        {/* Pulsing rings */}
                        <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(249,115,22,0.6)', animation: 'scanRing 1.8s ease-out infinite' }} />
                        <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(249,115,22,0.6)', animation: 'scanRing 1.8s ease-out infinite', animationDelay: '0.9s' }} />

                        {/* Corner brackets */}
                        {[
                          { top: 0, left: 0, borderTop: '3px solid', borderLeft: '3px solid', borderTopLeftRadius: '12px' },
                          { top: 0, right: 0, borderTop: '3px solid', borderRight: '3px solid', borderTopRightRadius: '12px' },
                          { bottom: 0, left: 0, borderBottom: '3px solid', borderLeft: '3px solid', borderBottomLeftRadius: '12px' },
                          { bottom: 0, right: 0, borderBottom: '3px solid', borderRight: '3px solid', borderBottomRightRadius: '12px' },
                        ].map((pos, i) => (
                          <Box key={i} sx={{ position: 'absolute', width: 32, height: 32, animation: 'cornerGlow 1.2s ease-in-out infinite', ...pos }} />
                        ))}
                      </Box>

                      {/* Status text */}
                      <Box sx={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center' }}>
                        <Typography variant="body2" fontWeight="700" sx={{ color: '#ffffff', fontFamily: '"Inter", sans-serif', letterSpacing: '0.08em', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                          {attendanceStatus === 'processing' ? 'RECOGNIZING FACE...' : 'SCANNING...'}
                        </Typography>
                      </Box>
                    </Box>
                  </Fade>
                )}
                
                {/* Success Overlay */}
                {success && (
                  <Fade in timeout={500}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(16,185,129,0.97) 0%, rgba(5,150,105,0.97) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                      <Box sx={{ width: 120, height: 120, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <CheckCircleRounded sx={{ fontSize: 72, color: '#16a34a' }} />
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight="800" sx={{ color: '#ffffff', fontFamily: '"Inter", sans-serif', mb: 1 }}>Success</Typography>
                        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.95)', fontFamily: '"Inter", sans-serif' }}>Welcome, {success.user?.full_name}</Typography>
                      </Box>
                      <Box sx={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', px: 4, py: 2 }}>
                        <Typography variant="body2" sx={{ color: '#ffffff', fontFamily: '"Inter", sans-serif', fontWeight: '600' }}>
                          Time: {format(new Date(), 'hh:mm a')}
                        </Typography>
                      </Box>
                    </Box>
                  </Fade>
                )}

                {/* Already Marked Overlay */}
                {alreadyMarked && (
                  <Fade in timeout={500}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(249,115,22,0.97) 0%, rgba(234,88,12,0.97) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, p: 4 }}>
                      <Box sx={{ width: 120, height: 120, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <InfoRounded sx={{ fontSize: 72, color: '#f97316' }} />
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight="800" sx={{ color: '#ffffff', fontFamily: '"Inter", sans-serif', mb: 1 }}>Already Marked</Typography>
                        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.95)', fontFamily: '"Inter", sans-serif', maxWidth: 400 }}>
                          {alreadyMarked.message}
                        </Typography>
                      </Box>
                    </Box>
                  </Fade>
                )}
                
                {/* Error Overlay */}
                {error && attendanceStatus === 'error' && (
                  <Fade in timeout={500}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(239,68,68,0.97) 0%, rgba(220,38,38,0.97) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, p: 4 }}>
                      <Box sx={{ width: 120, height: 120, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <ErrorRounded sx={{ fontSize: 72, color: '#dc2626' }} />
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight="800" sx={{ color: '#ffffff', fontFamily: '"Inter", sans-serif', mb: 1 }}>Not Recognized</Typography>
                        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.95)', fontFamily: '"Inter", sans-serif', maxWidth: 400 }}>{error}</Typography>
                      </Box>
                    </Box>
                  </Fade>
                )}
              </Box>

              {/* Auto-capture status footer */}
              <Box sx={{ p: 3, background: '#ffffff' }}>
                {loading && <LinearProgress sx={{ mb: 2, height: 6, borderRadius: 3, background: '#e7e5e4', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)', borderRadius: 3 } }} />}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1.5,
                    py: 2,
                    px: 3,
                    borderRadius: '12px',
                    background: success ? '#dcfce7' : alreadyMarked ? '#ffedd5' : (error && attendanceStatus === 'error') ? '#fee2e2' : faceDetected ? '#ffedd5' : '#fafaf9',
                    border: `1px solid ${success ? '#86efac' : alreadyMarked ? '#fed7aa' : (error && attendanceStatus === 'error') ? '#fecaca' : faceDetected ? '#fed7aa' : '#e7e5e4'}`,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: success ? '#16a34a' : alreadyMarked ? '#f97316' : (error && attendanceStatus === 'error') ? '#dc2626' : faceDetected ? '#f97316' : '#9ca3af',
                      animation: (loading || faceDetected) && !success && !alreadyMarked ? 'pulse 1.5s ease-in-out infinite' : 'none',
                    }}
                  />
                  <Typography variant="body2" fontWeight="700" sx={{ color: '#212E46', fontFamily: '"Inter", sans-serif', textAlign: 'center' }}>
                    {loading
                      ? 'Verifying your identity...'
                      : success
                        ? `Welcome, ${success.user?.full_name || ''}`
                        : alreadyMarked
                          ? 'Attendance already marked today'
                          : (error && attendanceStatus === 'error')
                            ? 'Face not recognized — retrying shortly'
                            : detectReady
                              ? 'Hold still — capturing automatically'
                              : faceDetected && !liveness
                                ? 'Blink once to confirm you are live'
                                : detectMsg}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Info Sidebar */}
          <Grid item xs={12} md={4}>
            <Stack spacing={3}>
              {/* Instructions */}
              <Card elevation={0} sx={{ borderRadius: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight="800" sx={{ color: '#212E46', mb: 3, fontFamily: '"Inter", sans-serif' }}>
                    Instructions
                  </Typography>
                  <Stack spacing={2.5}>
                    {[
                      'Position your face in the camera frame',
                      'Ensure adequate lighting',
                      'Remove sunglasses and face coverings',
                      'Look directly at the camera',
                      'Wait for face detection confirmation'
                    ].map((item, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box sx={{ minWidth: 24, height: 24, borderRadius: '6px', background: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.25 }}>
                          <Typography variant="caption" fontWeight="800" sx={{ color: '#f97316', fontFamily: '"Inter", sans-serif' }}>{i + 1}</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#78716c', fontFamily: '"Inter", sans-serif', lineHeight: 1.6 }}>{item}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>


              {/* System Status */}
              <Card elevation={0} sx={{ borderRadius: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight="800" sx={{ color: '#212E46', mb: 3, fontFamily: '"Inter", sans-serif' }}>
                    System Status
                  </Typography>
                  <Stack spacing={2}>
                    <Box sx={{ p: 3, borderRadius: '12px', background: faceDetected ? '#dcfce7' : '#fafaf9', border: `2px solid ${faceDetected ? '#86efac' : '#e7e5e4'}`, transition: 'all 0.3s ease' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: faceDetected ? '#16a34a' : '#9ca3af', boxShadow: faceDetected ? '0 0 0 3px rgba(22,163,74,0.2)' : 'none' }} />
                        <Typography variant="body2" fontWeight="700" sx={{ color: faceDetected ? '#16a34a' : '#78716c', fontFamily: '"Inter", sans-serif' }}>
                          Face Detection
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: faceDetected ? '#059669' : '#9ca3af', fontFamily: '"Inter", sans-serif', fontWeight: '600' }}>
                        {faceDetected ? 'Active and tracking' : 'Waiting for face'}
                      </Typography>
                    </Box>

                    <Box sx={{ p: 3, borderRadius: '12px', background: '#dbeafe', border: '2px solid #93c5fd' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: '#212E46', boxShadow: '0 0 0 3px rgba(33,46,70,0.2)' }} />
                        <Typography variant="body2" fontWeight="700" sx={{ color: '#1e40af', fontFamily: '"Inter", sans-serif' }}>
                          AI Recognition
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#2563eb', fontFamily: '"Inter", sans-serif', fontWeight: '600' }}>
                        Model loaded and ready
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Container>
      </Box>
    </>
  );
};

export default MarkAttendance;
