import React from 'react';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails, Chip, IconButton, Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { TOURNAMENT_STATUS_MAP } from '@/types/tournament';
import { useRouter } from 'next/navigation';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
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

function getTeamCaptainName(team: any, players: any[]) {
  if (!team || !team.players || team.players.length === 0) return `קבוצה ${team?.key || '?'}`;
  const captainId = team.players[0];
  const captain = players?.find(p => p.id === captainId);
  return captain?.name || `קבוצה ${team?.key || '?'}`;
}

export default function TournamentsAccordion({ tournaments, onEdit, onDelete, onMakeLive, players }: {
  tournaments: any[];
  onEdit?: (t: any) => void;
  onDelete?: (t: any) => void;
  onMakeLive?: (t: any) => void;
  players?: any[];
}) {
  const router = useRouter();
  if (!tournaments || tournaments.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography color="text.secondary">לא נמצאו טורנירים</Typography>
      </Box>
    );
  }
  // Move live tournaments to top
  const sorted = [...tournaments].sort((a, b) => (b.status === 2 ? 1 : 0) - (a.status === 2 ? 1 : 0));
  return (
    <Box>
      {sorted.map((tournament) => {
        const statusInfo = getStatusLabel(tournament.status);
        return (
          <Accordion key={tournament.id} sx={{ mb: 2, borderRadius: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography fontWeight={600}>{formatDate(tournament.date)}</Typography>
                <Chip 
                  label={statusInfo.label}
                  color={statusInfo.color}
                  size="small"
                  variant="outlined"
                />
                <Chip 
                  label={`מגרשים: ${tournament.settings?.numberOfPitches ?? '-'}`}
                  color="default"
                  size="small"
                  variant="outlined"
                />
                <Box sx={{ flexGrow: 1 }} />
                {/* Make Live button for upcoming tournaments */}
                {onMakeLive && tournament.status === 1 && (
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    sx={{ fontWeight: 700, ml: 1 }}
                    onClick={e => { e.stopPropagation(); onMakeLive(tournament); }}
                  >
                    הפוך לחי
                  </Button>
                )}
                {/* Manage Live button for live tournaments */}
                {tournament.status === 2 && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 700, ml: 1 }}
                    onClick={e => { e.stopPropagation(); router.push(`/tournaments/${tournament.id}/live`); }}
                  >
                    נהל טורניר חי
                  </Button>
                )}
                {/* Edit and Delete icons */}
                {tournament.status === 3 ? (
                  <IconButton size="small" sx={{ color: '#222' }} onClick={e => { e.stopPropagation(); router.push(`/tournaments/${tournament.id}/live`); }}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                ) : (
                  <>
                    {onEdit && (
                      <IconButton size="small" sx={{ color: '#222' }} onClick={e => { e.stopPropagation(); onEdit(tournament); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    {onDelete && (
                      <IconButton size="small" sx={{ color: '#222' }} onClick={e => { e.stopPropagation(); onDelete(tournament); }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </>
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                מספר קבוצות: {tournament.settings?.numberOfTeams ?? '-'} | שחקנים בקבוצה: {tournament.settings?.playersPerTeam ?? '-'}
              </Typography>
              
              {/* Groups and Teams */}
              {tournament.groups && players && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    בתים וקבוצות:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {Object.entries(tournament.groups).map(([groupId, group]: [string, any]) => (
                      <Box key={groupId} sx={{ 
                        border: '1px solid #e5e7eb', 
                        borderRadius: 2, 
                        p: 2, 
                        backgroundColor: '#f9fafb' 
                      }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#374151' }}>
                          בית {groupId}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {group.teams?.map((teamKey: string) => {
                            const team = tournament.teams?.[teamKey];
                            if (!team) return null;
                            
                            return (
                              <Box key={teamKey} sx={{ 
                                background: 'white', 
                                border: '1px solid #d1d5db', 
                                borderRadius: 1, 
                                p: 1.5,
                                minWidth: 120
                              }}>
                                                               <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                 <Typography variant="body2" fontWeight={700} sx={{ color: '#374151' }}>
                                   {getTeamCaptainName(team, players)}
                                 </Typography>
                                 <Typography variant="caption" sx={{ color: '#6b7280', lineHeight: 1.2 }}>
                                   {team.players?.slice(1).map((playerId: string) => {
                                     const player = players?.find(p => p.id === playerId);
                                     return player?.name || playerId;
                                   }).join(', ')}
                                 </Typography>
                               </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
