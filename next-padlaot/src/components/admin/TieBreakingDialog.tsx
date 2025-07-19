'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Tournament, TournamentTeam } from '@/types/tournament';
import { usePlayerStatsCache } from '@/hooks/usePlayerStatsCache';

interface TieBreakingDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (tieBreaks: TieBreak[]) => void;
  tournament: Tournament;
  ties: { groupId: string; tiedTeams: string[]; position: number }[];
}

interface TieBreak {
  groupId: string;
  position: number;
  teamOrder: string[];
}

export default function TieBreakingDialog({
  open,
  onClose,
  onConfirm,
  tournament,
  ties
}: TieBreakingDialogProps) {
  const [tieBreaks, setTieBreaks] = useState<TieBreak[]>([]);
  const { players } = usePlayerStatsCache();

  // Initialize tie breaks when dialog opens
  useEffect(() => {
    if (open && ties.length > 0) {
      const initialTieBreaks = ties.map(tie => ({
        groupId: tie.groupId,
        position: tie.position,
        teamOrder: [...tie.tiedTeams] // Start with original order
      }));
      setTieBreaks(initialTieBreaks);
    }
  }, [open, ties]);

  const handleTeamOrderChange = (tieIndex: number, newOrder: string[]) => {
    const updatedTieBreaks = [...tieBreaks];
    updatedTieBreaks[tieIndex] = {
      ...updatedTieBreaks[tieIndex],
      teamOrder: newOrder
    };
    setTieBreaks(updatedTieBreaks);
  };

  const getTeamName = (teamKey: string) => {
    const team = tournament.teams[teamKey];
    if (team && team.players.length > 0) {
      // Get the captain's name (first player)
      const captainId = team.players[0];
      // Find the player object to get the name
      const captain = players.find(p => p.id === captainId);
      return captain?.name || captainId;
    }
    return teamKey;
  };

  const getTeamStats = (teamKey: string, groupId: string) => {
    const group = tournament.groups[groupId];
    const groupGames = tournament.miniGames.filter(game => 
      game.group === groupId && game.status === 'complete'
    );
    
    let played = 0, won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0, points = 0;
    
    groupGames.forEach(game => {
      if (game.teamA === teamKey || game.teamB === teamKey) {
        played++;
        if (game.teamA === teamKey) {
          goalsFor += game.scoreA;
          goalsAgainst += game.scoreB;
          if (game.scoreA > game.scoreB) {
            won++;
            points += 3;
          } else if (game.scoreA < game.scoreB) {
            lost++;
          } else {
            drawn++;
            points += 1;
          }
        } else {
          goalsFor += game.scoreB;
          goalsAgainst += game.scoreA;
          if (game.scoreB > game.scoreA) {
            won++;
            points += 3;
          } else if (game.scoreB < game.scoreA) {
            lost++;
          } else {
            drawn++;
            points += 1;
          }
        }
      }
    });
    
    const goalDifference = goalsFor - goalsAgainst;
    
    return {
      played,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      goalDifference,
      points
    };
  };

  const handleConfirm = () => {
    onConfirm(tieBreaks);
    onClose();
  };

  if (ties.length === 0) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div">
          יש צורך לפתור תיקו בבתים
        </Typography>
        <Typography variant="body2" color="text.secondary">
          יש קבוצות עם סטטיסטיקות זהות. אנא בחר את סדר הקבוצות לכל תיקו:
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {tieBreaks.map((tieBreak, tieIndex) => {
            const tie = ties[tieIndex];
            const stats = tie.tiedTeams.map(teamKey => ({
              teamKey,
              teamName: getTeamName(teamKey),
              stats: getTeamStats(teamKey, tie.groupId)
            }));
            
            return (
              <Box key={`${tie.groupId}-${tie.position}`} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  בית {tie.groupId} - מקום {tie.position}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  הקבוצות הבאות יש להן סטטיסטיקות זהות:
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  {stats.map((team) => (
                    <Box key={team.teamKey} sx={{ p: 1, backgroundColor: '#f5f5f5', borderRadius: 1, mb: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {team.teamName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        נקודות: {team.stats.points} | הפרש שערים: {team.stats.goalDifference} | 
                        שערים: {team.stats.goalsFor} | ניצחונות: {team.stats.won}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel sx={{ mt: 1 }}>סדר הקבוצות (ראשון = גבוה יותר)</InputLabel>
                  <Select
                    multiple
                    value={tieBreak.teamOrder}
                    onChange={(e) => handleTeamOrderChange(tieIndex, e.target.value as string[])}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                        {(selected as string[]).map((teamKey, index) => (
                          <Box key={teamKey} sx={{ backgroundColor: '#e3f2fd', px: 1, py: 0.5, borderRadius: 1 }}>
                            {index + 1}. {getTeamName(teamKey)}
                          </Box>
                        ))}
                      </Box>
                    )}
                  >
                    {tie.tiedTeams.map((teamKey) => (
                      <MenuItem key={teamKey} value={teamKey}>
                        {getTeamName(teamKey)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          ביטול
        </Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          אישור
        </Button>
      </DialogActions>
    </Dialog>
  );
} 