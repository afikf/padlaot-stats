import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TableSortLabel, Box } from '@mui/material';
import DashboardSearchBar from './DashboardSearchBar';
import { usePlayerStatsCache } from '@/hooks/usePlayerStatsCache';
import { useGameNightsCache } from '@/hooks/useGameNightsCache';
import { useAuth } from '@/contexts/AuthContext';

function descendingComparator(a: any, b: any, orderBy: string) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator(order: 'asc' | 'desc', orderBy: string) {
  return order === 'desc'
    ? (a: any, b: any) => descendingComparator(a, b, orderBy)
    : (a: any, b: any) => -descendingComparator(a, b, orderBy);
}

// Helper to count game nights and mini-games for a player
function getPlayerGameStats(playerId: string, gameNights: any[]) {
  let gameNightsCount = 0;
  let miniGamesCount = 0;
  for (const night of gameNights) {
    if (night.participants && night.participants.includes(playerId)) {
      gameNightsCount++;
      if (Array.isArray(night.miniGames)) {
        for (const mg of night.miniGames) {
          const teamA = night.teams?.[mg.teamA];
          const teamB = night.teams?.[mg.teamB];
          if ((teamA && Array.isArray(teamA.players) && teamA.players.includes(playerId)) ||
              (teamB && Array.isArray(teamB.players) && teamB.players.includes(playerId))) {
            miniGamesCount++;
          }
        }
      }
    }
  }
  return { gameNightsCount, miniGamesCount };
}

export default function PlayerStatsTable({ showMyStatsOnly }: { showMyStatsOnly?: boolean }) {
  const { players, loading: loadingPlayers, error: errorPlayers } = usePlayerStatsCache();
  const { gameNights } = useGameNightsCache();
  const { userData } = useAuth();

  const [filters, setFilters] = React.useState<{ playerId?: string; month?: string; date?: string }>({});
  const [order, setOrder] = React.useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = React.useState<string>('goals');

  if (loadingPlayers) return <Box sx={{ textAlign: 'center', py: 6 }}>טוען נתוני שחקנים...</Box>;
  if (errorPlayers) return <Box sx={{ textAlign: 'center', py: 6, color: 'error.main' }}>{errorPlayers}</Box>;

  // Filter players
  let filteredPlayers = players;
  
  // Filter by "Show My Stats Only"
  if (showMyStatsOnly && userData?.playerId) {
    filteredPlayers = filteredPlayers.filter(p => p.id === userData.playerId);
  }
  
  if (filters.playerId) {
    filteredPlayers = filteredPlayers.filter(p => p.id === filters.playerId);
  }

  // TODO: Filter by month/date using gameNights if needed

  // Add game night and mini-game stats to each player
  const playersWithStats = filteredPlayers.map(player => {
    const { gameNightsCount, miniGamesCount } = getPlayerGameStats(player.id, gameNights);
    return {
      ...player,
      goals: player.totalGoals ?? player.goals ?? 0,
      assists: player.totalAssists ?? player.assists ?? 0,
      wins: player.totalWins ?? player.wins ?? 0,
      gameNightsCount,
      miniGamesCount,
    };
  });

  // Sort players
  const sortedPlayers = [...playersWithStats].sort(getComparator(order, orderBy));

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  return (
    <Box>
      <DashboardSearchBar
        players={players}
        gameNights={gameNights}
        onFilterChange={setFilters}
      />
      {/* Number of players */}
      <Box sx={{ mb: 2, textAlign: 'left', fontWeight: 600 }}>
        מספר שחקנים: {sortedPlayers.length}
      </Box>
      <TableContainer component={Paper} sx={{ borderRadius: 3, maxHeight: 480, overflowY: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ position: 'sticky', top: 0, zIndex: 1, background: 'background.paper' }}>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')}
                >
                  שם
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'goals'}
                  direction={orderBy === 'goals' ? order : 'asc'}
                  onClick={() => handleRequestSort('goals')}
                >
                  שערים
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'assists'}
                  direction={orderBy === 'assists' ? order : 'asc'}
                  onClick={() => handleRequestSort('assists')}
                >
                  בישולים
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'wins'}
                  direction={orderBy === 'wins' ? order : 'asc'}
                  onClick={() => handleRequestSort('wins')}
                >
                  ניצחונות
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'gameNightsCount'}
                  direction={orderBy === 'gameNightsCount' ? order : 'asc'}
                  onClick={() => handleRequestSort('gameNightsCount')}
                >
                  ערבי משחקים
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'miniGamesCount'}
                  direction={orderBy === 'miniGamesCount' ? order : 'asc'}
                  onClick={() => handleRequestSort('miniGamesCount')}
                >
                  משחקים
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPlayers.map((player) => (
              <TableRow
                key={player.id}
                sx={userData?.playerId === player.id ? { bgcolor: 'rgba(56,189,248,0.12)' } : {}}
              >
                <TableCell align="center">{player.name}</TableCell>
                <TableCell align="center">{player.goals ?? 0}</TableCell>
                <TableCell align="center">{player.assists ?? 0}</TableCell>
                <TableCell align="center">{player.wins ?? 0}</TableCell>
                <TableCell align="center">{player.gameNightsCount}</TableCell>
                <TableCell align="center">{player.miniGamesCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
} 