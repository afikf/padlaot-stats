import React from 'react';
import { Box, Typography, Card, CardContent, Stack, Divider } from '@mui/material';

function getPlayerName(players: any[], id: string) {
  const player = players.find((p) => p.id === id);
  return player ? player.name : id;
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

function formatDuration(start: string, end: string) {
  if (!start || !end) return '';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function GameNightSummary({ night, players }: { night: any, players: any[] }) {
  if (!night || !Array.isArray(night.miniGames) || night.miniGames.length === 0) {
    return <Typography color="text.secondary">לא נמצאו מיני-משחקים לערב זה</Typography>;
  }

  // --- Stats Calculation (copied from live game management) ---
  const miniGames = Array.isArray(night.miniGames) ? night.miniGames : [];
  const teams = night.teams || {};
  // 1. Number of mini games
  const numMiniGames = miniGames.length;
  // 2. Average duration per mini game (in MM:SS)
  const completedGames = miniGames.filter((g: any) => g.status === 'complete' && g.startTime && g.endTime);
  const avgDurationMs = completedGames.length > 0 ? completedGames.reduce((sum: number, g: any) => sum + (new Date(g.endTime).getTime() - new Date(g.startTime).getTime()), 0) / completedGames.length : 0;
  const avgDurationStr = avgDurationMs > 0 ? (() => {
    const totalSeconds = Math.floor(avgDurationMs / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  })() : '-';
  // 3. Number of games per team
  const gamesPerTeam: Record<string, number> = {};
  Object.keys(teams).forEach(teamKey => {
    gamesPerTeam[teamKey] = miniGames.filter((g: any) => g.teamA === teamKey || g.teamB === teamKey).length;
  });
  // 4. Number of wins per team
  const winsPerTeam: Record<string, number> = {};
  Object.keys(teams).forEach(teamKey => {
    winsPerTeam[teamKey] = miniGames.filter((g: any) => g.status === 'complete' && ((g.teamA === teamKey && g.scoreA > g.scoreB) || (g.teamB === teamKey && g.scoreB > g.scoreA))).length;
  });
  // 5. Top goalscorer
  const allGoals = miniGames.flatMap((g: any) => g.goals || []);
  const goalsByPlayer: Record<string, number> = {};
  allGoals.forEach((goal: any) => {
    if (!goal.scorerId) return;
    goalsByPlayer[goal.scorerId] = (goalsByPlayer[goal.scorerId] || 0) + 1;
  });
  const topScorerId = Object.keys(goalsByPlayer).sort((a, b) => goalsByPlayer[b] - goalsByPlayer[a])[0];
  const topScorerName = topScorerId ? (getPlayerName(players, topScorerId) + ` (${goalsByPlayer[topScorerId]})`) : '-';
  // 6. Top assist player
  const assistsByPlayer: Record<string, number> = {};
  allGoals.forEach((goal: any) => {
    if (!goal.assistId) return;
    assistsByPlayer[goal.assistId] = (assistsByPlayer[goal.assistId] || 0) + 1;
  });
  const topAssistId = Object.keys(assistsByPlayer).sort((a, b) => assistsByPlayer[b] - assistsByPlayer[a])[0];
  const topAssistName = topAssistId ? (getPlayerName(players, topAssistId) + ` (${assistsByPlayer[topAssistId]})`) : '-';
  // All scorers and assisters lists
  const allScorers = Object.entries(goalsByPlayer)
    .sort((a, b) => b[1] - a[1])
    .map(([pid, count]) => ({ name: getPlayerName(players, pid), count }));
  const allAssisters = Object.entries(assistsByPlayer)
    .sort((a, b) => b[1] - a[1])
    .map(([pid, count]) => ({ name: getPlayerName(players, pid), count }));

  // --- Render stats grid ---
  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 2, mb: 4 }}>
        <Card sx={{ borderRadius: 3, textAlign: 'center', bgcolor: 'background.paper', boxShadow: 2 }}>
          <CardContent>
            <Typography variant="h6" color="primary" fontWeight={700}>{numMiniGames}</Typography>
            <Typography variant="body2" color="text.secondary">מספר מיני-משחקים</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>סה"כ שערים: {allGoals.length}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, textAlign: 'center', bgcolor: 'background.paper', boxShadow: 2 }}>
          <CardContent>
            <Typography variant="h6" color="primary" fontWeight={700}>{avgDurationStr}</Typography>
            <Typography variant="body2" color="text.secondary">משך ממוצע למיני-משחק</Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, textAlign: 'center', bgcolor: 'background.paper', boxShadow: 2 }}>
          <CardContent>
            <Box>
              {Object.keys(teams).map(teamKey => {
                const teamObj = teams[teamKey];
                return (
                  <Box key={teamKey} sx={{ mb: 1 }}>
                    <Typography fontWeight={700} color="primary" sx={{ fontSize: 16 }}>
                      {getTeamDisplayName(night, teamKey, players)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      משחקים: {gamesPerTeam[teamKey]} | נצחונות: {winsPerTeam[teamKey]}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>
        {/* Top Scorer Card */}
        <Card sx={{ borderRadius: 3, textAlign: 'center', bgcolor: 'background.paper', boxShadow: 2 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">מלך השערים</Typography>
            <Typography variant="h6" fontWeight={700} color="primary">{topScorerName}</Typography>
            {/* List all scorers except the top scorer */}
            <Box sx={{ mt: 1 }}>
              {allScorers.filter((s) => s.name !== (topScorerName.split(' (')[0])).map((s, i) => (
                <Typography key={s.name + i} variant="body2" color="text.secondary">
                  {s.name} ({s.count})
                </Typography>
              ))}
            </Box>
          </CardContent>
        </Card>
        {/* Top Assist Card */}
        <Card sx={{ borderRadius: 3, textAlign: 'center', bgcolor: 'background.paper', boxShadow: 2 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">מלך הבישולים</Typography>
            <Typography variant="h6" fontWeight={700} color="primary">{topAssistName}</Typography>
            {/* List all assisters except the top assister */}
            <Box sx={{ mt: 1 }}>
              {allAssisters.filter((a) => a.name !== (topAssistName.split(' (')[0])).map((a, i) => (
                <Typography key={a.name + i} variant="body2" color="text.secondary">
                  {a.name} ({a.count})
                </Typography>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
} 