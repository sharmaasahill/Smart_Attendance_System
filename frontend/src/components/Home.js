import React, { useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Stack,
} from '@mui/material';
import {
  Business,
  School,
  Factory,
  LocalHospital,
  Storefront,
  TrendingUp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  useInView,
} from 'framer-motion';
import RadialOrbitalTimeline from './RadialOrbitalTimeline';

const MotionBox = motion(Box);

// SCROLL UTILITIES
const ScrollReveal = ({ children, delay = 0, direction = 'up', distance = 50 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const dirs = { up: { y: distance }, down: { y: -distance }, left: { x: distance }, right: { x: -distance } };
  return (
    <MotionBox ref={ref} initial={{ opacity: 0, ...dirs[direction] }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >{children}</MotionBox>
  );
};

const Stagger = ({ children, stagger = 0.08 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <MotionBox ref={ref} initial="hidden" animate={isInView ? 'visible' : 'hidden'}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: stagger } } }}
    >{children}</MotionBox>
  );
};
const StaggerChild = ({ children }) => (
  <MotionBox variants={{
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  }}>{children}</MotionBox>
);

// MAIN HOME
const Home = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ background: '#f5f3f0', overflow: 'hidden' }}>

      {/*
          HERO SECTION — Static full-screen hero with face background
          Text on LEFT, face recognition overlay (ZOOMED OUT)
       */}
      <Box sx={{ position: 'relative', height: { xs: '100svh', md: '100vh' }, overflow: 'hidden', background: '#f5f3f0' }}>
        
        {/* Face Background Image - Custom landing image */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/landing.png)',
            backgroundSize: 'cover',
            backgroundPosition: { xs: 'center center', md: 'center center' },
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: { 
                xs: 'linear-gradient(to bottom, rgba(15,23,42,0.75) 0%, rgba(15,23,42,0.6) 50%, rgba(15,23,42,0.75) 100%)',
                md: 'linear-gradient(to right, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.35) 40%, transparent 60%)'
              },
            },
          }}
        />

        {/* Face Recognition Landmarks Overlay */}

        <Container maxWidth="lg" sx={{ position: 'relative', height: '100%', zIndex: 5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', height: '100%', pt: { xs: 12, md: 15 } }}>
            <Grid container spacing={4} justifyContent="center">
              
              {/* Centered Text Content */}
              <Grid item xs={12}>
                <MotionBox
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  sx={{ textAlign: 'center' }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                      color: '#ffffff',
                      fontSize: { xs: '2.5rem', sm: '3rem', md: '3.75rem' },
                      mb: 2,
                      textShadow: '0 2px 16px rgba(0,0,0,0.55)',
                    }}
                  >
                    Smart Attendance System
                  </Typography>
                </MotionBox>

                <MotionBox
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.5 }}
                  sx={{ textAlign: 'center' }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
                      color: 'rgba(255,255,255,0.95)',
                      fontSize: { xs: '1rem', md: '1.15rem' },
                      fontWeight: 400,
                      lineHeight: 1.5,
                      maxWidth: 600,
                      mx: 'auto',
                      textShadow: '1px 1px 3px rgba(0,0,0,0.5)',
                    }}
                  >
                    AI-powered facial recognition for contactless attendance tracking
                  </Typography>
                </MotionBox>
              </Grid>
            </Grid>
          </Box>
        </Container>

        {/* Bottom Statistics Bar */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          sx={{
            position: 'absolute',
            bottom: { xs: 20, md: 40 },
            left: 0,
            right: 0,
            zIndex: 5,
            px: { xs: 2, md: 8 },
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{
              display: 'flex',
              justifyContent: { xs: 'space-around', md: 'space-between' },
              alignItems: 'center',
              flexWrap: 'nowrap',
              gap: { xs: 1, md: 3 },
            }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.85rem', md: '1.3rem' }, color: '#fff', whiteSpace: 'nowrap' }}>
                  College Project
                </Typography>
                <Typography sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' }, color: 'rgba(255,255,255,0.6)', display: { xs: 'none', md: 'block' } }}>
                  academic research & development
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.85rem', md: '1.3rem' }, color: '#fff', whiteSpace: 'nowrap' }}>
                  Deep Learning
                </Typography>
                <Typography sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' }, color: 'rgba(255,255,255,0.6)', display: { xs: 'none', md: 'block' } }}>
                  facial recognition technology
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.85rem', md: '1.3rem' }, color: '#fff', whiteSpace: 'nowrap' }}>
                  Contactless
                </Typography>
                <Typography sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' }, color: 'rgba(255,255,255,0.6)', display: { xs: 'none', md: 'block' } }}>
                  touchless verification
                </Typography>
              </Box>
            </Box>
          </Container>
        </MotionBox>
      </Box>

      {/*
          TRUSTED BY SECTION
       */}
      <Box id="features" sx={{ py: { xs: 6, md: 8 }, background: 'linear-gradient(180deg, #f5f3f0 0%, #ffffff 100%)' }}>
        <Container maxWidth="lg">
          <Typography sx={{ textAlign: 'center', color: '#78716c', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 4 }}>
            Potential applications across industries
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 4, md: 6 }, opacity: 0.4 }}>
            {['Enterprise', 'Education', 'Healthcare', 'Manufacturing', 'Retail', 'Technology'].map((company, i) => (
              <Typography key={i} sx={{ fontSize: { xs: '1.2rem', md: '1.5rem' }, fontWeight: 700, color: '#1c1917', letterSpacing: '-0.02em' }}>
                {company}
              </Typography>
            ))}
          </Box>
        </Container>
      </Box>

      {/*
          PROBLEM/SOLUTION SECTION - Split Image + Content
       */}
      <Box sx={{ py: { xs: 8, md: 16 }, background: '#ffffff' }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
            <Grid item xs={12} md={6} order={{ xs: 2, md: 1 }}>
              <ScrollReveal direction="left">
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=900&fit=crop&q=80"
                    alt="Traditional attendance problems"
                    sx={{
                      width: '100%',
                      height: { xs: 300, md: 500 },
                      objectFit: 'cover',
                      borderRadius: { xs: '16px', md: '24px' },
                      boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
                    }}
                  />
                  {/* Overlay badge */}
                  <Box sx={{
                    position: 'absolute',
                    bottom: { xs: 16, md: 24 },
                    left: { xs: 16, md: 24 },
                    background: 'rgba(15,23,42,0.92)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: { xs: '12px', md: '16px' },
                    p: { xs: 2, md: 3 },
                    maxWidth: { xs: 200, md: 280 },
                  }}>
                    <Typography sx={{ color: '#f97316', fontSize: { xs: '1.75rem', md: '2.5rem' }, fontWeight: 800, lineHeight: 1, mb: 0.5 }}>
                      Manual
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: { xs: '0.75rem', md: '0.85rem' }, lineHeight: 1.5 }}>
                      Traditional attendance tracking challenges
                    </Typography>
                  </Box>
                </Box>
              </ScrollReveal>
            </Grid>

            <Grid item xs={12} md={6} order={{ xs: 1, md: 2 }}>
              <ScrollReveal direction="right">
                <Box sx={{ pl: { md: 4 } }}>
                  <Typography sx={{
                    color: '#f97316',
                    fontSize: { xs: '0.75rem', md: '0.85rem' },
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    mb: 2,
                  }}>
                    The Challenge
                  </Typography>
                  <Typography sx={{
                    fontSize: { xs: '1.75rem', md: '2.75rem' },
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '-0.03em',
                    lineHeight: 1.15,
                    mb: { xs: 2, md: 3 },
                  }}>
                    Traditional attendance
                    <br />systems have limitations
                  </Typography>
                  <Typography sx={{
                    color: '#57534e',
                    fontSize: { xs: '0.95rem', md: '1.05rem' },
                    lineHeight: 1.8,
                    mb: { xs: 3, md: 4 },
                  }}>
                    Manual attendance systems rely on paper registers or card-based entry, which are time-consuming 
                    and prone to errors. Biometric scanners require physical contact, raising hygiene concerns. 
                    These methods also make it difficult to prevent proxy attendance and track real-time data.
                  </Typography>

                  <Stack spacing={{ xs: 2, md: 2.5 }}>
                    {[
                      { text: 'Time-intensive manual processes slow down operations' },
                      { text: 'Physical contact points create hygiene concerns' },
                      { text: 'Vulnerable to proxy attendance and manipulation' },
                      { text: 'Difficult to integrate with digital systems' },
                    ].map((item, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'start' }}>
                        <Box sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#f97316',
                          flexShrink: 0,
                          mt: 1,
                        }} />
                        <Typography sx={{ color: '#44403c', fontSize: { xs: '0.85rem', md: '0.95rem' }, lineHeight: 1.7 }}>
                          {item.text}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </ScrollReveal>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/*
          SOLUTION SECTION - Reversed Layout
       */}
      <Box sx={{ py: { xs: 8, md: 16 }, background: '#fafaf9' }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center" direction={{ xs: 'column-reverse', md: 'row' }}>
            <Grid item xs={12} md={6}>
              <ScrollReveal direction="left">
                <Box sx={{ pr: { md: 4 } }}>
                  <Typography sx={{
                    color: '#10b981',
                    fontSize: { xs: '0.75rem', md: '0.85rem' },
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    mb: 2,
                  }}>
                    The Solution
                  </Typography>
                  <Typography sx={{
                    fontSize: { xs: '1.75rem', md: '2.75rem' },
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '-0.03em',
                    lineHeight: 1.15,
                    mb: { xs: 2, md: 3 },
                  }}>
                    AI-powered facial
                    <br />recognition system
                  </Typography>
                  <Typography sx={{
                    color: '#57534e',
                    fontSize: { xs: '0.95rem', md: '1.05rem' },
                    lineHeight: 1.8,
                    mb: { xs: 3, md: 4 },
                  }}>
                    This project leverages deep learning algorithms to create a contactless attendance system. 
                    The system captures and verifies facial features in real-time, eliminating the need for manual 
                    intervention or physical contact while ensuring accurate identity verification.
                  </Typography>

                  <Stack spacing={{ xs: 2, md: 2.5 }}>
                    {[
                      { label: 'Real-time Processing', value: '< 2 sec', color: '#6366f1', desc: 'Instant face detection and verification' },
                      { label: 'High Accuracy', value: '99%+', color: '#10b981', desc: 'Deep learning facial recognition' },
                      { label: 'Contactless', value: '100%', color: '#f97316', desc: 'No physical touch required' },
                    ].map((item, i) => (
                      <Box key={i} sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: { xs: 2, md: 2.5 },
                        p: { xs: 2, md: 2.5 },
                        background: '#fff',
                        borderRadius: { xs: '12px', md: '16px' },
                        border: '1px solid #f5f5f4',
                      }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.3 }}>
                            <Typography sx={{ color: '#78716c', fontSize: { xs: '0.75rem', md: '0.8rem' } }}>
                              {item.label}
                            </Typography>
                            <Typography sx={{ color: item.color, fontSize: { xs: '1rem', md: '1.2rem' }, fontWeight: 800, lineHeight: 1 }}>
                              {item.value}
                            </Typography>
                          </Box>
                          <Typography sx={{ color: '#a8a29e', fontSize: { xs: '0.7rem', md: '0.75rem' }, lineHeight: 1.4 }}>
                            {item.desc}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </ScrollReveal>
            </Grid>

            <Grid item xs={12} md={6}>
              <ScrollReveal direction="right">
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&h=900&fit=crop&q=80"
                    alt="Facial recognition solution"
                    sx={{
                      width: '100%',
                      height: { xs: 300, md: 500 },
                      objectFit: 'cover',
                      borderRadius: { xs: '16px', md: '24px' },
                      boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
                    }}
                  />
                  {/* Floating verification badge */}
                  <MotionBox
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    sx={{
                      position: 'absolute',
                      top: { xs: 16, md: 24 },
                      right: { xs: 16, md: 24 },
                      background: '#fff',
                      borderRadius: { xs: '12px', md: '16px' },
                      p: { xs: 2, md: 2.5 },
                      boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: { xs: 1, md: 1.5 },
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' }, color: '#78716c', lineHeight: 1 }}>
                        Verified
                      </Typography>
                      <Typography sx={{ fontSize: { xs: '0.95rem', md: '1.1rem' }, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                        1.8s
                      </Typography>
                    </Box>
                  </MotionBox>
                </Box>
              </ScrollReveal>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/*
          TECHNOLOGY FEATURES - 3 Column Cards
       */}
      <Box sx={{ py: { xs: 8, md: 18 }, background: '#ffffff' }}>
        <Container maxWidth="lg">
          <ScrollReveal>
            <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 10 } }}>
              <Typography sx={{
                fontSize: { xs: '1.75rem', md: '3.5rem' },
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.04em',
                lineHeight: 1.1,
                mb: { xs: 2, md: 3 },
              }}>
                Enterprise-grade technology
              </Typography>
              <Typography sx={{
                color: '#78716c',
                fontSize: { xs: '0.95rem', md: '1.1rem' },
                lineHeight: 1.7,
                maxWidth: 600,
                mx: 'auto',
              }}>
                Advanced computer vision technology for reliable verification
              </Typography>
            </Box>
          </ScrollReveal>

          <Stagger stagger={0.12}>
            <Grid container spacing={{ xs: 3, md: 4 }}>
              {[
                {
                  title: '128-Dimensional Encoding',
                  desc: 'Deep neural networks map every face to a unique 128-dimensional vector. Encrypted and stored locally.',
                  image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=400&fit=crop&q=80',
                  color: '#6366f1',
                },
                {
                  title: 'Anti-Spoofing Protection',
                  desc: 'Liveness detection blocks photos, videos, masks, and deepfakes. Only real humans pass.',
                  image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=400&fit=crop&q=80',
                  color: '#10b981',
                },
                {
                  title: 'Multi-Environment Optimization',
                  desc: 'Auto-adjusts to any lighting—from bright sunlight to dim offices. Works everywhere.',
                  image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=400&fit=crop&q=80',
                  color: '#f97316',
                },
              ].map((feature, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <StaggerChild>
                    <MotionBox
                      whileHover={{ y: -8 }}
                      sx={{
                        height: '100%',
                        borderRadius: { xs: '16px', md: '24px' },
                        overflow: 'hidden',
                        background: '#fff',
                        border: '1px solid #f5f5f4',
                        transition: 'all 0.4s ease',
                        cursor: 'default',
                        '&:hover': {
                          boxShadow: '0 30px 70px rgba(0,0,0,0.08)',
                          borderColor: feature.color + '40',
                        },
                      }}
                    >
                      {/* Image */}
                      <Box sx={{ position: 'relative', height: { xs: 180, md: 220 }, overflow: 'hidden' }}>
                        <Box
                          component="img"
                          src={feature.image}
                          alt={feature.title}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.4s ease',
                            '&:hover': { transform: 'scale(1.05)' },
                          }}
                        />
                        <Box sx={{
                          position: 'absolute',
                          inset: 0,
                          background: `linear-gradient(to bottom, transparent 40%, ${feature.color}20)`,
                        }} />
                      </Box>

                      {/* Content */}
                      <Box sx={{ p: { xs: 3, md: 4 } }}>
                        <Typography sx={{
                          fontSize: { xs: '1.1rem', md: '1.25rem' },
                          fontWeight: 700,
                          color: '#0f172a',
                          mb: { xs: 1, md: 1.5 },
                          lineHeight: 1.3,
                        }}>
                          {feature.title}
                        </Typography>
                        <Typography sx={{
                          color: '#78716c',
                          fontSize: { xs: '0.85rem', md: '0.95rem' },
                          lineHeight: 1.7,
                        }}>
                          {feature.desc}
                        </Typography>
                      </Box>
                    </MotionBox>
                  </StaggerChild>
                </Grid>
              ))}
            </Grid>
          </Stagger>
        </Container>
      </Box>

      {/*
          HOW IT WORKS - Visual Timeline
       */}
      <Box id="how-it-works" sx={{ py: { xs: 8, md: 18 }, background: '#ffffff', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative gradient */}
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '400px', md: '800px' },
          height: { xs: '400px', md: '800px' },
          background: 'radial-gradient(circle, rgba(249,115,22,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <Container maxWidth="lg" sx={{ position: 'relative' }}>
          <ScrollReveal>
            <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 12 } }}>
              <Typography sx={{
                fontSize: { xs: '1.75rem', md: '3.5rem' },
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.04em',
                lineHeight: 1.1,
                mb: { xs: 2, md: 3 },
              }}>
                Three steps to transform
                <br />your attendance system
              </Typography>
              <Typography sx={{
                color: '#78716c',
                fontSize: { xs: '0.95rem', md: '1.1rem' },
                lineHeight: 1.7,
              }}>
                From onboarding to daily verification in minutes
              </Typography>
            </Box>
          </ScrollReveal>

          <Grid container spacing={{ xs: 4, md: 6 }}>
            {[
              {
                num: '01',
                title: 'Capture & Register',
                desc: 'Employees capture 5-6 photos during onboarding. Guided flow ensures optimal quality. Takes 60 seconds.',
                image: '/Capture_Register.png',
                color: '#f97316',
                stats: { label: 'Registration time', value: '~60 sec' },
              },
              {
                num: '02',
                title: 'AI Processing',
                desc: 'Neural networks extract facial features and create a 128-dimensional signature—encrypted and stored securely.',
                image: 'https://images.unsplash.com/photo-1535378620166-273708d44e4c?w=700&h=500&fit=crop&q=80',
                color: '#6366f1',
                stats: { label: 'Encoding accuracy', value: '99.97%' },
              },
              {
                num: '03',
                title: 'Instant Verification',
                desc: 'Walk past any camera. Face detected, matched, logged—with timestamp and location. Automatic and touchless.',
                image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=700&h=500&fit=crop&q=80',
                color: '#10b981',
                stats: { label: 'Verification speed', value: '<2 sec' },
              },
            ].map((step, i) => (
              <Grid item xs={12} key={i}>
                <ScrollReveal delay={i * 0.15}>
                  <MotionBox
                    whileHover={{ scale: 1.01 }}
                    sx={{
                      borderRadius: { xs: '20px', md: '28px' },
                      background: '#fafaf9',
                      border: '1px solid #f5f5f4',
                      overflow: 'hidden',
                      transition: 'all 0.4s ease',
                      '&:hover': {
                        background: '#fff',
                        borderColor: step.color + '30',
                        boxShadow: `0 30px 70px ${step.color}15`,
                      },
                    }}
                  >
                    <Grid container>
                      {/* Image Side */}
                      <Grid item xs={12} md={5}>
                        <Box sx={{ position: 'relative', height: { xs: 220, md: '100%' }, minHeight: { md: 380 } }}>
                          <Box
                            component="img"
                            src={step.image}
                            alt={step.title}
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                          <Box sx={{
                            position: 'absolute',
                            inset: 0,
                            background: `linear-gradient(135deg, ${step.color}20 0%, transparent 60%)`,
                          }} />
                          {/* Step number badge */}
                          <Box sx={{
                            position: 'absolute',
                            top: { xs: 16, md: 24 },
                            left: { xs: 16, md: 24 },
                            width: { xs: 52, md: 64 },
                            height: { xs: 52, md: 64 },
                            borderRadius: { xs: '14px', md: '18px' },
                            background: step.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: { xs: '1.25rem', md: '1.5rem' },
                            fontWeight: 800,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                          }}>
                            {step.num}
                          </Box>
                        </Box>
                      </Grid>

                      {/* Content Side */}
                      <Grid item xs={12} md={7}>
                        <Box sx={{ p: { xs: 3, md: 6 }, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                          <Typography sx={{
                            fontSize: { xs: '1.5rem', md: '2.25rem' },
                            fontWeight: 800,
                            color: '#0f172a',
                            mb: { xs: 2, md: 2.5 },
                            letterSpacing: '-0.02em',
                          }}>
                            {step.title}
                          </Typography>
                          <Typography sx={{
                            color: '#57534e',
                            fontSize: { xs: '0.95rem', md: '1.05rem' },
                            lineHeight: 1.8,
                            mb: { xs: 3, md: 4 },
                          }}>
                            {step.desc}
                          </Typography>

                          {/* Stats badge */}
                          <Box sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: { xs: 1.5, md: 2 },
                            p: { xs: 2, md: 2.5 },
                            background: '#fff',
                            borderRadius: { xs: '12px', md: '16px' },
                            border: `1px solid ${step.color}20`,
                            width: 'fit-content',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                          }}>
                            <Box sx={{
                              width: { xs: 8, md: 10 },
                              height: { xs: 8, md: 10 },
                              borderRadius: '50%',
                              background: step.color,
                              boxShadow: `0 0 20px ${step.color}`,
                            }} />
                            <Box>
                              <Typography sx={{ color: '#78716c', fontSize: { xs: '0.7rem', md: '0.75rem' }, lineHeight: 1 }}>
                                {step.stats.label}
                              </Typography>
                              <Typography sx={{ color: '#0f172a', fontSize: { xs: '1.2rem', md: '1.4rem' }, fontWeight: 700, lineHeight: 1.2, mt: 0.5 }}>
                                {step.stats.value}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </MotionBox>
                </ScrollReveal>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/*
          RADIAL ORBITAL TIMELINE - Built for every industry
       */}
      <Box id="industries" sx={{ py: { xs: 12, md: 16 }, background: '#fafaf9' }}>
        <Container maxWidth="lg">
          <ScrollReveal>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography sx={{
                fontSize: { xs: '2.25rem', md: '3.5rem' },
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.04em',
                lineHeight: 1.1,
                mb: 3,
              }}>
                Built for every industry
              </Typography>
              <Typography sx={{
                color: '#78716c',
                fontSize: '1.1rem',
                lineHeight: 1.7,
                maxWidth: 600,
                mx: 'auto',
              }}>
                Exploring use cases across different sectors
              </Typography>
            </Box>
          </ScrollReveal>

          <RadialOrbitalTimeline
            industries={[
              {
                id: 1,
                title: 'Corporate Offices',
                desc: 'Seamless facial recognition at building entrances and meeting rooms',
                icon: Business,
                color: '#6366f1',
                relatedIds: [2, 6],
              },
              {
                id: 2,
                title: 'Educational Institutions',
                desc: 'Automate student and faculty attendance across campuses',
                icon: School,
                color: '#10b981',
                relatedIds: [1, 3],
              },
              {
                id: 3,
                title: 'Manufacturing Plants',
                desc: 'Track shift workers without shared touchpoints for production floors',
                icon: Factory,
                color: '#f97316',
                relatedIds: [2, 4],
              },
              {
                id: 4,
                title: 'Healthcare Facilities',
                desc: 'Secure attendance tracking for hospitals and medical centers',
                icon: LocalHospital,
                color: '#ec4899',
                relatedIds: [3, 5],
              },
              {
                id: 5,
                title: 'Retail & Hospitality',
                desc: 'Multi-location workforce management with real-time data',
                icon: Storefront,
                color: '#8b5cf6',
                relatedIds: [4, 6],
              },
              {
                id: 6,
                title: 'Tech Startups',
                desc: 'Modern, flexible attendance for hybrid and remote-first teams',
                icon: TrendingUp,
                color: '#0ea5e9',
                relatedIds: [5, 1],
              },
            ]}
          />
        </Container>
      </Box>

      {/*
          FINAL CTA SECTION
       */}
      <Box sx={{ py: { xs: 8, md: 18 }, background: '#ffffff', position: 'relative', overflow: 'hidden' }}>
        {/* Background decoration image */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: { xs: '100%', md: '50%' },
            height: '100%',
            opacity: 0.08,
            backgroundImage: 'url(https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=800&fit=crop&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            pointerEvents: 'none',
          }}
        />
        
        <Container maxWidth="lg" sx={{ position: 'relative' }}>
          <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
            {/* Left side - Image */}
            <Grid item xs={12} md={5}>
              <ScrollReveal direction="left">
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: { xs: '16px', md: '24px' },
                    overflow: 'hidden',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                  }}
                >
                  <Box
                    component="img"
                    src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=700&fit=crop&q=80"
                    alt="Contactless facial recognition"
                    sx={{
                      width: '100%',
                      height: { xs: 300, md: 450 },
                      objectFit: 'cover',
                    }}
                  />
                  {/* Overlay gradient */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '50%',
                      background: 'linear-gradient(to top, rgba(15,23,42,0.8) 0%, transparent 100%)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      p: { xs: 2, md: 3 },
                    }}
                  >
                    <Box>
                      <Typography sx={{ color: '#f97316', fontSize: { xs: '0.7rem', md: '0.75rem' }, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.5 }}>
                        SECURE & FAST
                      </Typography>
                      <Typography sx={{ color: '#ffffff', fontSize: { xs: '0.95rem', md: '1.1rem' }, fontWeight: 700 }}>
                        99.83% Accuracy
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </ScrollReveal>
            </Grid>

            {/* Right side - CTA Content */}
            <Grid item xs={12} md={7}>
              <ScrollReveal direction="right">
                <Box sx={{ pl: { md: 4 } }}>
                  <Typography sx={{ fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', fontSize: { xs: '1.75rem', md: '2.8rem' }, lineHeight: 1.2, mb: { xs: 2, md: 3 } }}>
                    Try the demo
                  </Typography>
                  <Typography sx={{ color: '#78716c', fontSize: { xs: '0.95rem', md: '1.05rem' }, mb: { xs: 4, md: 5 }, lineHeight: 1.7 }}>
                    Experience how facial recognition can transform attendance tracking. 
                    Works with standard webcams—no special hardware needed.
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Button variant="contained" size="large"
                      onClick={() => navigate('/register')}
                      sx={{
                        py: { xs: 1.5, md: 2 }, 
                        px: { xs: 4, md: 5 }, 
                        fontSize: { xs: '0.9rem', md: '1rem' }, 
                        fontWeight: 700, 
                        borderRadius: '50px',
                        background: '#0f172a', 
                        color: '#fff', 
                        textTransform: 'none',
                        boxShadow: '0 8px 30px rgba(15,23,42,0.15)',
                        '&:hover': { background: '#1e293b', transform: 'translateY(-2px)' },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      Try Demo
                    </Button>
                    <Button variant="outlined" size="large"
                      onClick={() => navigate('/mark-attendance')}
                      sx={{
                        py: { xs: 1.5, md: 2 }, 
                        px: { xs: 4, md: 5 }, 
                        fontSize: { xs: '0.9rem', md: '1rem' }, 
                        fontWeight: 600, 
                        borderRadius: '50px',
                        border: '2px solid #d6d3d1', 
                        color: '#57534e', 
                        textTransform: 'none',
                        '&:hover': { border: '2px solid #0f172a', color: '#0f172a', transform: 'translateY(-2px)' },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      Mark Attendance
                    </Button>
                  </Stack>
                </Box>
              </ScrollReveal>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/*
          FOOTER
       */}
      <Box sx={{ py: 5, borderTop: '1px solid #e7e5e4', background: '#ffffff' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <Typography sx={{ color: '#a8a29e', fontSize: '0.85rem' }}>Smart Attendance System © {new Date().getFullYear()}</Typography>
            <Stack direction="row" spacing={3}>
              {[
                { label: 'Privacy', path: '/privacy' },
                { label: 'Terms', path: '/terms' },
                { label: 'Security', path: '/security' },
                { label: 'Docs', path: '/docs' }
              ].map((link) => (
                <Typography 
                  key={link.label} 
                  onClick={() => {
                    // For now, show coming soon alert since these pages don't exist yet
                    alert(`${link.label} page is coming soon!`);
                    // When pages are ready, uncomment this:
                    // navigate(link.path);
                  }}
                  sx={{ 
                    color: '#a8a29e', 
                    fontSize: '0.85rem', 
                    cursor: 'pointer', 
                    '&:hover': { 
                      color: '#57534e',
                      textDecoration: 'underline'
                    }, 
                    transition: 'color 0.2s',
                    userSelect: 'none'
                  }}
                >
                  {link.label}
                </Typography>
              ))}
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
