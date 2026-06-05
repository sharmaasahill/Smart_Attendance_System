import React from 'react';
import { Box, Typography, LinearProgress, Chip, Paper, Stack, Alert } from '@mui/material';

/**
 * Real-time Liveness Detection Indicator Component
 * Market-standard anti-spoofing feedback
 */
const LivenessIndicator = ({ livenessData, compact = false }) => {
  if (!livenessData) return null;

  const {
    is_live,
    confidence,
    spoof_probability,
    checks_passed = {},
    details = {},
    recommendations = []
  } = livenessData;

  const getConfidenceColor = (conf) => {
    if (conf >= 80) return '#16a34a'; // Green
    if (conf >= 60) return '#f97316'; // Orange
    return '#dc2626'; // Red
  };

  const getStatusColor = () => {
    return is_live ? '#16a34a' : '#dc2626';
  };

  // Compact view for live preview
  if (compact) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          p: 2,
          minWidth: 220,
          zIndex: 10
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255,255,255,0.8)',
            fontWeight: '600',
            fontFamily: '"Inter", sans-serif',
            display: 'block',
            mb: 1
          }}
        >
          Liveness Check
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: getStatusColor(),
              animation: is_live ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 }
              }
            }}
          />
          <Chip
            label={is_live ? 'LIVE' : 'SPOOF'}
            size="small"
            sx={{
              background: is_live ? '#16a34a' : '#dc2626',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.7rem',
              fontFamily: '"Inter", sans-serif'
            }}
          />
        </Box>

        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.8)',
                fontFamily: '"Inter", sans-serif'
              }}
            >
              Confidence
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#ffffff',
                fontWeight: '700',
                fontFamily: '"Inter", sans-serif'
              }}
            >
              {confidence.toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={confidence}
            sx={{
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                background: getConfidenceColor(confidence)
              }
            }}
          />
        </Box>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.8)',
                fontFamily: '"Inter", sans-serif'
              }}
            >
              Spoof Risk
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#ffffff',
                fontWeight: '700',
                fontFamily: '"Inter", sans-serif'
              }}
            >
              {spoof_probability.toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={spoof_probability}
            sx={{
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                background: spoof_probability > 50 ? '#dc2626' : '#16a34a'
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  // Detailed view for liveness report
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '20px',
        border: `2px solid ${is_live ? '#86efac' : '#fca5a5'}`,
        background: is_live ? '#f0fdf4' : '#fef2f2',
        p: 3
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: '800',
              color: '#212E46',
              fontFamily: '"Inter", sans-serif'
            }}
          >
            Liveness Detection
          </Typography>
          <Chip
            label={is_live ? 'LIVE PERSON' : 'SPOOF DETECTED'}
            sx={{
              background: is_live ? '#16a34a' : '#dc2626',
              color: '#ffffff',
              fontWeight: '700',
              fontFamily: '"Inter", sans-serif',
              px: 2
            }}
          />
        </Box>

        {is_live ? (
          <Alert severity="success" sx={{ borderRadius: '12px', fontFamily: '"Inter", sans-serif' }}>
            Real person detected. Liveness verification passed.
          </Alert>
        ) : (
          <Alert severity="error" sx={{ borderRadius: '12px', fontFamily: '"Inter", sans-serif' }}>
            Possible spoofing attack detected. Please use live camera feed.
          </Alert>
        )}
      </Box>

      {/* Confidence Scores */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: '700',
                color: '#212E46',
                fontFamily: '"Inter", sans-serif'
              }}
            >
              Liveness Confidence
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: '800',
                color: getConfidenceColor(confidence),
                fontFamily: '"Inter", sans-serif'
              }}
            >
              {confidence.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={confidence}
            sx={{
              height: 10,
              borderRadius: 5,
              background: '#e7e5e4',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                background: `linear-gradient(90deg, ${getConfidenceColor(confidence)} 0%, ${getConfidenceColor(confidence)}dd 100%)`
              }
            }}
          />
        </Box>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: '700',
                color: '#212E46',
                fontFamily: '"Inter", sans-serif'
              }}
            >
              Spoof Probability
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: '800',
                color: spoof_probability > 50 ? '#dc2626' : '#16a34a',
                fontFamily: '"Inter", sans-serif'
              }}
            >
              {spoof_probability.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={spoof_probability}
            sx={{
              height: 10,
              borderRadius: 5,
              background: '#e7e5e4',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                background: spoof_probability > 50 
                  ? 'linear-gradient(90deg, #dc2626 0%, #dc2626dd 100%)'
                  : 'linear-gradient(90deg, #16a34a 0%, #16a34add 100%)'
              }
            }}
          />
        </Box>
      </Box>

      {/* Detection Checks */}
      {Object.keys(checks_passed).length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: '700',
              color: '#212E46',
              fontFamily: '"Inter", sans-serif',
              mb: 2
            }}
          >
            Detection Checks
          </Typography>

          <Stack spacing={1}>
            {Object.entries(checks_passed).map(([checkName, passed]) => {
              const label = checkName
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

              return (
                <Box
                  key={checkName}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    borderRadius: '10px',
                    background: passed ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${passed ? '#bbf7d0' : '#fecaca'}`
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: '600',
                      color: '#57534e',
                      fontFamily: '"Inter", sans-serif'
                    }}
                  >
                    {label}
                  </Typography>
                  <Chip
                    label={passed ? 'PASS' : 'FAIL'}
                    size="small"
                    sx={{
                      background: passed ? '#16a34a' : '#dc2626',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '0.65rem',
                      fontFamily: '"Inter", sans-serif',
                      height: '20px'
                    }}
                  />
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Box>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: '700',
              color: is_live ? '#16a34a' : '#dc2626',
              fontFamily: '"Inter", sans-serif',
              mb: 1
            }}
          >
            {is_live ? 'Status' : 'Recommendations'}
          </Typography>
          <Stack spacing={1}>
            {recommendations.map((recommendation, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  borderRadius: '10px',
                  background: is_live ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${is_live ? '#bbf7d0' : '#fecaca'}`
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: is_live ? '#16a34a' : '#dc2626',
                    flexShrink: 0
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: is_live ? '#166534' : '#991b1b',
                    fontWeight: '600',
                    fontFamily: '"Inter", sans-serif'
                  }}
                >
                  {recommendation}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Detection Details */}
      {Object.keys(details).length > 0 && (
        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #e7e5e4' }}>
          <Typography
            variant="caption"
            sx={{
              color: '#9ca3af',
              fontFamily: '"Inter", sans-serif',
              display: 'block',
              mb: 1
            }}
          >
            Detection Method: Multi-Factor Analysis
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: '#9ca3af',
              fontFamily: '"Inter", sans-serif'
            }}
          >
            Includes: Texture, Color, Frequency, Depth, and Landmark Analysis
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default LivenessIndicator;
