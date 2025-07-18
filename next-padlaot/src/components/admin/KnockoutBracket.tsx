import React, { useState, useRef } from 'react';
import { Box, Typography, Button, Card, CardContent, IconButton } from '@mui/material';
import { Tournament, KnockoutMatch, TournamentMiniGame } from '@/types/tournament';
import { convertFirestoreToKnockoutBracket } from '@/lib/firebase/utils';

interface KnockoutBracketProps {
  tournament: Tournament;
  miniGames: TournamentMiniGame[];
  players: any[];
  onCreateMiniGame: (matchId: string, teamA: string, teamB: string) => void;
  onUpdateMatch: (matchId: string, winner: string) => void;
}

export default function KnockoutBracket({
  tournament,
  miniGames,
  players,
  onCreateMiniGame,
  onUpdateMatch
}: KnockoutBracketProps) {
  const [dragOverMatch, setDragOverMatch] = useState<string | null>(null);
  const dragTeam = useRef<{ teamKey: string; fromMatch: string } | null>(null);

  if (!tournament.knockoutBracket) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          שלב הנוקאאוט טרם נוצר
        </Typography>
      </Box>
    );
  }

  // Convert Firestore format to KnockoutBracket format if needed
  const bracket = tournament.knockoutBracket.rounds && Array.isArray(tournament.knockoutBracket.rounds) 
    ? tournament.knockoutBracket 
    : convertFirestoreToKnockoutBracket(tournament.knockoutBracket);

  const getTeamName = (teamKey: string | null | undefined) => {
    if (!teamKey) return 'טרם נקבע';
    const team = tournament.teams[teamKey];
    if (!team) return teamKey;
    const captain = players.find((p: any) => p.id === team.captain);
    const teamName = captain?.name || teamKey;
    return teamName;
  };

  const getMatchStatus = (match: KnockoutMatch) => {
    const miniGame = miniGames.find((g: any) => g.knockoutMatchId === match.id);
    if (!miniGame) return 'pending';
    return miniGame.status;
  };

  const handleTeamDragStart = (teamKey: string, fromMatch: string) => {
    dragTeam.current = { teamKey, fromMatch };
  };

  const handleTeamDragOver = (e: React.DragEvent, matchId: string) => {
    e.preventDefault();
    setDragOverMatch(matchId);
  };

  const handleTeamDrop = (matchId: string) => {
    if (dragTeam.current && dragTeam.current.fromMatch !== matchId) {
      // Swap teams between matches
      // This would require updating the bracket structure
      console.log('Swapping teams:', dragTeam.current.teamKey, 'to match:', matchId);
    }
    dragTeam.current = null;
    setDragOverMatch(null);
  };

  const handleTeamDragEnd = () => {
    dragTeam.current = null;
    setDragOverMatch(null);
  };

  const renderMatch = (match: KnockoutMatch, roundIndex: number, matchIndex: number) => {
    const status = getMatchStatus(match);
    const miniGame = miniGames.find((g: any) => g.knockoutMatchId === match.id);
    
    return (
      <Card
        key={match.id}
        draggable
        onDragStart={() => handleTeamDragStart(match.teamA || '', match.id)}
        onDragOver={(e) => handleTeamDragOver(e, match.id)}
        onDrop={() => handleTeamDrop(match.id)}
        onDragEnd={handleTeamDragEnd}
        sx={{
          p: 1.5,
          minWidth: 220,
          border: dragOverMatch === match.id ? '2px solid #1976d2' : '1px solid #ddd',
          borderRadius: 1.5,
          bgcolor: status === 'live' ? '#fff3e0' : 'background.paper',
          cursor: 'grab',
          boxShadow: status === 'live' ? 3 : 1,
          '&:hover': {
            boxShadow: 2
          }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {/* Team A */}
          <Box sx={{ 
            p: 1, 
            bgcolor: match.winner === match.teamA ? '#e8f5e8' : 'transparent',
            borderRadius: 0.5,
            border: match.teamA ? '1px solid #ddd' : '1px dashed #ccc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="body2" fontWeight={match.winner === match.teamA ? 700 : 400}>
              {getTeamName(match.teamA)}
            </Typography>
            {miniGame && (
              <Typography variant="body2" fontWeight={700} color="primary">
                {miniGame.scoreA}
              </Typography>
            )}
          </Box>
          
          {/* Team B */}
          <Box sx={{ 
            p: 1, 
            bgcolor: match.winner === match.teamB ? '#e8f5e8' : 'transparent',
            borderRadius: 0.5,
            border: match.teamB ? '1px solid #ddd' : '1px dashed #ccc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="body2" fontWeight={match.winner === match.teamB ? 700 : 400}>
              {getTeamName(match.teamB)}
            </Typography>
            {miniGame && (
              <Typography variant="body2" fontWeight={700} color="primary">
                {miniGame.scoreB}
              </Typography>
            )}
          </Box>
          
          {/* Match Status */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {status === 'pending' && 'ממתין'}
              {status === 'live' && 'חי'}
              {status === 'complete' && 'הושלם'}
            </Typography>
            
            {status === 'pending' && match.teamA && match.teamB && (
              <Button
                size="small"
                variant="contained"
                onClick={() => onCreateMiniGame(match.id, match.teamA!, match.teamB!)}
              >
                צור משחק
              </Button>
            )}
          </Box>
        </Box>
      </Card>
    );
  };

  const renderRound = (round: KnockoutMatch[], roundIndex: number) => {
    const roundNames = ['חצי גמר', 'גמר', 'מקום שלישי'];
    const roundName = roundNames[roundIndex] || `סיבוב ${roundIndex + 1}`;
    
    return (
      <Box key={roundIndex} sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        minWidth: 280,
        position: 'relative'
      }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>
          {roundName}
        </Typography>
        
        {/* Add connecting lines between rounds */}
        {roundIndex > 0 && (
          <Box sx={{
            position: 'absolute',
            left: -20,
            top: '50%',
            width: 20,
            height: 2,
            bgcolor: 'grey.300',
            transform: 'translateY(-50%)'
          }} />
        )}
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {round.map((match, matchIndex) => renderMatch(match, roundIndex, matchIndex))}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, textAlign: 'center', fontWeight: 700 }}>
        שלב הנוקאאוט
      </Typography>
      
      <Box sx={{ 
        display: 'flex', 
        gap: 6, 
        justifyContent: 'center', 
        alignItems: 'flex-start',
        overflowX: 'auto',
        py: 2
      }}>
        {bracket.rounds.map((round, roundIndex) => 
          renderRound(round, roundIndex)
        )}
      </Box>
    </Box>
  );
} 