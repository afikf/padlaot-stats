// StatsSummary: shows high-level stat cards (total games, goals, top scorer, etc)

import { Box, Card, CardContent, Typography } from '@mui/material';
import { GameNight } from '@/hooks/useGameNightsCache';
import { Player } from '@/hooks/usePlayerStatsCache';

interface StatsSummaryProps {
  gameNights: GameNight[];
  players: Player[];
  showMyStatsOnly?: boolean;
  userData?: any;
}

export default function StatsSummary({ gameNights, players, showMyStatsOnly = false, userData }: StatsSummaryProps) {
  // Filter game nights if showMyStatsOnly is enabled
  let filteredGameNights = gameNights;
  if (showMyStatsOnly && userData?.playerId) {
    filteredGameNights = gameNights.filter(night =>
      night.miniGames?.some(
        (mg: any) => {
          const teamA = night.teams?.[mg.teamA];
          const teamB = night.teams?.[mg.teamB];
          return (teamA && Array.isArray(teamA.players) && teamA.players.includes(userData.playerId)) ||
                 (teamB && Array.isArray(teamB.players) && teamB.players.includes(userData.playerId));
        }
      )
    );
  }

  // Game nights and mini-games
  const totalGameNights = filteredGameNights.length;
  let totalMiniGames = 0;
  if (showMyStatsOnly && userData?.playerId) {
    // Count only mini-games where user's team played
    filteredGameNights.forEach(night => {
      night.miniGames?.forEach((mg: any) => {
        const teamA = night.teams?.[mg.teamA];
        const teamB = night.teams?.[mg.teamB];
        if ((teamA && teamA.players?.includes(userData.playerId)) || (teamB && teamB.players?.includes(userData.playerId))) {
          totalMiniGames++;
        }
      });
    });
  } else {
    totalMiniGames = filteredGameNights.reduce((sum, night) => sum + (Array.isArray(night.miniGames) ? night.miniGames.length : 0), 0);
  }

  // Calculate stats from player fields
  let totalGoals = 0;
  let totalAssists = 0;
  let topScorer = '-';
  let topGoals = 0;
  let topAssister = '-';
  let topAssists = 0;

  // Always calculate top scorer and assister from all players
  for (const player of players) {
    const goals = player.totalGoals ?? player.goals ?? 0;
    const assists = player.totalAssists ?? player.assists ?? 0;
    if (goals > topGoals) {
      topGoals = goals;
      topScorer = `${player.name} (${topGoals})`;
    }
    if (assists > topAssists) {
      topAssists = assists;
      topAssister = `${player.name} (${topAssists})`;
    }
  }

  if (showMyStatsOnly && userData?.playerId) {
    const playerObj = players.find(p => p.id === userData.playerId);
    totalGoals = playerObj?.totalGoals ?? playerObj?.goals ?? 0;
    totalAssists = playerObj?.totalAssists ?? playerObj?.assists ?? 0;
  } else {
    for (const player of players) {
      const goals = player.totalGoals ?? player.goals ?? 0;
      const assists = player.totalAssists ?? player.assists ?? 0;
      totalGoals += goals;
      totalAssists += assists;
    }
  }

  const stats = [
    { label: 'ערבי משחקים', value: totalGameNights },
    { label: 'מיני-משחקים', value: totalMiniGames },
    { label: 'שערים', value: totalGoals },
    { label: 'מלך השערים', value: topScorer },
    { label: 'מלך הבישולים', value: topAssister },
  ];

  return (
    <>
    <Box
      sx={{
        mb: 4,
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr 1fr',
          md: 'repeat(5, 1fr)'
        },
        gap: 2,
      }}
    >
      {stats.map((stat) => (
        <Card key={stat.label} sx={{ borderRadius: 3, textAlign: 'center', bgcolor: 'background.paper', boxShadow: 2 }}>
          <CardContent>
            <Typography variant="h6" color="primary" fontWeight={700}>
              {stat.value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stat.label}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
      {filteredGameNights.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">
            {showMyStatsOnly ? 'לא נמצאו ערבי משחק בהם השתתפת' : 'לא נמצאו ערבי משחקים'}
          </Typography>
        </Box>
      )}
    </>
  );
} 