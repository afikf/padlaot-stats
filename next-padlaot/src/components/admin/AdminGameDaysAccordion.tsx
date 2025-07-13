import React from 'react';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails, Divider, Stack, Chip, IconButton, Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

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
  const team = night.teams?.[teamKey];
  // Support both array and object structure
  if (Array.isArray(team) && team.length > 0) {
    const firstPlayerId = team[0];
    const firstPlayerName = getPlayerName(players, firstPlayerId);
    return `קבוצת ${firstPlayerName}`;
  } else if (team && Array.isArray(team.players) && team.players.length > 0) {
    const firstPlayerId = team.players[0];
    const firstPlayerName = getPlayerName(players, firstPlayerId);
    return `קבוצת ${firstPlayerName}`;
  }
  return 'קבוצה';
}

function getStatusLabel(status: number | string) {
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

interface AdminGameDaysAccordionProps {
  gameDays: any[];
  players?: any[];
  onEdit?: (gameDay: any) => void;
  onDelete?: (gameDay: any) => void;
  onMakeLive?: (gameDay: any) => void;
}

const AdminGameDaysAccordion: React.FC<AdminGameDaysAccordionProps> = ({ gameDays, players = [], onEdit, onDelete, onMakeLive }) => {
  return (
    <Box>
      {gameDays.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">לא נמצאו ערבי משחקים</Typography>
        </Box>
      ) : (
        <Box>
          {gameDays.map((night) => {
            console.log('ADMIN status:', night.status, typeof night.status);
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
                    <Box sx={{ flexGrow: 1 }} />
                    {/* Show 'Make Live' button only for upcoming games */}
                    {onMakeLive && night.status === 1 && (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        sx={{ fontWeight: 700, ml: 1 }}
                        onClick={e => { e.stopPropagation(); onMakeLive(night); }}
                      >
                        הפוך לחי
                      </Button>
                    )}
                    {onEdit && (
                      <span
                        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', padding: 4, borderRadius: 4, transition: 'background 0.2s', marginLeft: 2 }}
                        onClick={e => { e.stopPropagation(); onEdit(night); }}
                        tabIndex={0}
                        role="button"
                        aria-label="ערוך"
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onEdit(night); } }}
                        onMouseOver={e => (e.currentTarget.style.background = '#f3f4f6')}
                        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <EditIcon fontSize="small" />
                      </span>
                    )}
                    {onDelete && (
                      <span
                        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', padding: 4, borderRadius: 4, transition: 'background 0.2s' }}
                        onClick={e => { e.stopPropagation(); onDelete(night); }}
                        tabIndex={0}
                        role="button"
                        aria-label="מחק"
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onDelete(night); } }}
                        onMouseOver={e => (e.currentTarget.style.background = '#f3f4f6')}
                        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <DeleteIcon fontSize="small" />
                      </span>
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {Array.isArray(night.miniGames) && night.miniGames.length > 0 ? (
                    night.miniGames.map((mg: any, idx: number) => {
                      const teamAKey = mg.teamA || 'A';
                      const teamBKey = mg.teamB || 'B';
                      // Use mg.goals if present, otherwise mg.liveGoals
                      const goalsArr = Array.isArray(mg.goals) ? mg.goals : (Array.isArray(mg.liveGoals) ? mg.liveGoals : []);
                      const scoreA = getTeamScore(goalsArr, teamAKey);
                      const scoreB = getTeamScore(goalsArr, teamBKey);
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
                          {goalsArr.length > 0 ? (
                            <Box sx={{ pl: 2 }}>
                              {goalsArr.map((goal: any, i: number) => (
                                <Typography key={goal.id || i} variant="body2" sx={{ mb: 0.5 }}>
                                  {getPlayerName(players, goal.scorerId)}
                                  {goal.assistId && (
                                    <>
                                      {' '}(<span style={{ color: '#2563eb' }}>{getPlayerName(players, goal.assistId)}</span>)
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
    </Box>
  );
};

export default AdminGameDaysAccordion; 