import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Card, CardContent, useTheme, useMediaQuery } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Face } from '@mui/icons-material';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

const RadialOrbitalTimeline = ({ industries }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [rotationAngle, setRotationAngle] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [pulsingIds, setPulsingIds] = useState({});
  const containerRef = useRef(null);

  // Auto-rotation effect - optimized
  useEffect(() => {
    let animationFrame;
    let lastTime = Date.now();
    
    const rotate = () => {
      if (autoRotate) {
        const currentTime = Date.now();
        const deltaTime = currentTime - lastTime;
        
        if (deltaTime > 50) { // Update every 50ms instead of 30ms
          setRotationAngle((prev) => (prev + 0.3) % 360);
          lastTime = currentTime;
        }
        animationFrame = requestAnimationFrame(rotate);
      }
    };
    
    if (autoRotate) {
      animationFrame = requestAnimationFrame(rotate);
    }
    
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [autoRotate]);

  const calculateNodePosition = (index, total, isMobile = false) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    // Responsive radius - smaller on mobile
    const radius = isMobile ? 140 : 240;
    const radian = (angle * Math.PI) / 180;
    const x = radius * Math.cos(radian);
    const y = radius * Math.sin(radian);
    
    // Calculate depth for 3D effect
    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const scale = 0.7 + 0.3 * ((1 + Math.sin(radian)) / 2);
    const opacity = Math.max(0.5, Math.min(1, 0.5 + 0.5 * ((1 + Math.sin(radian)) / 2)));
    
    return { x, y, angle, zIndex, scale, opacity };
  };

  const handleNodeClick = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      setAutoRotate(true);
      setPulsingIds({});
    } else {
      setExpandedId(id);
      setAutoRotate(false);
      
      // Find related industries
      const industry = industries.find(i => i.id === id);
      if (industry && industry.relatedIds) {
        const newPulsing = {};
        industry.relatedIds.forEach(relId => {
          newPulsing[relId] = true;
        });
        setPulsingIds(newPulsing);
      }
    }
  };

  const handleContainerClick = (e) => {
    if (e.target === containerRef.current) {
      setExpandedId(null);
      setAutoRotate(true);
      setPulsingIds({});
    }
  };

  return (
    <Box
      ref={containerRef}
      onClick={handleContainerClick}
      sx={{
        position: 'relative',
        width: '100%',
        height: { xs: '600px', sm: '650px', md: '800px' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        overflow: 'visible',
        perspective: '1000px',
        mb: 4,
      }}
    >
      {/* Central Core - Facial Recognition Icon - Responsive */}
      <MotionBox
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
        }}
        sx={{
          position: 'absolute',
          width: { xs: 60, md: 80 },
          height: { xs: 60, md: 80 },
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fdba74 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          boxShadow: '0 0 40px rgba(249,115,22,0.3)',
          willChange: 'transform',
        }}
      >
        <Face sx={{ fontSize: { xs: 30, md: 40 }, color: '#fff' }} />
        
        {/* Single pulsing ring - reduced for performance */}
        <MotionBox
          animate={{
            scale: [1, 1.4],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeOut',
          }}
          sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: '2px solid rgba(249,115,22,0.5)',
            willChange: 'transform, opacity',
          }}
        />
      </MotionBox>

      {/* Orbital Ring - Responsive */}
      <Box
        sx={{
          position: 'absolute',
          width: { xs: 280, sm: 320, md: 480 },
          height: { xs: 280, sm: 320, md: 480 },
          borderRadius: '50%',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      />

      {/* Orbital Nodes - Industries - Responsive */}
      {industries.map((industry, index) => {
        const position = calculateNodePosition(index, industries.length, isMobile);
        const isExpanded = expandedId === industry.id;
        const isPulsing = pulsingIds[industry.id];
        const Icon = industry.icon;

        return (
          <MotionBox
            key={industry.id}
            onClick={(e) => {
              e.stopPropagation();
              handleNodeClick(industry.id);
            }}
            sx={{
              position: 'absolute',
              cursor: 'pointer',
              transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: `translate(${position.x}px, ${position.y}px) scale(${isExpanded ? (isMobile ? 1.2 : 1.3) : position.scale})`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            }}
          >
            {/* Energy glow effect */}
            {isPulsing && (
              <MotionBox
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: { xs: 70, md: 100 },
                  height: { xs: 70, md: 100 },
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${industry.color}60 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Node Circle - Responsive */}
            <MotionBox
              whileHover={{ scale: 1.1 }}
              sx={{
                width: { xs: 48, sm: 56, md: 64 },
                height: { xs: 48, sm: 56, md: 64 },
                borderRadius: '50%',
                background: isExpanded ? industry.color : '#ffffff',
                border: `${isMobile ? 2 : 3}px solid ${isExpanded ? industry.color : industry.color + '60'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isExpanded ? '#ffffff' : industry.color,
                boxShadow: isExpanded
                  ? `0 0 30px ${industry.color}60`
                  : `0 4px 15px rgba(0,0,0,0.1)`,
                transition: 'all 0.3s ease',
              }}
            >
              <Icon sx={{ fontSize: { xs: 24, sm: 28, md: 32 } }} />
            </MotionBox>

            {/* Node Label - Responsive */}
            <Typography
              sx={{
                position: 'absolute',
                top: { xs: 55, sm: 65, md: 75 },
                left: '50%',
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                fontSize: { xs: '0.65rem', sm: '0.7rem', md: isExpanded ? '0.85rem' : '0.75rem' },
                fontWeight: isExpanded ? 700 : 600,
                color: isExpanded ? '#0f172a' : '#57534e',
                textShadow: 'none',
                letterSpacing: '0.05em',
                transition: 'all 0.3s ease',
                display: { xs: isExpanded ? 'block' : 'none', sm: 'block' }, // Hide labels on mobile unless expanded
              }}
            >
              {industry.title}
            </Typography>

            {/* Expanded Card - Responsive */}
            <AnimatePresence>
              {isExpanded && (
                <MotionCard
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  sx={{
                    position: 'absolute',
                    top: { xs: 60, sm: 70, md: 80 },
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: { xs: 200, sm: 220, md: 240 },
                    background: '#ffffff',
                    border: `2px solid ${industry.color}40`,
                    borderRadius: '16px',
                    boxShadow: `0 10px 40px rgba(0,0,0,0.12)`,
                    overflow: 'hidden',
                    willChange: 'transform, opacity',
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                    {/* Title */}
                    <Typography
                      sx={{
                        fontSize: { xs: '0.85rem', md: '0.95rem' },
                        fontWeight: 700,
                        color: '#0f172a',
                        mb: 1,
                        lineHeight: 1.3,
                      }}
                    >
                      {industry.title}
                    </Typography>

                    {/* Description */}
                    <Typography
                      sx={{
                        fontSize: { xs: '0.7rem', md: '0.75rem' },
                        color: '#57534e',
                        lineHeight: 1.5,
                      }}
                    >
                      {industry.desc}
                    </Typography>
                  </CardContent>
                </MotionCard>
              )}
            </AnimatePresence>
          </MotionBox>
        );
      })}
    </Box>
  );
};

export default RadialOrbitalTimeline;
