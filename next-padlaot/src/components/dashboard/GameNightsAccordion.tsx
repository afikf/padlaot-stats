// GameNightsAccordion: lists all game nights as accordions with mini-game details

import StatsSummary from './StatsSummary';
import { useGameNightsCache } from '@/hooks/useGameNightsCache';
import { usePlayerStatsCache } from '@/hooks/usePlayerStatsCache';
import { useAuth } from '@/contexts/AuthContext';
import {
  Box, CircularProgress, Typography, Accordion, AccordionSummary, AccordionDetails, Divider, Stack, Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getPlayerName(players: any[], id: string) {
  const player = players.find((p) => p.id === id);
  return player ? player.name : id;
}

function getTeamScore(liveGoals: any[], teamKey: string) {
  if (!Array.isArray(liveGoals)) return 0;
  return liveGoals.filter((g) => g.team === teamKey).length;
}

function getTeamDisplayName(night: any, teamKey: string, players: any[]) {
  const team = night.teams?.[teamKey];
  if (team && Array.isArray(team) && team.length > 0) {
    const firstPlayerId = team[0];
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

export default function GameNightsAccordion({ showMyStatsOnly }: { showMyStatsOnly?: boolean }) {
  const { gameNights, loading: loadingNights, error: errorNights } = useGameNightsCache();
  const { players, loading: loadingPlayers, error: errorPlayers } = usePlayerStatsCache();
  const { userData } = useAuth();

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
          return (teamA && teamA.includes(userData.playerId)) ||
                 (teamB && teamB.includes(userData.playerId));
        }
      )
    );
  }

  // Sort by date, newest first
  filteredNights = [...filteredNights].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <>
      <StatsSummary gameNights={gameNights} players={players} showMyStatsOnly={showMyStatsOnly} userData={userData} />
      {filteredNights.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">לא נמצאו ערבי משחקים</Typography>
        </Box>
      ) : (
        <Box>
          {filteredNights.map((night) => {
            console.log('DASHBOARD status:', night.status, typeof night.status);
            const statusInfo = getStatusLabel(
              night.status !== undefined && night.status !== null ? night.status : 'draft'
            );
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
                {Array.isArray(night.miniGames) && night.miniGames.length > 0 ? (
                  night.miniGames.map((mg: any, idx: number) => {
                    // Infer team keys
                    const teamAKey = mg.teamA || 'A';
                    const teamBKey = mg.teamB || 'B';
                    const scoreA = getTeamScore(mg.liveGoals, teamAKey);
                    const scoreB = getTeamScore(mg.liveGoals, teamBKey);
                    const teamADisplay = getTeamDisplayName(night, teamAKey, players);
                    const teamBDisplay = getTeamDisplayName(night, teamBKey, players);
                    return (
                      <Box key={mg.id || idx} sx={{ mb: 3 }}>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                          <Typography fontWeight={600} color="primary">
                            {teamADisplay}
                          </Typography>
                          <Typography fontWeight={700}>
                            {scoreA} : {scoreB}
                          </Typography>
                          <Typography fontWeight={600} color="primary">
                            {teamBDisplay}
                          </Typography>
                        </Stack>
                        {/* Goals List */}
                        {Array.isArray(mg.liveGoals) && mg.liveGoals.length > 0 ? (
                          <Box sx={{ pl: 2 }}>
                            {mg.liveGoals.map((goal: any, i: number) => (
                              <Typography key={goal.id || i} variant="body2" sx={{ mb: 0.5 }}>
                                {getPlayerName(players, goal.scorerId)}
                                {goal.assisterId && (
                                  <>
                                    {' '}(<span style={{ color: '#2563eb' }}>{getPlayerName(players, goal.assisterId)}</span>)
                                  </>
                                )}
                              </Typography>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
                            לא הוזנו שערים
                          </Typography>
                        )}
                        {idx < night.miniGames.length - 1 && <Divider sx={{ my: 2 }} />}
                      </Box>
                    );
                  })
                ) : (
                  <Typography color="text.secondary">לא נמצאו מיני-משחקים לערב זה</Typography>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
        </Box>
      )}
    </>
  );
} 