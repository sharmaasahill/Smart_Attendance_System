import React from 'react';
import { Box, Typography, LinearProgress, Chip, Paper, Stack } from '@mui/material';

/**
 * Real-time Face Quality Indicator Component
 * Market-standard visual feedback for face capture quality
 */
const FaceQualityIndicator = ({ qualityData, compact = false }) => {
  if (!qualityData) return null;

  const {
    overall_score,
    is_acceptable,
    scores,
    issues,
    recommendations
  } = qualityData;

  const getScoreColor = (score) => {
    if (score >= 80) return '#16a34a'; // Green
    if (score >= 60) return '#f97316'; // Orange
    return '#dc2626'; // Red
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  // Compact view for live preview
  if (compact) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          p: 2,
          minWidth: 200,
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
          Image Quality
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography
            variant="h5"
            sx={{
              color: '#ffffff',
              fontWeight: '800',
              fontFamily: '"Inter", sans-serif'
            }}
          >
            {overall_score.toFixed(0)}%
          </Typography>
          <Chip
            label={is_acceptable ? 'Ready' : 'Improve'}
            size="small"
            sx={{
              background: is_acceptable ? '#16a34a' : '#f97316',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.7rem',
              fontFamily: '"Inter", sans-serif'
            }}
          />
        </Box>

        <LinearProgress
          variant="determinate"
          value={overall_score}
          sx={{
            height: 6,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.2)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              background: getScoreColor(overall_score)
            }
          }}
        />

        {issues && issues.length > 0 && (
          <Typography
            variant="caption"
            sx={{
              color: '#fca5a5',
              fontWeight: '600',
              fontFamily: '"Inter", sans-serif',
              display: 'block',
              mt: 1
            }}
          >
            {issues[0]}
          </Typography>
        )}
      </Box>
    );
  }

  // Detailed view for quality report
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '20px',
        border: `2px solid ${is_acceptable ? '#86efac' : '#fed7aa'}`,
        background: is_acceptable ? '#f0fdf4' : '#fffbeb',
        p: 3
      }}
    >
      {/* Overall Score */}
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
            Quality Assessment
          </Typography>
          <Chip
            label={is_acceptable ? 'ACCEPTABLE' : 'NEEDS IMPROVEMENT'}
            sx={{
              background: is_acceptable ? '#16a34a' : '#f97316',
              color: '#ffffff',
              fontWeight: '700',
              fontFamily: '"Inter", sans-serif',
              px: 2
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: '800',
              color: getScoreColor(overall_score),
              fontFamily: '"Inter", sans-serif',
              letterSpacing: '-0.02em'
            }}
          >
            {overall_score.toFixed(1)}%
          </Typography>
          <Box>
            <Typography
              variant="body2"
              sx={{
                color: '#78716c',
                fontWeight: '600',
                fontFamily: '"Inter", sans-serif'
              }}
            >
              Overall Score
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#9ca3af',
                fontFamily: '"Inter", sans-serif'
              }}
            >
              {getScoreLabel(overall_score)} Quality
            </Typography>
          </Box>
        </Box>

        <LinearProgress
          variant="determinate"
          value={overall_score}
          sx={{
            height: 10,
            borderRadius: 5,
            background: '#e7e5e4',
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
              background: `linear-gradient(90deg, ${getScoreColor(overall_score)} 0%, ${getScoreColor(overall_score)}dd 100%)`
            }
          }}
        />
      </Box>

      {/* Detailed Scores */}
      {scores && (
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
            Detailed Metrics
          </Typography>

          <Stack spacing={1.5}>
            {Object.entries(scores).map(([key, value]) => {
              const label = key
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

              return (
                <Box key={key}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
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
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: '700',
                        color: getScoreColor(value),
                        fontFamily: '"Inter", sans-serif'
                      }}
                    >
                      {value.toFixed(0)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={value}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      background: '#e7e5e4',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 2,
                        background: getScoreColor(value)
                      }
                    }}
                  />
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Issues */}
      {issues && issues.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: '700',
              color: '#dc2626',
              fontFamily: '"Inter", sans-serif',
              mb: 1
            }}
          >
            Issues Detected
          </Typography>
          <Stack spacing={1}>
            {issues.map((issue, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  borderRadius: '10px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca'
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#dc2626',
                    flexShrink: 0
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: '#991b1b',
                    fontWeight: '600',
                    fontFamily: '"Inter", sans-serif'
                  }}
                >
                  {issue}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Box>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: '700',
              color: is_acceptable ? '#16a34a' : '#f97316',
              fontFamily: '"Inter", sans-serif',
              mb: 1
            }}
          >
            {is_acceptable ? 'Tips' : 'Recommendations'}
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
                  background: is_acceptable ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${is_acceptable ? '#bbf7d0' : '#fde68a'}`
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: is_acceptable ? '#16a34a' : '#f97316',
                    flexShrink: 0
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: is_acceptable ? '#166534' : '#92400e',
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
    </Paper>
  );
};

export default FaceQualityIndicator;
