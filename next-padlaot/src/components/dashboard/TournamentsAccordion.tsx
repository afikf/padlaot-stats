import React, { useState } from 'react';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails, Chip, Tabs, Tab, Stack, Divider, Card, CardContent
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useRouter } from 'next/navigation';
import { usePlayersCache } from '@/hooks/usePlayersCache';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getStatusLabel(status: number) {
  switch (status) {
    case 0: return { label: 'טיוטה', color: 'default' as const };
    case 1: return { label: 'קרוב', color: 'primary' as const };
    case 2: return { label: 'חי', color: 'success' as const };
    case 3: return { label: 'הושלם', color: 'secondary' as const };
    default: return { label: 'לא ידוע', color: 'default' as const };
  }
}

function getPlayerName(players: any[], id: string) {
  const player = players.find((p) => p.id === id);
  return player ? player.name : id;
}

function calculateGroupStandings(group: any, tournament: any, players: any[]) {
  if (!group || !group.teams || !tournament.miniGames) return [];
  
  const teamStats: { [key: string]: any } = {};
  
  // Initialize team stats
  group.teams.forEach((teamKey: string) => {
    teamStats[teamKey] = {
      teamKey,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    };
  });
  
  // Calculate stats from mini-games
  tournament.miniGames.forEach((game: any) => {
    if (game.group === group.id && game.status === 'complete') {
      const teamA = game.teamA;
      const teamB = game.teamB;
      const scoreA = game.scoreA || 0;
      const scoreB = game.scoreB || 0;
      
      if (teamStats[teamA] && teamStats[teamB]) {
        // Update games played
        teamStats[teamA].played++;
        teamStats[teamB].played++;
        
        // Update goals
        teamStats[teamA].goalsFor += scoreA;
        teamStats[teamA].goalsAgainst += scoreB;
        teamStats[teamB].goalsFor += scoreB;
        teamStats[teamB].goalsAgainst += scoreA;
        
        // Update results
        if (scoreA > scoreB) {
          teamStats[teamA].won++;
          teamStats[teamB].lost++;
          teamStats[teamA].points += 3;
        } else if (scoreA < scoreB) {
          teamStats[teamB].won++;
          teamStats[teamA].lost++;
          teamStats[teamB].points += 3;
        } else {
          teamStats[teamA].drawn++;
          teamStats[teamB].drawn++;
          teamStats[teamA].points += 1;
          teamStats[teamB].points += 1;
        }
      }
    }
  });
  
  // Convert to array and sort
  const standings = Object.values(teamStats).map((team: any) => ({
    ...team,
    goalDifference: team.goalsFor - team.goalsAgainst
  }));
  
  // Sort by points, then goal difference, then goals scored
  standings.sort((a: any, b: any) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
  
  // Add position
  standings.forEach((standing: any, index: number) => {
    standing.position = index + 1;
  });
  
  return standings;
}

function formatDuration(start: number | string, end: number | string) {
  const startTime = typeof start === 'string' ? new Date(start).getTime() : start;
  const endTime = typeof end === 'string' ? new Date(end).getTime() : end;
  const duration = endTime - startTime;
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function renderGroupTables(tournament: any, players: any[]) {
  if (!tournament.groups) return null;
  
  const sortedGroups = Object.values(tournament.groups).sort((a: any, b: any) => a.id.localeCompare(b.id));
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Group Tables */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
        {sortedGroups.map((group: any) => {
          const standings = calculateGroupStandings(group, tournament, players);
          
          return (
            <Box 
              key={`group-${group.id}`} 
              sx={{ 
                minWidth: 320, 
                maxWidth: 400, 
                flex: 1, 
                bgcolor: 'background.paper', 
                borderRadius: 3, 
                boxShadow: 2, 
                p: 2,
                order: group.id.charCodeAt(0) - 65 // A=0, B=1, C=2, etc.
              }}
            >
              <Box sx={{ mb: 1, textAlign: 'center' }}>
                <strong>בית {group.id}</strong>
              </Box>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th>מקום</th>
                    <th>קבוצה</th>
                    <th>מש</th>
                    <th>נ</th>
                    <th>ת</th>
                    <th>ה</th>
                    <th>ז</th>
                    <th>ס</th>
                    <th>הפרש</th>
                    <th>נק'</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((standing: any) => {
                    const team = tournament.teams[standing.teamKey];
                    
                    return (
                      <tr key={`${group.id}-${standing.teamKey}`} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ textAlign: 'center' }}>{standing.position}</td>
                        <td style={{ textAlign: 'center' }}>{getPlayerName(players, team?.captain || standing.teamKey)}</td>
                        <td style={{ textAlign: 'center' }}>{standing.played}</td>
                        <td style={{ textAlign: 'center' }}>{standing.won}</td>
                        <td style={{ textAlign: 'center' }}>{standing.drawn}</td>
                        <td style={{ textAlign: 'center' }}>{standing.lost}</td>
                        <td style={{ textAlign: 'center' }}>{standing.goalsFor}</td>
                        <td style={{ textAlign: 'center' }}>{standing.goalsAgainst}</td>
                        <td style={{ textAlign: 'center' }}>{standing.goalDifference}</td>
                        <td style={{ textAlign: 'center' }}>{standing.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          );
        })}
      </Box>
      
      {/* Mini-Games Section */}
      <Box>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2, textAlign: 'center' }}>
          משחקי שלב הבתים
        </Typography>
        {(() => {
          const groupMiniGames = tournament.miniGames?.filter((game: any) => game.group && !game.knockoutMatchId) || [];
          
          if (groupMiniGames.length === 0) {
            return (
              <Typography color="text.secondary" textAlign="center">
                אין משחקים בשלב הבתים עדיין
              </Typography>
            );
          }
          
          // Group mini-games by group
          const gamesByGroup: { [key: string]: any[] } = {};
          groupMiniGames.forEach((game: any) => {
            if (!gamesByGroup[game.group]) {
              gamesByGroup[game.group] = [];
            }
            gamesByGroup[game.group].push(game);
          });
          
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {Object.keys(gamesByGroup).sort().map((groupId) => {
                const groupGames = gamesByGroup[groupId];
                
                return (
                  <Box key={groupId} sx={{ mb: 3 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2, textAlign: 'center' }}>
                      בית {groupId}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {groupGames.map((game: any, idx: number) => {
                        const teamA = tournament.teams[game.teamA];
                        const teamB = tournament.teams[game.teamB];
                        const captainAName = teamA ? getPlayerName(players, teamA.captain) : game.teamA;
                        const captainBName = teamB ? getPlayerName(players, teamB.captain) : game.teamB;
                        const goalsArr = game.goals || [];
                        const scoreA = goalsArr.filter((g: any) => g.team === game.teamA).length;
                        const scoreB = goalsArr.filter((g: any) => g.team === game.teamB).length;
                        
                        return (
                          <Box key={game.id || idx} sx={{ mb: 3 }}>
                            <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 1, justifyContent: 'center' }}>
                              {/* Team A */}
                              <Box sx={{ minWidth: 160, textAlign: 'center' }}>
                                <Typography fontWeight={700} color="primary">
                                  קבוצת {captainAName}
                                </Typography>
                                <Typography variant="h5" fontWeight={900}>
                                  {scoreA}
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}>
                                  {goalsArr.filter((g: any) => g.team === game.teamA).map((goal: any, i: number) => (
                                    <Typography key={goal.id || i} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.95rem', textAlign: 'center' }}>
                                      {getPlayerName(players, goal.scorerId)}
                                      {goal.assistId ? (
                                        <>
                                          {' '}(<span style={{ color: '#a21caf' }}>{getPlayerName(players, goal.assistId)}</span>)
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
                                  קבוצת {captainBName}
                                </Typography>
                                <Typography variant="h5" fontWeight={900}>
                                  {scoreB}
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}>
                                  {goalsArr.filter((g: any) => g.team === game.teamB).map((goal: any, i: number) => (
                                    <Typography key={goal.id || i} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.95rem', textAlign: 'center' }}>
                                      {getPlayerName(players, goal.scorerId)}
                                      {goal.assistId ? (
                                        <>
                                          {' '}(<span style={{ color: '#a21caf' }}>{getPlayerName(players, goal.assistId)}</span>)
                                        </>
                                      ) : null}
                                    </Typography>
                                  ))}
                                </Box>
                              </Box>
                            </Stack>
                            {/* Duration display */}
                            {game.status === 'complete' && game.startTime && game.endTime && (
                              <Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '1.1rem', textAlign: 'center', mt: 1 }}>
                                משך: {formatDuration(game.startTime, game.endTime)}
                              </Typography>
                            )}
                            {idx < groupGames.length - 1 && <Divider sx={{ my: 2 }} />}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          );
        })()}
      </Box>
    </Box>
  );
}

function renderKnockoutBracket(tournament: any, players: any[]) {
  if (!tournament.knockoutBracket) return (
    <Typography color="text.secondary" textAlign="center">
      שלב הנוקאאוט טרם התחיל
    </Typography>
  );
  
  const bracket = tournament.knockoutBracket;
  const rounds = bracket.rounds || {};
  
  // Get semi-finals and final
  const semiFinals = rounds['round1'] || [];
  const final = rounds['round2']?.[0];
  const thirdPlace = rounds['round3']?.[0];
  
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'flex-start',
      gap: 6,
      py: 4,
      overflowX: 'auto'
    }}>
      {/* Semi-finals Column */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3, textAlign: 'center' }}>
          חצי גמר
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: 200 }}>
          {semiFinals.map((match: any, index: number) => {
            const teamA = match.teamA ? tournament.teams[match.teamA] : null;
            const teamB = match.teamB ? tournament.teams[match.teamB] : null;
            const captainAName = teamA ? getPlayerName(players, teamA.captain) : 'טרם נקבע';
            const captainBName = teamB ? getPlayerName(players, teamB.captain) : 'טרם נקבע';
            
            const miniGame = tournament.miniGames?.find((mg: any) => mg.knockoutMatchId === match.id);
            const scoreA = miniGame?.scoreA || 0;
            const scoreB = miniGame?.scoreB || 0;
            const isComplete = miniGame?.status === 'complete';
            const winner = match.winner;
            
            return (
              <Box key={match.id || index} sx={{ position: 'relative' }}>
                {/* Match Card */}
                <Box 
                  sx={{ 
                    width: 180,
                    p: 2, 
                    border: '2px solid #e5e7eb', 
                    borderRadius: 2, 
                    bgcolor: 'background.paper',
                    boxShadow: 2,
                    position: 'relative'
                  }}
                >
                  {/* Team A */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 1,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: winner === match.teamA ? '#dcfce7' : 'transparent',
                    border: winner === match.teamA ? '1px solid #22c55e' : 'none'
                  }}>
                    <Typography 
                      variant="body2" 
                      fontWeight={600}
                      sx={{ 
                        color: winner === match.teamA ? '#22c55e' : 'text.primary',
                        flex: 1,
                        textAlign: 'right'
                      }}
                    >
                      {captainAName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={700}>
                        {scoreA}
                      </Typography>
                      {winner === match.teamA && (
                        <Typography variant="body2" color="success.main" fontWeight={700}>
                          ►
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  
                  {/* Team B */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    p: 1,
                    borderRadius: 1,
                    bgcolor: winner === match.teamB ? '#dcfce7' : 'transparent',
                    border: winner === match.teamB ? '1px solid #22c55e' : 'none'
                  }}>
                    <Typography 
                      variant="body2" 
                      fontWeight={600}
                      sx={{ 
                        color: winner === match.teamB ? '#22c55e' : 'text.primary',
                        flex: 1,
                        textAlign: 'right'
                      }}
                    >
                      {captainBName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={700}>
                        {scoreB}
                      </Typography>
                      {winner === match.teamB && (
                        <Typography variant="body2" color="success.main" fontWeight={700}>
                          ►
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
      
      {/* Final Column */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3, textAlign: 'center' }}>
          גמר
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: 200 }}>
          {/* Spacer for alignment */}
          <Box sx={{ height: 0 }} />
          
          {/* Final match positioned at top */}
          {final && (
            <Box sx={{ position: 'relative' }}>
              <Box 
                sx={{ 
                  width: 180,
                  p: 2, 
                  border: '2px solid #e5e7eb', 
                  borderRadius: 2, 
                  bgcolor: 'background.paper',
                  boxShadow: 2,
                  position: 'relative'
                }}
              >
                {/* Team A */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 1,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: final.winner === final.teamA ? '#dcfce7' : 'transparent',
                  border: final.winner === final.teamA ? '1px solid #22c55e' : 'none'
                }}>
                  <Typography 
                    variant="body2" 
                    fontWeight={600}
                    sx={{ 
                      color: final.winner === final.teamA ? '#22c55e' : 'text.primary',
                      flex: 1,
                      textAlign: 'right'
                    }}
                  >
                    {final.teamA ? getPlayerName(players, tournament.teams[final.teamA]?.captain) : 'טרם נקבע'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {(() => {
                        const miniGame = tournament.miniGames?.find((mg: any) => mg.knockoutMatchId === final.id);
                        return miniGame?.scoreA || 0;
                      })()}
                    </Typography>
                    {final.winner === final.teamA && (
                      <Typography variant="body2" color="success.main" fontWeight={700}>
                        ►
                      </Typography>
                    )}
                  </Box>
                </Box>
                
                {/* Team B */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  p: 1,
                  borderRadius: 1,
                  bgcolor: final.winner === final.teamB ? '#dcfce7' : 'transparent',
                  border: final.winner === final.teamB ? '1px solid #22c55e' : 'none'
                }}>
                  <Typography 
                    variant="body2" 
                    fontWeight={600}
                    sx={{ 
                      color: final.winner === final.teamB ? '#22c55e' : 'text.primary',
                      flex: 1,
                      textAlign: 'right'
                    }}
                  >
                    {final.teamB ? getPlayerName(players, tournament.teams[final.teamB]?.captain) : 'טרם נקבע'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {(() => {
                        const miniGame = tournament.miniGames?.find((mg: any) => mg.knockoutMatchId === final.id);
                        return miniGame?.scoreB || 0;
                      })()}
                    </Typography>
                    {final.winner === final.teamB && (
                      <Typography variant="body2" color="success.main" fontWeight={700}>
                        ►
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
          
          {/* Spacer for alignment */}
          <Box sx={{ height: 0 }} />
        </Box>
      </Box>
      
      {/* Third Place Column */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3, textAlign: 'center' }}>
          מקום שלישי
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: 200 }}>
          {/* Spacer for alignment */}
          <Box sx={{ height: 0 }} />
          
          {/* Third place match positioned at bottom */}
          {thirdPlace && (
            <Box sx={{ position: 'relative' }}>
              <Box 
                sx={{ 
                  width: 180,
                  p: 2, 
                  border: '2px solid #e5e7eb', 
                  borderRadius: 2, 
                  bgcolor: 'background.paper',
                  boxShadow: 2,
                  position: 'relative'
                }}
              >
                {/* Team A */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 1,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: thirdPlace.winner === thirdPlace.teamA ? '#dcfce7' : 'transparent',
                  border: thirdPlace.winner === thirdPlace.teamA ? '1px solid #22c55e' : 'none'
                }}>
                  <Typography 
                    variant="body2" 
                    fontWeight={600}
                    sx={{ 
                      color: thirdPlace.winner === thirdPlace.teamA ? '#22c55e' : 'text.primary',
                      flex: 1,
                      textAlign: 'right'
                    }}
                  >
                    {thirdPlace.teamA ? getPlayerName(players, tournament.teams[thirdPlace.teamA]?.captain) : 'טרם נקבע'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {(() => {
                        const miniGame = tournament.miniGames?.find((mg: any) => mg.knockoutMatchId === thirdPlace.id);
                        return miniGame?.scoreA || 0;
                      })()}
                    </Typography>
                    {thirdPlace.winner === thirdPlace.teamA && (
                      <Typography variant="body2" color="success.main" fontWeight={700}>
                        ►
                      </Typography>
                    )}
                  </Box>
                </Box>
                
                {/* Team B */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  p: 1,
                  borderRadius: 1,
                  bgcolor: thirdPlace.winner === thirdPlace.teamB ? '#dcfce7' : 'transparent',
                  border: thirdPlace.winner === thirdPlace.teamB ? '1px solid #22c55e' : 'none'
                }}>
                  <Typography 
                    variant="body2" 
                    fontWeight={600}
                    sx={{ 
                      color: thirdPlace.winner === thirdPlace.teamB ? '#22c55e' : 'text.primary',
                      flex: 1,
                      textAlign: 'right'
                    }}
                  >
                    {thirdPlace.teamB ? getPlayerName(players, tournament.teams[thirdPlace.teamB]?.captain) : 'טרם נקבע'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {(() => {
                        const miniGame = tournament.miniGames?.find((mg: any) => mg.knockoutMatchId === thirdPlace.id);
                        return miniGame?.scoreB || 0;
                      })()}
                    </Typography>
                    {thirdPlace.winner === thirdPlace.teamB && (
                      <Typography variant="body2" color="success.main" fontWeight={700}>
                        ►
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function calculateTournamentStats(tournament: any, players: any[]) {
  const miniGames = tournament.miniGames || [];
  const teams = tournament.teams || {};
  
  // Calculate total goals and assists
  const allGoals = miniGames.flatMap((game: any) => game.goals || []);
  const totalGoals = allGoals.length;
  
  // Calculate team stats
  const teamStats: { [key: string]: any } = {};
  Object.keys(teams).forEach(teamKey => {
    teamStats[teamKey] = {
      games: 0,
      wins: 0,
      goals: 0
    };
  });
  
  // Calculate player stats
  const playerGoals: { [key: string]: number } = {};
  const playerAssists: { [key: string]: number } = {};
  
  miniGames.forEach((game: any) => {
    if (game.status === 'complete') {
      // Count team games
      if (game.teamA) teamStats[game.teamA].games++;
      if (game.teamB) teamStats[game.teamB].games++;
      
      // Count team wins
      const scoreA = game.scoreA || 0;
      const scoreB = game.scoreB || 0;
      if (scoreA > scoreB && game.teamA) {
        teamStats[game.teamA].wins++;
      } else if (scoreB > scoreA && game.teamB) {
        teamStats[game.teamB].wins++;
      }
      
      // Count goals and assists
      (game.goals || []).forEach((goal: any) => {
        if (goal.team === game.teamA) teamStats[game.teamA].goals++;
        if (goal.team === game.teamB) teamStats[game.teamB].goals++;
        
        // Player goals
        if (goal.scorerId) {
          playerGoals[goal.scorerId] = (playerGoals[goal.scorerId] || 0) + 1;
        }
        
        // Player assists
        if (goal.assistId) {
          playerAssists[goal.assistId] = (playerAssists[goal.assistId] || 0) + 1;
        }
      });
    }
  });
  
  // Find top scorer and top assist
  const topScorer = Object.entries(playerGoals)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0];
  
  const topAssist = Object.entries(playerAssists)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0];
  
  // Calculate average game duration
  const completedGames = miniGames.filter((game: any) => 
    game.status === 'complete' && game.startTime && game.endTime
  );
  
  let totalDuration = 0;
  completedGames.forEach((game: any) => {
    const startTime = typeof game.startTime === 'string' ? new Date(game.startTime).getTime() : game.startTime;
    const endTime = typeof game.endTime === 'string' ? new Date(game.endTime).getTime() : game.endTime;
    totalDuration += endTime - startTime;
  });
  
  const averageDuration = completedGames.length > 0 ? totalDuration / completedGames.length : 0;
  
  return {
    totalGoals,
    totalGames: miniGames.filter((g: any) => g.status === 'complete').length,
    teamStats,
    topScorer: topScorer ? { playerId: topScorer[0], goals: topScorer[1] } : null,
    topAssist: topAssist ? { playerId: topAssist[0], assists: topAssist[1] } : null,
    averageDuration
  };
}

function renderTournamentStats(tournament: any, players: any[]) {
  const stats = calculateTournamentStats(tournament, players);
  
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
      {/* Top Scorer Card */}
      <Card sx={{ minWidth: 200, flex: 1, maxWidth: 250 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2, textAlign: 'center' }}>
            מלך השערים
          </Typography>
          {stats.topScorer ? (
            <Box>
              <Typography variant="h6" color="primary" fontWeight={700} sx={{ textAlign: 'center' }}>
                {getPlayerName(players, stats.topScorer.playerId)} ({stats.topScorer.goals})
              </Typography>
            </Box>
          ) : (
            <Typography color="text.secondary" textAlign="center">
              אין שערים עדיין
            </Typography>
          )}
        </CardContent>
      </Card>
      
      {/* Top Assists Card */}
      <Card sx={{ minWidth: 200, flex: 1, maxWidth: 250 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2, textAlign: 'center' }}>
            מלך הבישולים
          </Typography>
          {stats.topAssist ? (
            <Box>
              <Typography variant="h6" color="primary" fontWeight={700} sx={{ textAlign: 'center' }}>
                {getPlayerName(players, stats.topAssist.playerId)} ({stats.topAssist.assists})
              </Typography>
            </Box>
          ) : (
            <Typography color="text.secondary" textAlign="center">
              אין בישולים עדיין
            </Typography>
          )}
        </CardContent>
      </Card>
      
      {/* Team Stats Card */}
      <Card sx={{ minWidth: 300, flex: 2, maxWidth: 400 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2, textAlign: 'center' }}>
            סטטיסטיקות קבוצות
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Object.entries(stats.teamStats).map(([teamKey, teamStat]: [string, any]) => {
              const team = tournament.teams[teamKey];
              const captainName = team ? getPlayerName(players, team.captain) : teamKey;
              
              return (
                <Box key={teamKey}>
                  <Typography variant="body1" color="primary" fontWeight={700}>
                    קבוצת {captainName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    משחקים: {teamStat.games} | נצחונות: {teamStat.wins}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </Card>
      
      {/* Average Duration Card */}
      <Card sx={{ minWidth: 150, flex: 1, maxWidth: 200 }}>
        <CardContent>
          <Typography variant="h5" color="primary" fontWeight={700} sx={{ textAlign: 'center' }}>
            {formatDuration(0, stats.averageDuration)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            משך ממוצע למיני-משחק
          </Typography>
        </CardContent>
      </Card>
      
      {/* Total Stats Card */}
      <Card sx={{ minWidth: 150, flex: 1, maxWidth: 200 }}>
        <CardContent>
          <Typography variant="h5" color="primary" fontWeight={700} sx={{ textAlign: 'center' }}>
            {stats.totalGames}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            מספר מיני-משחקים
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            סה"כ שערים: {stats.totalGoals}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default function TournamentsAccordion({ tournaments }: { tournaments: any[] }) {
  const router = useRouter();
  const { players } = usePlayersCache();
  
  if (!tournaments || tournaments.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography color="text.secondary">לא נמצאו טורנירים</Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      {tournaments.map((tournament) => {
        const statusInfo = getStatusLabel(tournament.status);
        const [activeTab, setActiveTab] = useState(0);
        
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
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                מספר קבוצות: {tournament.settings?.numberOfTeams ?? '-'} | שחקנים בקבוצה: {tournament.settings?.playersPerTeam ?? '-'}
              </Typography>
              
              {/* Tabs for Group Stage, Knockout, and Stats */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                  <Tab label="שלב בתים" />
                  <Tab label="נוקאאוט" />
                  <Tab label="סטטיסטיקות" />
                </Tabs>
              </Box>
              
              {/* Tab content */}
              {activeTab === 0 && (
                <Box>
                  {renderGroupTables(tournament, players)}
                </Box>
              )}
              
              {activeTab === 1 && (
                <Box>
                  {renderKnockoutBracket(tournament, players)}
                </Box>
              )}
              
              {activeTab === 2 && (
                <Box>
                  {renderTournamentStats(tournament, players)}
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
} 