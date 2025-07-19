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
import { useTournamentsCache } from '@/hooks/useTournamentsCache';
import LiveEventAccordion from '@/components/ui/layout/LiveEventAccordion';
import { usePlayersCache } from '@/hooks/usePlayersCache';
import GameNightSummary from '@/components/dashboard/GameNightSummary';
import { Stack, Divider } from '@mui/material';
import TournamentsAccordion from '@/components/dashboard/TournamentsAccordion';

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
  const { tournaments, loading: loadingTournaments, error: errorTournaments } = useTournamentsCache();
  const { players, loading: loadingPlayers, error: errorPlayers } = usePlayersCache();

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

  // Find the live tournament (status === 2)
  const liveTournament = tournaments?.find(t => t.status === 2);

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
            {/* Live Tournament Card (for all users) */}
            {liveTournament && players && (
              <LiveEventAccordion
                date={liveTournament.date}
                badgeLabel="טורניר חי"
                badgeColor="#a21caf"
                buttonLabel="נהל טורניר חי"
                onButtonClick={() => router.push(`/tournaments/${liveTournament.id}/live`)}
                borderColor="#a21caf"
                summaryBackground="linear-gradient(90deg, #a21caf 0%, #7c3aed 100%)"
                tabLabels={["תוצאות", "סיכום"]}
                renderTabContent={(tabIdx) => {
                  if (tabIdx === 0) {
                    return Array.isArray(liveTournament.miniGames) && liveTournament.miniGames.length > 0 ? (
                      liveTournament.miniGames.map((mg: any, idx: number) => {
                        const teamAKey = mg.teamA || 'A';
                        const teamBKey = mg.teamB || 'B';
                        const goalsArr = mg.goals || mg.liveGoals || [];
                        // Team/captain logic
                        const teamA = liveTournament.teams?.[teamAKey];
                        const teamB = liveTournament.teams?.[teamBKey];
                        const captainAId = teamA?.players?.[0];
                        const captainBId = teamB?.players?.[0];
                        const captainAName = players.find((p: any) => p.id === captainAId)?.name || '';
                        const captainBName = players.find((p: any) => p.id === captainBId)?.name || '';
                        const teamADisplay = `קבוצת ${captainAName}`;
                        const teamBDisplay = `קבוצת ${captainBName}`;
                        const scoreA = goalsArr.filter((g: any) => g.team === teamAKey).length;
                        const scoreB = goalsArr.filter((g: any) => g.team === teamBKey).length;
                        return (
                          <Box key={mg.id || idx} sx={{ mb: 3 }}>
                            <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 1, justifyContent: 'center' }}>
                              {/* Team A */}
                              <Box sx={{ minWidth: 160, textAlign: 'center' }}>
                                <Typography fontWeight={700} color="primary">
                                  {captainAName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                                  {teamADisplay}
                                </Typography>
                                <Typography variant="h5" fontWeight={900}>
                                  {scoreA}
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}>
                                  {goalsArr.filter((g: any) => g.team === teamAKey).map((goal: any, i: number) => (
                                    <Typography key={goal.id || i} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.95rem', textAlign: 'center' }}>
                                      {players.find((p: any) => p.id === goal.scorerId)?.name || goal.scorerId}
                                      {goal.assistId ? (
                                        <>
                                          {' '}(<span style={{ color: '#a21caf' }}>{players.find((p: any) => p.id === goal.assistId)?.name || goal.assistId}</span>)
                                        </>
                                      ) : null}
                                    </Typography>
                                  ))}
                                </Box>
                              </Box>
                              {/* Score separator */}
                              <Typography variant="h5" fontWeight={900} sx={{ mx: 2, alignSelf: 'center' }}>
                                :
                              </Typography>
                              {/* Team B */}
                              <Box sx={{ minWidth: 160, textAlign: 'center' }}>
                                <Typography fontWeight={700} color="primary">
                                  {captainBName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                                  {teamBDisplay}
                                </Typography>
                                <Typography variant="h5" fontWeight={900}>
                                  {scoreB}
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}>
                                  {goalsArr.filter((g: any) => g.team === teamBKey).map((goal: any, i: number) => (
                                    <Typography key={goal.id || i} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.95rem', textAlign: 'center' }}>
                                      {players.find((p: any) => p.id === goal.scorerId)?.name || goal.scorerId}
                                      {goal.assistId ? (
                                        <>
                                          {' '}(<span style={{ color: '#a21caf' }}>{players.find((p: any) => p.id === goal.assistId)?.name || goal.assistId}</span>)
                                        </>
                                      ) : null}
                                    </Typography>
                                  ))}
                                </Box>
                              </Box>
                            </Stack>
                            {/* Duration display */}
                            {mg.status === 'complete' && mg.startTime && mg.endTime && (
                              <Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '1.1rem', textAlign: 'center', mt: 1 }}>
                                משך: {/* You can use a shared formatDuration util here */}
                              </Typography>
                            )}
                            {idx < liveTournament.miniGames.length - 1 && <Divider sx={{ my: 2 }} />}
                          </Box>
                        );
                      })
                    ) : (
                      <Typography color="text.secondary">לא נמצאו מיני-משחקים לטורניר זה</Typography>
                    );
                  }
                  // Tab 1: summary (reuse GameNightSummary for now, or create TournamentSummary)
                  if (tabIdx === 1) {
                    return <GameNightSummary night={liveTournament} players={players} />;
                  }
                  return null;
                }}
              />
            )}
            {/* Tab Panels */}
            <Fade in timeout={500}>
              <Box>
                {tab === 0 && <GameNightsAccordion showMyStatsOnly={showMyStatsOnly} />}
                {tab === 1 && <PlayerStatsTable showMyStatsOnly={showMyStatsOnly} />}
              </Box>
            </Fade>
            
            {/* Tournaments Section */}
            {tournaments && tournaments.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                  טורנירים
                </Typography>
                <TournamentsAccordion tournaments={tournaments} />
              </Box>
            )}
          </Container>
        </Box>
      </ThemeProvider>
    </AuthGuard>
  );
} 