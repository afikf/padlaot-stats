// GameNightsAccordion: lists all game nights as accordions with mini-game details

import StatsSummary from './StatsSummary';
import { useGameNightsCache } from '@/hooks/useGameNightsCache';
import { usePlayerStatsCache } from '@/hooks/usePlayerStatsCache';
import { useAuth } from '@/contexts/AuthContext';
import {
  Box, CircularProgress, Typography, Accordion, AccordionSummary, AccordionDetails, Divider, Stack, Chip, Tabs, Tab, Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useState } from 'react';
import GameNightSummary from './GameNightSummary';
import { useRouter } from 'next/navigation';
import LiveEventAccordion from '@/components/ui/layout/LiveEventAccordion';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getPlayerName(players: any[], id: string) {
  const player = players.find((p) => p.id === id);
  return player ? player.name : id;
}

function getTeamScore(goals: any[], teamKey: string) {
  if (!Array.isArray(goals)) return 0;
  return goals.filter((g) => g.team === teamKey).length;
}

function getTeamDisplayName(night: any, teamKey: string, players: any[]) {
  const teamObj = night.teams?.[teamKey];
  if (teamObj && Array.isArray(teamObj.players) && teamObj.players.length > 0) {
    const firstPlayerId = teamObj.players[0];
    const firstPlayerName = getPlayerName(players, firstPlayerId);
    return `קבוצת ${firstPlayerName}`;
  }
  return 'קבוצה';
}

function getStatusLabel(status: number | string) {
  // Handle both numeric and string status for backward compatibility
  const statusNum = typeof status === 'string' ? parseInt(status) : status;
  
  switch (statusNum) {
    case 0:
      return { label: 'טיוטה', color: 'default' as const };
    case 1:
      return { label: 'עתידי', color: 'warning' as const };
    case 2:
      return { label: 'חי', color: 'error' as const };
    case 3:
      return { label: 'הושלם', color: 'success' as const };
    case 4:
      return { label: 'לא הושלם', color: 'error' as const };
    default:
      return { label: 'לא ידוע', color: 'default' as const };
  }
}

function formatDuration(start: string, end: string) {
  if (!start || !end) return '';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function GameNightsAccordion({ showMyStatsOnly }: { showMyStatsOnly?: boolean }) {
  const { gameNights, loading: loadingNights, error: errorNights } = useGameNightsCache();
  const { players, loading: loadingPlayers, error: errorPlayers } = usePlayerStatsCache();
  const { userData } = useAuth();
  const router = useRouter();
  // Tab state for each game night
  const [tabState, setTabState] = useState<{ [gameNightId: string]: number }>({});

  if (loadingNights || loadingPlayers) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (errorNights || errorPlayers) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Typography color="error">
          שגיאה בטעינת נתונים: {errorNights || errorPlayers}
        </Typography>
      </Box>
    );
  }

  // Filter by "Show My Stats Only"
  let filteredNights = gameNights;
  if (showMyStatsOnly && userData?.playerId) {
    filteredNights = gameNights.filter(night =>
      night.miniGames?.some(
        (mg: any) => {
          const teamA = night.teams?.[mg.teamA];
          const teamB = night.teams?.[mg.teamB];
          return (teamA && teamA.players?.includes(userData.playerId)) ||
                 (teamB && teamB.players?.includes(userData.playerId));
        }
      )
    );
  }

  // Sort by date, newest first
  filteredNights = [...filteredNights].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Find the live game night (status === 2)
  const liveGameNight = gameNights.find(night => night.status === 2);

  return (
    <>
      <StatsSummary gameNights={gameNights} players={players} showMyStatsOnly={showMyStatsOnly} userData={userData} />
      {/* Show live game night at the top if exists */}
      {liveGameNight && (
        <LiveEventAccordion
          date={formatDate(liveGameNight.date)}
          badgeLabel="חי"
          badgeColor="#2563eb"
          buttonLabel="נהל משחק חי"
          onButtonClick={e => {
            e.stopPropagation();
            router.push(`/admin/live/${liveGameNight.id}`);
          }}
          borderColor="#2563eb"
          background={undefined}
          tabLabels={["תוצאות", "סיכום"]}
          renderTabContent={(tabIdx) => {
            if (tabIdx === 0) {
              return Array.isArray(liveGameNight.miniGames) && liveGameNight.miniGames.length > 0 ? (
                liveGameNight.miniGames.map((mg: any, idx: number) => {
                  const teamAKey = mg.teamA || 'A';
                  const teamBKey = mg.teamB || 'B';
                  const goalsArr = mg.goals || mg.liveGoals || [];
                  const scoreA = getTeamScore(goalsArr, teamAKey);
                  const scoreB = getTeamScore(goalsArr, teamBKey);
                  const teamADisplay = getTeamDisplayName(liveGameNight, teamAKey, players);
                  const teamBDisplay = getTeamDisplayName(liveGameNight, teamBKey, players);
                  return (
                    <Box key={mg.id || idx} sx={{ mb: 3 }}>
                      <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 1, justifyContent: 'center' }}>
                        {/* Team A */}
                        <Box sx={{ minWidth: 160, textAlign: 'center' }}>
                          <Typography fontWeight={600} color="primary">
                            {teamADisplay}
                          </Typography>
                          <Typography variant="h5" fontWeight={900}>
                            {scoreA}
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}>
                            {goalsArr.filter((g: any) => g.team === teamAKey).map((goal: any, i: number) => (
                              <Typography key={goal.id || i} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.95rem', textAlign: 'center' }}>
                                {getPlayerName(players, goal.scorerId || goal.scorer || goal.scorerID)}
                                {goal.assistId || goal.assisterId || goal.assistID ? (
                                  <>
                                    {' '}(<span style={{ color: '#2563eb' }}>{getPlayerName(players, goal.assistId || goal.assisterId || goal.assistID)}</span>)
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
                          <Typography fontWeight={600} color="primary">
                            {teamBDisplay}
                          </Typography>
                          <Typography variant="h5" fontWeight={900}>
                            {scoreB}
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}>
                            {goalsArr.filter((g: any) => g.team === teamBKey).map((goal: any, i: number) => (
                              <Typography key={goal.id || i} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.95rem', textAlign: 'center' }}>
                                {getPlayerName(players, goal.scorerId || goal.scorer || goal.scorerID)}
                                {goal.assistId || goal.assisterId || goal.assistID ? (
                                  <>
                                    {' '}(<span style={{ color: '#2563eb' }}>{getPlayerName(players, goal.assistId || goal.assisterId || goal.assistID)}</span>)
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
                          משך: {formatDuration(mg.startTime, mg.endTime)}
                        </Typography>
                      )}
                      {idx < liveGameNight.miniGames.length - 1 && <Divider sx={{ my: 2 }} />}
                    </Box>
                  );
                })
              ) : (
                <Typography color="text.secondary">לא נמצאו מיני-משחקים לערב זה</Typography>
              );
            }
            if (tabIdx === 1) {
              return <GameNightSummary night={liveGameNight} players={players} />;
            }
            return null;
          }}
        />
      )}
      {/* Render the rest of the game nights, excluding the live one if present */}
      <Box>
        {filteredNights.filter(night => !liveGameNight || night.id !== liveGameNight.id).map((night) => {
            console.log('DASHBOARD status:', night.status, typeof night.status);
            const statusInfo = getStatusLabel(
              night.status !== undefined && night.status !== null ? night.status : 'draft'
            );
            // Use tab state per night
            const tab = tabState[night.id] || 0;
            const handleTabChange = (_: any, newValue: number) => {
              setTabState(prev => ({ ...prev, [night.id]: newValue }));
            };
            return (
              <Accordion key={night.id} sx={{ mb: 2, borderRadius: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography fontWeight={600}>{formatDate(night.date)}</Typography>
                    <Chip 
                      label={statusInfo.label} 
                      color={statusInfo.color} 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ width: '100%' }}>
                    <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }}>
                      <Tab label="תוצאות" />
                      <Tab label="סיכום" />
                    </Tabs>
                    {tab === 0 && (
                      Array.isArray(night.miniGames) && night.miniGames.length > 0 ? (
                        night.miniGames.map((mg: any, idx: number) => {
                          const teamAKey = mg.teamA || 'A';
                          const teamBKey = mg.teamB || 'B';
                          const goalsArr = mg.goals || mg.liveGoals || [];
                          const scoreA = getTeamScore(goalsArr, teamAKey);
                          const scoreB = getTeamScore(goalsArr, teamBKey);
                          const teamADisplay = getTeamDisplayName(night, teamAKey, players);
                          const teamBDisplay = getTeamDisplayName(night, teamBKey, players);
                          return (
                            <Box key={mg.id || idx} sx={{ mb: 3 }}>
                              <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 1, justifyContent: 'center' }}>
                                {/* Team A */}
                                <Box sx={{ minWidth: 160, textAlign: 'center' }}>
                                  <Typography fontWeight={600} color="primary">
                                    {teamADisplay}
                                  </Typography>
                                  <Typography variant="h5" fontWeight={900}>
                                    {scoreA}
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}>
                                    {goalsArr.filter((g: any) => g.team === teamAKey).map((goal: any, i: number) => (
                                      <Typography key={goal.id || i} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.95rem', textAlign: 'center' }}>
                                        {getPlayerName(players, goal.scorerId || goal.scorer || goal.scorerID)}
                                        {goal.assistId || goal.assisterId || goal.assistID ? (
                                          <>
                                            {' '}(<span style={{ color: '#2563eb' }}>{getPlayerName(players, goal.assistId || goal.assisterId || goal.assistID)}</span>)
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
                                  <Typography fontWeight={600} color="primary">
                                    {teamBDisplay}
                                  </Typography>
                                  <Typography variant="h5" fontWeight={900}>
                                    {scoreB}
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}>
                                    {goalsArr.filter((g: any) => g.team === teamBKey).map((goal: any, i: number) => (
                                      <Typography key={goal.id || i} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.95rem', textAlign: 'center' }}>
                                        {getPlayerName(players, goal.scorerId || goal.scorer || goal.scorerID)}
                                        {goal.assistId || goal.assisterId || goal.assistID ? (
                                          <>
                                            {' '}(<span style={{ color: '#2563eb' }}>{getPlayerName(players, goal.assistId || goal.assisterId || goal.assistID)}</span>)
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
                                  משך: {formatDuration(mg.startTime, mg.endTime)}
                                </Typography>
                              )}
                              {idx < night.miniGames.length - 1 && <Divider sx={{ my: 2 }} />}
                            </Box>
                          );
                        })
                      ) : (
                        <Typography color="text.secondary">לא נמצאו מיני-משחקים לערב זה</Typography>
                      )
                    )}
                    {tab === 1 && (
                      <GameNightSummary night={night} players={players} />
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
      </Box>
    </>
  );
} 