"use client";

import React, { useEffect, useState } from 'react';
import { Box, Typography, Tabs, Tab, Container, CircularProgress, Button, Switch, FormControlLabel, Fade } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import AuthGuard from '@/components/auth/AuthGuard';
import Header from '@/components/Header';
import GameNightsAccordion from '@/components/dashboard/GameNightsAccordion';
import PlayerStatsTable from '@/components/dashboard/PlayerStatsTable';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';

const theme = createTheme({
  direction: "rtl",
  palette: {
    primary: {
      main: "#2563eb",
      light: "#3b82f6",
      dark: "#1d4ed8",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f0f9ff",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: "Assistant, sans-serif",
  },
});

export default function DashboardPage() {
  const [tab, setTab] = useState(0);
  const [showMyStatsOnly, setShowMyStatsOnly] = useState(false);
  const { user, userData, logout } = useAuth();
  const router = useRouter();
  const [hasRankingTask, setHasRankingTask] = useState(false);
  const [rankingTaskId, setRankingTaskId] = useState<string | null>(null);

  // Check for open ranking assignment and get its ID
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "rankingTasks"), where("userId", "==", user.uid), where("completed", "==", false));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setHasRankingTask(true);
        setRankingTaskId(snap.docs[0].id);
      } else {
        setHasRankingTask(false);
        setRankingTaskId(null);
      }
    });
    return () => unsub();
  }, [user]);

  console.log('user:', user);

  const tabItems = [
    { label: 'ערבי משחקים', icon: <SportsSoccerIcon sx={{ mr: 1, color: '#7c3aed' }} /> },
    { label: 'סטטיסטיקת שחקנים', icon: <LeaderboardIcon sx={{ mr: 1, color: '#06b6d4' }} /> },
  ];

  return (
    <AuthGuard requireAuth requirePlayerLink>
      <ThemeProvider theme={theme}>
        <Box sx={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 40%, #f0abfc 100%)" }}>
          <Container maxWidth="lg" sx={{ pt: 4 }}>
            {/* Ranking Assignment Banner */}
            {hasRankingTask && (
              <Box
                sx={{
                  mb: 3,
                  p: 3,
                  borderRadius: 3,
                  background: 'linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 24px 0 #7c3aed33',
                }}
              >
                <span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, marginLeft: 12 }}>משימת דירוג</span>
                  יש לך משימת דירוג שחקנים! <b>לחץ כאן כדי לדרג</b>
                </span>
                <Button
                  variant="contained"
                  sx={{ ml: 2, background: '#fff', color: '#7c3aed', fontWeight: 900, fontSize: '1.1rem', boxShadow: 2, '&:hover': { background: '#ede9fe' } }}
                  onClick={() => {
                    if (rankingTaskId) {
                      router.push(`/rate-players?taskId=${rankingTaskId}`);
                    } else {
                      router.push('/rate-players');
                    }
                  }}
                >
                  עבור לדירוג
                </Button>
              </Box>
            )}
            {/* Header */}
            <Header
              title="דשבורד פדלאות"
              logoSrc="/logo.jpeg"
              {...((userData?.role === 'admin' || userData?.role === 'super-admin') && {
                navButtonLabel: "פאנל ניהול",
                onNavButtonClick: () => router.push('/admin'),
              })}
              userEmail={user?.email || ''}
              userAvatarUrl={user?.photoURL || ''}
              onLogout={logout}
              userRole={userData?.role}
              tabs={
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  textColor="primary"
                  indicatorColor="secondary"
                  variant="fullWidth"
                  sx={{
                    minHeight: 56,
                    bgcolor: 'rgba(248,250,252,0.85)',
                    borderRadius: 3,
                    boxShadow: '0 2px 8px -2px #a5b4fc33',
                    mb: 2,
                    fontFamily: 'Assistant, Nunito, sans-serif',
                  }}
                  TabIndicatorProps={{
                    style: {
                      height: 5,
                      borderRadius: 3,
                      background: 'linear-gradient(90deg, #7c3aed 0%, #06b6d4 100%)',
                      transition: 'all 0.3s cubic-bezier(.4,2,.6,1)',
                    },
                  }}
                >
                  {tabItems.map((item, idx) => (
                    <Tab
                      key={item.label}
                      label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{item.icon}{item.label}</Box>}
                      sx={{
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        minWidth: 140,
                        borderRadius: 2,
                        color: tab === idx ? '#7c3aed' : '#334155',
                        transition: 'all 0.2s',
                        textTransform: 'none',
                        letterSpacing: 0.5,
                        px: 3,
                        py: 1.5,
                        '&:hover': {
                          background: 'rgba(124,58,237,0.08)',
                          color: '#06b6d4',
                        },
                      }}
                    />
                  ))}
                </Tabs>
              }
            />
            {/* Show My Stats Only Toggle */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showMyStatsOnly}
                    onChange={e => setShowMyStatsOnly(e.target.checked)}
                    color="primary"
                  />
                }
                label="הצג רק את הסטטיסטיקה שלי"
                labelPlacement="start"
              />
            </Box>
            {/* Tab Panels */}
            <Fade in timeout={500}>
              <Box>
                {tab === 0 && <GameNightsAccordion showMyStatsOnly={showMyStatsOnly} />}
                {tab === 1 && <PlayerStatsTable showMyStatsOnly={showMyStatsOnly} />}
              </Box>
            </Fade>
          </Container>
        </Box>
      </ThemeProvider>
    </AuthGuard>
  );
} 