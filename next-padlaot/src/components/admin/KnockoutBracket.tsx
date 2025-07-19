import React, { useState, useMemo } from 'react';
import { Box, Typography, Card, Button, Tooltip, Chip, IconButton, useTheme, useMediaQuery } from '@mui/material';
import { Tournament, TournamentMiniGame, KnockoutMatch } from '@/types/tournament';
import TournamentGameTimer from '@/components/dashboard/TournamentGameTimer';
import { useAuth } from '@/contexts/AuthContext';

interface KnockoutBracketProps {
  tournament: Tournament;
  miniGames: TournamentMiniGame[];
  players: any[];
  onCreateMiniGame: (matchId: string, teamA: string, teamB: string) => void;
  onUpdateMatch: (matchId: string, winner: string) => void;

  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  onStartMiniGame?: (miniId: string) => void;
  onEndMiniGame?: (miniId: string) => void;
  onAddGoal?: (miniId: string) => void;
  onEditMiniGame?: (mini: any) => void;
  onDrawResolution?: (miniGame: any, selectedWinner: string) => void;
}

export default function KnockoutBracket({
  tournament,
  miniGames,
  players,
  onCreateMiniGame,
  onUpdateMatch,
  isAdmin = false,
  isSuperAdmin = false,
  onStartMiniGame,
  onEndMiniGame,
  onAddGoal,
  onEditMiniGame,
  onDrawResolution
}: KnockoutBracketProps) {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  




  // Find the user's own knockout mini game that is pending or live (user-specific sticky bar)
  const liveKnockoutMini = Array.isArray(miniGames) && user?.uid
    ? [...miniGames].reverse().find((g: any) => 
        (g.status === 'pending' || g.status === 'live') && 
        g.createdBy === user.uid && 
        g.knockoutMatchId
      )
    : null;

  // Check if user can manage a mini-game (only the creator can manage)
  const canManageMiniGame = (miniGame: any) => {
    return miniGame.createdBy === user?.uid;
  };

  if (!tournament.knockoutBracket) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          שלב הנוקאאוט טרם נוצר
        </Typography>
      </Box>
    );
  }

  // Use the bracket directly and ensure it's in the correct format
  let bracket = tournament.knockoutBracket;
  
  // Convert Firestore format to array format if needed
  if (bracket && !Array.isArray(bracket.rounds) && typeof bracket.rounds === 'object') {
    // Manual conversion from Firestore format to array format
    const rounds: KnockoutMatch[][] = [];
    for (let i = 1; i <= bracket.totalRounds; i++) {
      const roundKey = `round${i}`;
      if (bracket.rounds[roundKey]) {
        rounds.push(bracket.rounds[roundKey]);
      }
    }
    bracket = {
      rounds,
      totalRounds: bracket.totalRounds
    };
  }
  
  // Ensure bracket has the expected structure
  if (!bracket || !Array.isArray(bracket.rounds)) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          מבנה שלב הנוקאאוט אינו תקין
        </Typography>
      </Box>
    );
  }



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

  // Check if any knockout games have started
  const hasKnockoutGamesStarted = miniGames.some((g: any) => g.knockoutMatchId && g.status === 'live');

  // Get all qualified teams for the knockout stage
  const getQualifiedTeams = () => {
    const qualifiedTeams: string[] = [];
    
    // Use the same logic as getQualifiersFromGroups
    if (tournament.groups && tournament.settings?.qualifierDistribution) {
      const groupIds = Object.keys(tournament.groups);
      
      // Get qualifiers from each group based on distribution
      groupIds.forEach((groupId, index) => {
        const group = tournament.groups[groupId];
        const qualifiersFromGroup = tournament.settings.qualifierDistribution[index] || 0;
        
        // Calculate standings for this group
        const groupStandings = calculateGroupStandings(group, miniGames);
        
        // Get top N teams from group standings
        const topTeams = groupStandings
          .slice(0, qualifiersFromGroup)
          .map((standing: any) => standing.teamKey);
        
        qualifiedTeams.push(...topTeams);
      });
      
      // Handle "best remaining" qualifiers (last element in distribution)
      const bestRemainingCount = tournament.settings.qualifierDistribution[tournament.settings.qualifierDistribution.length - 1] || 0;
      if (bestRemainingCount > 0) {
        // Get all teams that didn't qualify directly
        const qualifiedTeamsSet = new Set(qualifiedTeams);
        const allTeams = Object.keys(tournament.teams);
        const remainingTeams = allTeams.filter(team => !qualifiedTeamsSet.has(team));
        
        // Calculate standings for remaining teams across all groups
        const remainingStandings = calculateCrossGroupStandings(tournament, remainingTeams);
        
        // Get best N remaining teams
        const bestRemaining = remainingStandings
          .slice(0, bestRemainingCount)
          .map((standing: any) => standing.teamKey);
        
        qualifiedTeams.push(...bestRemaining);
      }
    }
    
    // Only include teams that are actually qualified, not from the bracket
    return qualifiedTeams;
  };

  // Helper function to calculate group standings
  const calculateGroupStandings = (group: any, games: any[]) => {
    const standings: Record<string, any> = {};
    
    // Initialize standings for all teams in group
    group.teams.forEach((teamKey: string) => {
      standings[teamKey] = {
        teamKey,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        position: 0
      };
    });
    
    // Calculate standings from completed games in this group
    const groupGames = games.filter((game: any) => 
      game.group === group.id && game.status === 'complete'
    );
    
    groupGames.forEach((game: any) => {
      const teamA = standings[game.teamA];
      const teamB = standings[game.teamB];
      
      if (teamA && teamB) {
        teamA.played++;
        teamB.played++;
        
        teamA.goalsFor += game.scoreA;
        teamA.goalsAgainst += game.scoreB;
        teamB.goalsFor += game.scoreB;
        teamB.goalsAgainst += game.scoreA;
        
        if (game.scoreA > game.scoreB) {
          teamA.won++;
          teamB.lost++;
          teamA.points += 3;
        } else if (game.scoreA < game.scoreB) {
          teamB.won++;
          teamA.lost++;
          teamB.points += 3;
        } else {
          teamA.drawn++;
          teamB.drawn++;
          teamA.points += 1;
          teamB.points += 1;
        }
      }
    });
    
    // Calculate goal differences and sort
    Object.values(standings).forEach((standing: any) => {
      standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
    });
    
    return Object.values(standings).sort((a: any, b: any) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
      if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
      return b.won - a.won;
    });
  };

  // Helper function to calculate cross-group standings
  const calculateCrossGroupStandings = (tournament: any, teamKeys: string[]) => {
    const standings: Record<string, any> = {};
    
    // Initialize standings
    teamKeys.forEach(teamKey => {
      standings[teamKey] = {
        teamKey,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        position: 0
      };
    });
    
    // Calculate from all group games
    const groupGames = miniGames.filter((game: any) => 
      game.group && game.status === 'complete'
    );
    
    groupGames.forEach((game: any) => {
      const teamA = standings[game.teamA];
      const teamB = standings[game.teamB];
      
      if (teamA && teamB) {
        teamA.played++;
        teamB.played++;
        
        teamA.goalsFor += game.scoreA;
        teamA.goalsAgainst += game.scoreB;
        teamB.goalsFor += game.scoreB;
        teamB.goalsAgainst += game.scoreA;
        
        if (game.scoreA > game.scoreB) {
          teamA.won++;
          teamB.lost++;
          teamA.points += 3;
        } else if (game.scoreA < game.scoreB) {
          teamB.won++;
          teamA.lost++;
          teamB.points += 3;
        } else {
          teamA.drawn++;
          teamB.drawn++;
          teamA.points += 1;
          teamB.points += 1;
        }
      }
    });
    
    // Calculate goal differences and sort
    Object.values(standings).forEach((standing: any) => {
      standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
    });
    
    return Object.values(standings).sort((a: any, b: any) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
      if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
      return b.won - a.won;
    });
  };





  const renderMatch = (match: KnockoutMatch, roundIndex: number, matchIndex: number) => {
    const status = getMatchStatus(match);
    const miniGame = miniGames.find((g: any) => g.knockoutMatchId === match.id);
    
    return (
      <Card
        key={match.id}
        sx={{
          p: 1.5,
          minWidth: isMobile ? 180 : 220,
          maxWidth: isMobile ? 200 : 280,
          border: '1px solid #ddd',
          borderRadius: 1.5,
          bgcolor: status === 'live' ? '#fff3e0' : 'background.paper',
          boxShadow: status === 'live' ? 3 : 1,
          '&:hover': {
            boxShadow: 2
          }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, position: 'relative' }}>
          {/* Creator Badge - styled like group stage */}
          {miniGame && miniGame.createdBy && (
            <Box sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: miniGame.createdBy === user?.uid ? '#4caf50' : '#ff9800',
              color: 'white',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.75rem',
              fontWeight: 600,
              zIndex: 10,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              {miniGame.createdBy === user?.uid ? 'שלך' : 'נוצר על ידי אחר'}
            </Box>
          )}
          
          {/* Pitch Number */}
          {miniGame && miniGame.pitchNumber && (
            <Box sx={{
              position: 'absolute',
              top: 8,
              right: miniGame.createdBy ? 120 : 8, // Move right if creator badge is present
              bgcolor: '#1976d2',
              color: 'white',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.75rem',
              fontWeight: 600,
              zIndex: 1
            }}>
              מגרש {miniGame.pitchNumber}
            </Box>
          )}
          
          {/* Add top padding when badges are present */}
          <Box sx={{ 
            pt: miniGame && (miniGame.createdBy || miniGame.pitchNumber) ? 4 : 0 
          }}>
          
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
            <Typography variant="body2" fontWeight={match.winner === match.teamA ? 700 : 400} sx={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
              {getTeamName(match.teamA)}
            </Typography>
            {miniGame && (
              <Typography variant="body2" fontWeight={700} color="primary" sx={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
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
            <Typography variant="body2" fontWeight={match.winner === match.teamB ? 700 : 400} sx={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
              {getTeamName(match.teamB)}
            </Typography>
            {miniGame && (
              <Typography variant="body2" fontWeight={700} color="primary" sx={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                {miniGame.scoreB}
              </Typography>
            )}
          </Box>
          
          {/* Match Status and Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
              {status === 'pending' && 'ממתין'}
              {status === 'live' && 'חי'}
              {status === 'complete' && 'הושלם'}
            </Typography>
            
            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {status === 'pending' && match.teamA && match.teamB && !miniGame && !isTournamentCompleted && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => onCreateMiniGame(match.id, match.teamA!, match.teamB!)}
                  sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem', px: isMobile ? 1 : 1.5 }}
                >
                  צור משחק
                </Button>
              )}
              
              {/* Edit button for mini-game creator */}
              {miniGame && !hasKnockoutGamesStarted && canManageMiniGame(miniGame) && (
                <IconButton
                  color="primary"
                  size="small"
                  onClick={() => onEditMiniGame?.(miniGame)}
                  disabled={miniGame.status === 'live'}
                  sx={{ width: isMobile ? 24 : 32, height: isMobile ? 24 : 32 }}
                >
  
                </IconButton>
              )}
            </Box>
          </Box>
          
          {/* Timer and Game Controls */}
          {miniGame && (
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}>
              {/* Timer and Game Controls */}
              {(miniGame.status === 'live' || miniGame.status === 'pending') && canManageMiniGame(miniGame) && (
                <TournamentGameTimer
                  miniGame={miniGame}
                  tournamentId={tournament.id}
                  onAddGoal={miniGame.status === 'live' ? () => onAddGoal?.(miniGame.id) : undefined}
                  onEndGame={() => handleEndMiniGame(miniGame.id)}
                />
              )}
            </Box>
          )}
          </Box> {/* Close the padding Box */}
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
        minWidth: isMobile ? 200 : 280,
        maxWidth: isMobile ? 220 : 320,
        position: 'relative'
      }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: 'primary.main', fontSize: isMobile ? '1rem' : '1.25rem' }}>
          {roundName}
        </Typography>
        
        {/* Add connecting lines between rounds */}
        {roundIndex > 0 && (
          <Box sx={{
            position: 'absolute',
            left: isMobile ? -15 : -20,
            top: '50%',
            width: isMobile ? 15 : 20,
            height: 2,
            bgcolor: 'grey.300',
            transform: 'translateY(-50%)'
          }} />
        )}
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 1 : 2 }}>
          {round.map((match, matchIndex) => renderMatch(match, roundIndex, matchIndex))}
        </Box>
      </Box>
    );
  };

  const formatDuration = (startTime: any, endTime: any) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffInSeconds = (end.getTime() - start.getTime()) / 1000;
    const hours = Math.floor(diffInSeconds / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);
    return `${hours} שעות ${minutes} דקות`;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'ממתין';
      case 'live':
        return 'חי';
      case 'complete':
        return 'הושלם';
      default:
        return status;
    }
  };

  const isTournamentCompleted = tournament.status === 3; // 3 = completed

  // Mobile-friendly game list view
  const renderMobileGameList = () => {
    // Ensure bracket.rounds is an array before calling flat()
    const allMatches = Array.isArray(bracket.rounds) ? bracket.rounds.flat() : [];
    const roundNames = ['חצי גמר', 'גמר', 'מקום שלישי'];
    
    // Early return if no rounds data
    if (!Array.isArray(bracket.rounds) || bracket.rounds.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            אין משחקים בשלב הנוקאאוט
          </Typography>
        </Box>
      );
    }
    
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {bracket.rounds.map((round, roundIndex) => {
          const roundName = roundNames[roundIndex] || `סיבוב ${roundIndex + 1}`;
          
          // Ensure round is an array before mapping
          if (!Array.isArray(round)) {
            return null;
          }
          
          return (
            <Box key={roundIndex}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: 'primary.main', textAlign: 'center' }}>
                {roundName}
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {round.map((match, matchIndex) => {
                  const status = getMatchStatus(match);
                  const miniGame = miniGames.find((g: any) => g.knockoutMatchId === match.id);
                  
                  return (
                    <Card
                      key={match.id}
                      sx={{
                        p: 2,
                        border: '1px solid #ddd',
                        borderRadius: 2,
                        bgcolor: status === 'live' ? '#fff3e0' : 'background.paper',
                        boxShadow: status === 'live' ? 3 : 1,
                        '&:hover': {
                          boxShadow: 2
                        },
                        position: 'relative'
                      }}
                    >
                      {/* Creator Badge - styled like group stage */}
                      {miniGame && miniGame.createdBy && (
                        <Box sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: miniGame.createdBy === user?.uid ? '#4caf50' : '#ff9800',
                          color: 'white',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          zIndex: 10,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}>
                          {miniGame.createdBy === user?.uid ? 'שלך' : 'נוצר על ידי אחר'}
                        </Box>
                      )}
                      
                      {/* Pitch Number */}
                      {miniGame && miniGame.pitchNumber && (
                        <Box sx={{
                          position: 'absolute',
                          top: 8,
                          right: miniGame.createdBy ? 120 : 8, // Move right if creator badge is present
                          bgcolor: '#1976d2',
                          color: 'white',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          zIndex: 1
                        }}>
                          מגרש {miniGame.pitchNumber}
                        </Box>
                      )}
                      
                      {/* Game Header */}
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        mb: 1.5,
                        pt: miniGame && (miniGame.createdBy || miniGame.pitchNumber) ? 4 : 0 // Add top padding when badges are present
                      }}>
                        <Typography variant="subtitle1" fontWeight={600} color="primary">
                          משחק {matchIndex + 1}
                        </Typography>
                        <Chip 
                          label={status === 'pending' ? 'ממתין' : status === 'live' ? 'חי' : 'הושלם'} 
                          size="small" 
                          color={status === 'live' ? 'warning' : status === 'complete' ? 'success' : 'default'}
                        />
                      </Box>
                      
                      {/* Teams and Scores */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                        {/* Team A */}
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          p: 1.5,
                          bgcolor: match.winner === match.teamA ? '#e8f5e8' : '#f5f5f5',
                          borderRadius: 1,
                          border: match.teamA ? '1px solid #ddd' : '1px dashed #ccc'
                        }}>
                          <Typography variant="body1" fontWeight={match.winner === match.teamA ? 700 : 500}>
                            {getTeamName(match.teamA)}
                          </Typography>
                          <Typography variant="h6" fontWeight={700} color="primary">
                            {miniGame ? miniGame.scoreA : 0}
                          </Typography>
                        </Box>
                        
                        {/* Team B */}
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          p: 1.5,
                          bgcolor: match.winner === match.teamB ? '#e8f5e8' : '#f5f5f5',
                          borderRadius: 1,
                          border: match.teamB ? '1px solid #ddd' : '1px dashed #ccc'
                        }}>
                          <Typography variant="body1" fontWeight={match.winner === match.teamB ? 700 : 500}>
                            {getTeamName(match.teamB)}
                          </Typography>
                          <Typography variant="h6" fontWeight={700} color="primary">
                            {miniGame ? miniGame.scoreB : 0}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* Goals List */}
                      {miniGame && miniGame.goals && miniGame.goals.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
                            שערים:
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {miniGame.goals.map((goal: any, i: number) => {
                              const scorer = players.find((p: any) => p.id === goal.scorerId)?.name || goal.scorerId;
                              const assist = goal.assistId ? (players.find((p: any) => p.id === goal.assistId)?.name || goal.assistId) : null;
                              return (
                                <Typography key={i} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
                                  {goal.team === miniGame.teamA ? getTeamName(miniGame.teamA) : getTeamName(miniGame.teamB)} - {assist ? `${scorer} (${assist})` : scorer}
                                </Typography>
                              );
                            })}
                          </Box>
                        </Box>
                      )}
                      
                      {/* Action Buttons */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {/* Create Game Button */}
                        {status === 'pending' && match.teamA && match.teamB && !miniGame && !isTournamentCompleted && (
                          <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            onClick={() => onCreateMiniGame(match.id, match.teamA!, match.teamB!)}

                          >
                            צור משחק
                          </Button>
                        )}
                        
                        {/* Game Controls */}
                        {miniGame && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {/* Timer and Game Controls - only show if not in sticky bar */}
                            {(miniGame.status === 'live' || miniGame.status === 'pending') && 
                             canManageMiniGame(miniGame) && 
                             !isTournamentCompleted &&
                             !(isMobile && liveKnockoutMini && liveKnockoutMini.id === miniGame.id) && (
                              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                                <TournamentGameTimer
                                  miniGame={miniGame}
                                  tournamentId={tournament.id}
                                  onAddGoal={miniGame.status === 'live' ? () => onAddGoal?.(miniGame.id) : undefined}
                                  onEndGame={() => handleEndMiniGame(miniGame.id)}
                                />
                              </Box>
                            )}
                            
                            
                          </Box>
                        )}
                      </Box>
                    </Card>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  const handleEndMiniGame = (miniId: string) => {
    // Simply call the parent's end game function - let the parent handle draw resolution
    onEndMiniGame?.(miniId);
  };



  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, fontSize: isMobile ? '1.5rem' : '2.125rem' }}>
          שלב הנוקאאוט
        </Typography>
      </Box>
      
      {/* Completed Tournament Message */}
      {isTournamentCompleted && (
        <Box sx={{ 
          mb: 3, 
          p: 2, 
          bgcolor: '#e8f5e8', 
          border: '2px solid #4caf50', 
          borderRadius: 2, 
          textAlign: 'center' 
        }}>
          <Typography variant="h6" color="#2e7d32" fontWeight={700}>
            הטורניר הושלם - מצב קריאה בלבד
          </Typography>
          <Typography variant="body2" color="#2e7d32">
            לא ניתן ליצור משחקים חדשים או לערוך משחקים קיימים
          </Typography>
        </Box>
      )}
      
      {/* Mobile: Sticky bar for live knockout mini-game */}
      {isMobile && liveKnockoutMini && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100vw',
            bgcolor: '#fffbe6',
            boxShadow: 12,
            zIndex: 1200,
            p: 1,
            borderTop: '4px solid #ff9800',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            height: '48vh',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <Box key={liveKnockoutMini.id} sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            p: 1,
            border: '2px solid #1976d2',
            borderRadius: 2,
            boxShadow: 3,
            bgcolor: 'background.paper',
            minHeight: 220,
            height: '100%',
            overflow: 'hidden',
          }}>
            {/* Scrollable content area */}
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {/* Team A: captain + score, goals */}
              <Box sx={{ textAlign: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {`קבוצת ${getTeamName(liveKnockoutMini.teamA)} ${liveKnockoutMini.scoreA}`}
                </Typography>
                {(liveKnockoutMini.goals || []).filter((g: any) => g.team === liveKnockoutMini.teamA).map((g: any, i: number) => {
                  const scorer = players.find((p: any) => p.id === g.scorerId)?.name || g.scorerId;
                  const assist = g.assistId ? (players.find((p: any) => p.id === g.assistId)?.name || g.assistId) : null;
                  return (
                    <Typography key={i} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.92rem', textAlign: 'center', mt: 0.2 }}>
                      {assist ? `${scorer} (${assist})` : scorer}
                    </Typography>
                  );
                })}
              </Box>
              <Box sx={{ height: 12 }} />
              {/* Team B: captain + score, goals */}
              <Box sx={{ textAlign: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {`קבוצת ${getTeamName(liveKnockoutMini.teamB)} ${liveKnockoutMini.scoreB}`}
                </Typography>
                {(liveKnockoutMini.goals || []).filter((g: any) => g.team === liveKnockoutMini.teamB).map((g: any, i: number) => {
                  const scorer = players.find((p: any) => p.id === g.scorerId)?.name || g.scorerId;
                  const assist = g.assistId ? (players.find((p: any) => p.id === g.assistId)?.name || g.assistId) : null;
                  return (
                    <Typography key={i} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.92rem', textAlign: 'center', mt: 0.2 }}>
                      {assist ? `${scorer} (${assist})` : scorer}
                    </Typography>
                  );
                })}
              </Box>
              {/* Duration, status, edit/delete in a row */}
              <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                <Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '1rem' }}>
                  {liveKnockoutMini.status === 'complete' && liveKnockoutMini.startTime && liveKnockoutMini.endTime ? `משך: ${formatDuration(liveKnockoutMini.startTime, liveKnockoutMini.endTime)}` : ''}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  סטטוס: {getStatusLabel(liveKnockoutMini.status)}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>

                </Box>
              </Box>
              {/* Timer */}
              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                {(liveKnockoutMini.status === 'live' || liveKnockoutMini.status === 'pending') && canManageMiniGame(liveKnockoutMini) && !isTournamentCompleted && (
                  <TournamentGameTimer
                    miniGame={liveKnockoutMini}
                    tournamentId={tournament.id}
                    onAddGoal={liveKnockoutMini.status === 'live' ? () => onAddGoal?.(liveKnockoutMini.id) : undefined}
                    onEndGame={() => handleEndMiniGame(liveKnockoutMini.id)}
                  />
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
      
      {/* Desktop: Traditional Bracket Layout */}
      {!isMobile && (
        <Box sx={{ 
          display: 'flex', 
          gap: 6, 
          justifyContent: 'center', 
          alignItems: 'flex-start',
          overflowX: 'auto',
          py: 2
        }}>
          {Array.isArray(bracket.rounds) && bracket.rounds.map((round, roundIndex) => 
            Array.isArray(round) ? renderRound(round, roundIndex) : null
          )}
        </Box>
      )}
      
      {/* Mobile: Game List Layout */}
      {isMobile && (
        <Box sx={{ 
          pb: liveKnockoutMini ? 28 : 2, // Add extra bottom padding on mobile for sticky bar
        }}>
          {renderMobileGameList()}
        </Box>
      )}
      
      {/* Edit Dialog */}


      {/* Draw Resolution Dialog */}

    </Box>
  );
} 