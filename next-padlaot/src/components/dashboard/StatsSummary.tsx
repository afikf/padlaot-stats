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

export default function StatsSummary({ gameNights, players, showMyStatsOnly, userData }: StatsSummaryProps) {
  // Filter game nights if showMyStatsOnly is enabled
  let filteredGameNights = gameNights;
  if (showMyStatsOnly && userData?.playerId) {
    filteredGameNights = gameNights.filter(night =>
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

  // Game nights and mini-games
  const totalGameNights = filteredGameNights.length;
  let totalMiniGames = 0;
  if (showMyStatsOnly && userData?.playerId) {
    // Count only mini-games where user's team played
    filteredGameNights.forEach(night => {
      night.miniGames?.forEach((mg: any) => {
        const teamA = night.teams?.[mg.teamA];
        const teamB = night.teams?.[mg.teamB];
        if ((teamA && teamA.includes(userData.playerId)) || (teamB && teamB.includes(userData.playerId))) {
          totalMiniGames++;
        }
      });
    });
  } else {
    totalMiniGames = filteredGameNights.reduce((sum, night) => sum + (Array.isArray(night.miniGames) ? night.miniGames.length : 0), 0);
  }

  // Calculate personal goals if filtering for user
  let totalGoals = 0;
  if (showMyStatsOnly && userData?.playerId) {
    // Count goals from liveGoals where scorerId matches user's playerId
    filteredGameNights.forEach(night => {
      night.miniGames?.forEach((mg: any) => {
        if (Array.isArray(mg.liveGoals)) {
          mg.liveGoals.forEach((goal: any) => {
            if (goal.scorerId === userData.playerId) {
              totalGoals++;
            }
          });
        }
      });
    });
  } else {
    // Total goals across all players
    for (const player of players) {
      totalGoals += player.goals || 0;
    }
  }

  // Player stats (top scorer and assister always show global stats)
  let totalAssists = 0;
  let topScorer = '-';
  let topGoals = 0;
  let topAssister = '-';
  let topAssists = 0;

  for (const player of players) {
    const goals = player.goals || 0;
    const assists = player.assists || 0;
    totalAssists += assists;
    if (goals > topGoals) {
      topGoals = goals;
      topScorer = `${player.name} (${topGoals})`;
    }
    if (assists > topAssists) {
      topAssists = assists;
      topAssister = `${player.name} (${topAssists})`;
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
  );
} 