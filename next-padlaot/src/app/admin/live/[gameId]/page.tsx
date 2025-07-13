'use client';

import { useRouter, useParams } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Box, Typography, CircularProgress, Card, CardContent, Button, Avatar, IconButton, Tooltip } from '@mui/material';
import useLiveGame from '@/hooks/useLiveGame';
import { usePlayerStatsCache } from '@/hooks/usePlayerStatsCache';
import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, arrayUnion, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';
import GameTimer from '@/components/dashboard/GameTimer';
import { Autocomplete, TextField } from '@mui/material';
import { useToast } from '@/contexts/ToastContext';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

export default function LiveGamePage() {
  const { gameId } = useParams();
  const searchParams = useSearchParams();
  const isEditCompleted = searchParams.get('editCompleted') === 'true';
  const { gameDay, loading, error } = useLiveGame(gameId as string);
  const { players, loading: loadingPlayers } = usePlayerStatsCache();
  const router = useRouter();
  const { showToast } = useToast();
  const [miniGameDialogOpen, setMiniGameDialogOpen] = useState(false);
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [creatingMiniGame, setCreatingMiniGame] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalMiniGameId, setGoalMiniGameId] = useState<string | null>(null);
  const [scorer, setScorer] = useState<any>(null);
  const [assister, setAssister] = useState<any>(null);
  const [addingGoal, setAddingGoal] = useState(false);
  const [goalTeam, setGoalTeam] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [miniGameToDelete, setMiniGameToDelete] = useState<any>(null);
  const [deletingMiniGame, setDeletingMiniGame] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [miniGameToEdit, setMiniGameToEdit] = useState<any>(null);
  const [editState, setEditState] = useState<any>(null);
  const [editGoalDialogOpen, setEditGoalDialogOpen] = useState(false);
  const [editGoalTeam, setEditGoalTeam] = useState<string | null>(null);
  const [editGoalIndex, setEditGoalIndex] = useState<number | null>(null);
  const [editGoalScorer, setEditGoalScorer] = useState<any>(null);
  const [editGoalAssister, setEditGoalAssister] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  // Add a state to track if a score increase is pending a goal addition
  const [pendingScoreTeam, setPendingScoreTeam] = useState<null | 'A' | 'B'>(null);
  const [completingGame, setCompletingGame] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Helper to get player name by ID
  function getPlayerName(playerId: string) {
    const player = players.find((p: any) => p.id === playerId);
    return player?.name || playerId;
  }

  // Helper to get team display name (captain's name)
  function getTeamDisplayName(teamObj: any) {
    if (!teamObj || !Array.isArray(teamObj.players) || teamObj.players.length === 0) return 'קבוצה';
    const captainId = teamObj.captain;
    return captainId ? getPlayerName(captainId) : getPlayerName(teamObj.players[0]);
  }

  // Helper to translate status to Hebrew
  function getStatusLabel(status: string) {
    switch (status) {
      case 'pending': return 'עומד להתחיל';
      case 'live': return 'חי';
      case 'complete': return 'הסתיים';
      default: return status;
    }
  }

  // Helper to format duration in MM:SS:ms
  function formatDuration(start: string, end: string) {
    if (!start || !end) return '';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    const msStr = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${m}:${s}:${msStr}`;
  }

  if (loading || loadingPlayers) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !gameDay) {
    return (
      <Box sx={{ textAlign: 'center', mt: 6 }}>
        <Typography color="error" variant="h6">לא נמצא משחק חי</Typography>
        <Button variant="outlined" sx={{ mt: 2 }} onClick={() => router.push('/admin')}>חזור לדשבורד</Button>
      </Box>
    );
  }

  const teamKeys = ['A', 'B', 'C'];

  async function handleCreateMiniGame() {
    if (!gameDay?.id || !team1 || !team2 || team1 === team2) return;
    setCreatingMiniGame(true);
    const newMiniGame = {
      id: `game-${Date.now()}`,
      teamA: team1,
      teamB: team2,
      scoreA: 0,
      scoreB: 0,
      goals: [],
      status: 'pending',
      startTime: null,
      endTime: null,
    };
    try {
      await updateDoc(doc(db, 'gameDays', gameDay.id), {
        miniGames: arrayUnion(newMiniGame),
      });
      setMiniGameDialogOpen(false);
      setTeam1('');
      setTeam2('');
    } finally {
      setCreatingMiniGame(false);
    }
  }

  async function handleAddGoal(mini: any) {
    if (!scorer || !goalTeam) return;
    setAddingGoal(true);
    const goal = {
      scorerId: scorer.id,
      assistId: assister?.id || null,
      team: goalTeam,
      timestamp: Date.now(),
    };
    // Fetch latest miniGames array
    const ref = doc(db, 'gameDays', gameDay.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const miniGames = Array.isArray(data.miniGames) ? data.miniGames : [];
    const updated = miniGames.map((g: any) => {
      if (g.id !== mini.id) return g;
      // Update score
      let scoreA = g.scoreA;
      let scoreB = g.scoreB;
      if (goalTeam === mini.teamA) scoreA += 1;
      if (goalTeam === mini.teamB) scoreB += 1;
      return {
        ...g,
        scoreA,
        scoreB,
        goals: [...(g.goals || []), goal],
      };
    });
    await updateDoc(ref, { miniGames: updated });
    setGoalDialogOpen(false);
    setScorer(null);
    setAssister(null);
    setGoalMiniGameId(null);
    setGoalTeam('');
    setAddingGoal(false);
  }

  async function handleDeleteMiniGame() {
    if (!miniGameToDelete || !gameDay?.id) return;
    
    setDeletingMiniGame(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Remove mini-game from gameDays document
      const gameDayRef = doc(db, 'gameDays', gameDay.id);
      const gameDaySnap = await getDoc(gameDayRef);
      if (!gameDaySnap.exists()) {
        throw new Error('Game day not found');
      }
      
      const data = gameDaySnap.data();
      const miniGames = Array.isArray(data.miniGames) ? data.miniGames : [];
      const updatedMiniGames = miniGames.filter((g: any) => g.id !== miniGameToDelete.id);
      
      batch.update(gameDayRef, { miniGames: updatedMiniGames });
      
      // 2. Update player stats - decrement goals and assists
      const goals = miniGameToDelete.goals || [];
      const playerUpdates = new Map<string, { goals: number; assists: number }>();
      
      goals.forEach((goal: any) => {
        if (goal.scorerId) {
          const current = playerUpdates.get(goal.scorerId) || { goals: 0, assists: 0 };
          current.goals += 1;
          playerUpdates.set(goal.scorerId, current);
        }
        if (goal.assistId) {
          const current = playerUpdates.get(goal.assistId) || { goals: 0, assists: 0 };
          current.assists += 1;
          playerUpdates.set(goal.assistId, current);
        }
      });
      
      // Apply player stat updates
      for (const [playerId, updates] of playerUpdates) {
        const playerRef = doc(db, 'players', playerId);
        const playerSnap = await getDoc(playerRef);
        if (playerSnap.exists()) {
          const playerData = playerSnap.data();
          const currentGoals = playerData.goals || 0;
          const currentAssists = playerData.assists || 0;
          
          batch.update(playerRef, {
            goals: Math.max(0, currentGoals - updates.goals),
            assists: Math.max(0, currentAssists - updates.assists)
          });
        }
      }
      
      await batch.commit();
      
      showToast('מיני-משחק נמחק בהצלחה', 'success');
      setDeleteDialogOpen(false);
      setMiniGameToDelete(null);
    } catch (error) {
      console.error('Error deleting mini-game:', error);
      showToast('שגיאה במחיקת המיני-משחק', 'error');
    } finally {
      setDeletingMiniGame(false);
    }
  }

  // Disable create button if any mini-game is pending or live
  const hasActiveGame = Array.isArray(gameDay.miniGames) && gameDay.miniGames.some((g: any) => g.status === 'pending' || g.status === 'live');

  // Compute game night stats
  const miniGames = Array.isArray(gameDay.miniGames) ? gameDay.miniGames : [];
  const teams = gameDay.teams || {};
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
  const topScorerName = topScorerId ? (getPlayerName(topScorerId) + ` (${goalsByPlayer[topScorerId]})`) : '-';
  // 6. Top assist player
  const assistsByPlayer: Record<string, number> = {};
  allGoals.forEach((goal: any) => {
    if (!goal.assistId) return;
    assistsByPlayer[goal.assistId] = (assistsByPlayer[goal.assistId] || 0) + 1;
  });
  const topAssistId = Object.keys(assistsByPlayer).sort((a, b) => assistsByPlayer[b] - assistsByPlayer[a])[0];
  const topAssistName = topAssistId ? (getPlayerName(topAssistId) + ` (${assistsByPlayer[topAssistId]})`) : '-';

  // All scorers and assisters lists
  const allScorers = Object.entries(goalsByPlayer)
    .sort((a, b) => b[1] - a[1])
    .map(([pid, count]) => ({ name: getPlayerName(pid), count }));
  const allAssisters = Object.entries(assistsByPlayer)
    .sort((a, b) => b[1] - a[1])
    .map(([pid, count]) => ({ name: getPlayerName(pid), count }));

  // When opening the edit dialog, initialize local state
  function openEditDialog(mini: any) {
    setMiniGameToEdit(mini);
    setEditState({
      ...mini,
      goals: [...(mini.goals || [])],
      scoreA: mini.scoreA,
      scoreB: mini.scoreB,
    });
    setEditDialogOpen(true);
  }

  // Score stepper handlers
  function handleScoreChange(team: 'A' | 'B', delta: number) {
    if (!editState) return;
    const teamKey = team === 'A' ? 'teamA' : 'teamB';
    const scoreKey = team === 'A' ? 'scoreA' : 'scoreB';
    let newScore = editState[scoreKey] + delta;
    if (newScore < 0) newScore = 0;
    // Count current goals for this team
    const teamGoals = editState.goals.filter((g: any) => g.team === editState[teamKey]);
    if (delta > 0) {
      // Need to add a goal
      setEditGoalTeam(editState[teamKey]);
      setEditGoalIndex(null);
      setEditGoalScorer(null);
      setEditGoalAssister(null);
      setEditGoalDialogOpen(true);
      setPendingScoreTeam(team); // Track which team is pending
      // We'll add the goal after the dialog
      setEditState((prev: any) => ({ ...prev, [scoreKey]: newScore }));
    } else if (delta < 0 && teamGoals.length > 0) {
      // Remove last goal for this team
      const lastGoalIdx = editState.goals.map((g: any) => g.team).lastIndexOf(editState[teamKey]);
      if (lastGoalIdx !== -1) {
        const newGoals = [...editState.goals];
        newGoals.splice(lastGoalIdx, 1);
        setEditState((prev: any) => ({ ...prev, [scoreKey]: newScore, goals: newGoals }));
      } else {
        setEditState((prev: any) => ({ ...prev, [scoreKey]: newScore }));
      }
    }
  }

  // Add/edit goal dialog handlers
  function openEditGoalDialog(team: string, index: number | null = null) {
    setEditGoalTeam(team);
    setEditGoalIndex(index);
    if (index !== null) {
      const goal = editState.goals[index];
      setEditGoalScorer(players.find((p: any) => p.id === goal.scorerId) || null);
      setEditGoalAssister(players.find((p: any) => p.id === goal.assistId) || null);
    } else {
      setEditGoalScorer(null);
      setEditGoalAssister(null);
    }
    setEditGoalDialogOpen(true);
  }
  function handleSaveGoal() {
    if (!editGoalTeam || !editGoalScorer) return;
    const newGoal = {
      scorerId: editGoalScorer.id,
      assistId: editGoalAssister?.id || null,
      team: editGoalTeam,
      timestamp: Date.now(),
    };
    let newGoals = [...editState.goals];
    if (editGoalIndex !== null) {
      newGoals[editGoalIndex] = newGoal;
    } else {
      newGoals.push(newGoal);
    }
    setEditState((prev: any) => ({ ...prev, goals: newGoals }));
    setEditGoalDialogOpen(false);
    setPendingScoreTeam(null); // Clear pending
  }
  function handleDeleteGoal(index: number) {
    let newGoals = [...editState.goals];
    const removedGoal = newGoals[index];
    newGoals.splice(index, 1);
    // Update the score for the relevant team
    let newScoreA = editState.scoreA;
    let newScoreB = editState.scoreB;
    if (removedGoal.team === editState.teamA) {
      newScoreA = newGoals.filter((g: any) => g.team === editState.teamA).length;
    }
    if (removedGoal.team === editState.teamB) {
      newScoreB = newGoals.filter((g: any) => g.team === editState.teamB).length;
    }
    setEditState((prev: any) => ({ ...prev, goals: newGoals, scoreA: newScoreA, scoreB: newScoreB }));
  }

  // Validation: Save enabled only if goals match scores
  const teamAGoals = editState ? editState.goals.filter((g: any) => g.team === editState.teamA).length : 0;
  const teamBGoals = editState ? editState.goals.filter((g: any) => g.team === editState.teamB).length : 0;
  const canSaveEdit = editState && editState.scoreA === teamAGoals && editState.scoreB === teamBGoals;

  // Save logic
  async function handleSaveEdit() {
    if (!miniGameToEdit || !editState || !gameDay?.id) return;
    setSavingEdit(true);
    try {
      const batch = writeBatch(db);
      // 1. Update mini-game in gameDays
      const gameDayRef = doc(db, 'gameDays', gameDay.id);
      const gameDaySnap = await getDoc(gameDayRef);
      if (!gameDaySnap.exists()) throw new Error('Game day not found');
      const data = gameDaySnap.data();
      const miniGames = Array.isArray(data.miniGames) ? data.miniGames : [];
      const updatedMiniGames = miniGames.map((g: any) => g.id === miniGameToEdit.id ? { ...editState } : g);
      batch.update(gameDayRef, { miniGames: updatedMiniGames });
      // 2. Update player stats: recalculate all goals/assists for all players in this mini-game
      // First, get all player IDs affected
      const oldGoals = miniGameToEdit.goals || [];
      const newGoals = editState.goals;
      const playerIds = Array.from(new Set([
        ...oldGoals.map((g: any) => g.scorerId),
        ...oldGoals.map((g: any) => g.assistId),
        ...newGoals.map((g: any) => g.scorerId),
        ...newGoals.map((g: any) => g.assistId),
      ].filter(Boolean)));
      for (const playerId of playerIds) {
        const playerRef = doc(db, 'players', playerId);
        const playerSnap = await getDoc(playerRef);
        if (playerSnap.exists()) {
          const playerData = playerSnap.data();
          // Count old and new goals/assists for this player in this mini-game
          const oldGoalsCount = oldGoals.filter((g: any) => g.scorerId === playerId).length;
          const oldAssistsCount = oldGoals.filter((g: any) => g.assistId === playerId).length;
          const newGoalsCount = newGoals.filter((g: any) => g.scorerId === playerId).length;
          const newAssistsCount = newGoals.filter((g: any) => g.assistId === playerId).length;
          const currentGoals = playerData.goals || 0;
          const currentAssists = playerData.assists || 0;
          batch.update(playerRef, {
            goals: Math.max(0, currentGoals - oldGoalsCount + newGoalsCount),
            assists: Math.max(0, currentAssists - oldAssistsCount + newAssistsCount),
          });
        }
      }
      await batch.commit();
      showToast('המיני-משחק עודכן בהצלחה', 'success');
      setEditDialogOpen(false);
      setMiniGameToEdit(null);
      setEditState(null);
    } catch (error) {
      console.error('Error saving mini-game edit:', error);
      showToast('שגיאה בעדכון המיני-משחק', 'error');
    } finally {
      setSavingEdit(false);
    }
  }

  const allMiniGamesComplete = miniGames.length > 0 && miniGames.every((g: any) => g.status === 'complete');

  async function handleCompleteGameNight() {
    if (!gameDay?.id) return;
    
    setCompletingGame(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Update game night status to complete
      const gameDayRef = doc(db, 'gameDays', gameDay.id);
      batch.update(gameDayRef, { 
        status: 3, // 3 = completed
        completedAt: serverTimestamp()
      });
      
      // 2. Update player stats for all players in this game night
      const allPlayerIds = new Set<string>();
      
      // Collect all player IDs from teams
      Object.values(gameDay.teams || {}).forEach((team: any) => {
        if (Array.isArray(team.players)) {
          team.players.forEach((playerId: string) => allPlayerIds.add(playerId));
        }
      });
      
      // Calculate stats for each player
      for (const playerId of allPlayerIds) {
        const playerRef = doc(db, 'players', playerId);
        const playerSnap = await getDoc(playerRef);
        
        if (playerSnap.exists()) {
          const playerData = playerSnap.data();
          
          // Count goals and assists for this player in this game night
          let goalsInGame = 0;
          let assistsInGame = 0;
          let winsInGame = 0;
          
          miniGames.forEach((miniGame: any) => {
            if (miniGame.status === 'complete') {
              // Count goals
              miniGame.goals?.forEach((goal: any) => {
                if (goal.scorerId === playerId) goalsInGame++;
                if (goal.assistId === playerId) assistsInGame++;
              });
              
              // Count wins
              const playerTeam = Object.keys(gameDay.teams || {}).find(teamKey => 
                gameDay.teams[teamKey].players?.includes(playerId)
              );
              if (playerTeam) {
                if ((miniGame.teamA === playerTeam && miniGame.scoreA > miniGame.scoreB) ||
                    (miniGame.teamB === playerTeam && miniGame.scoreB > miniGame.scoreA)) {
                  winsInGame++;
                }
              }
            }
          });
          
          // Update player stats
          const currentStats = {
            totalGoals: playerData.totalGoals || 0,
            totalAssists: playerData.totalAssists || 0,
            totalWins: playerData.totalWins || 0,
            totalGameNights: playerData.totalGameNights || 0,
            totalMiniGames: playerData.totalMiniGames || 0
          };
          
          batch.update(playerRef, {
            totalGoals: currentStats.totalGoals + goalsInGame,
            totalAssists: currentStats.totalAssists + assistsInGame,
            totalWins: currentStats.totalWins + winsInGame,
            totalGameNights: currentStats.totalGameNights + 1,
            totalMiniGames: currentStats.totalMiniGames + miniGames.filter((g: any) => g.status === 'complete').length
          });
        }
      }
      
      await batch.commit();
      
      showToast('ערב המשחק הושלם בהצלחה!', 'success');
      
      // Redirect to admin page after a short delay
      setTimeout(() => {
        router.push('/admin');
      }, 1500);
      
    } catch (error) {
      console.error('Error completing game night:', error);
      showToast('שגיאה בהשלמת ערב המשחק', 'error');
    } finally {
      setCompletingGame(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4 }}>
      <Typography variant="h4" fontWeight={900} color="primary" align="center" gutterBottom>
        {isEditCompleted ? 'ערוך ערב משחק שהסתיים' : 'ניהול משחק חי'}
      </Typography>
      {/* Complete Game Night Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Tooltip
          title={isEditCompleted ? '' : (allMiniGamesComplete ? '' : 'כל המיני-משחקים חייבים להסתיים לפני שניתן להשלים את ערב המשחק')}
          arrow
          disableHoverListener={isEditCompleted ? true : allMiniGamesComplete}
        >
          <span>
            <Button
              variant="contained"
              color="success"
              disabled={isEditCompleted ? completingGame : (!allMiniGamesComplete || completingGame)}
              onClick={isEditCompleted ? handleSaveEdit : handleCompleteGameNight}
              sx={{ fontWeight: 700, fontSize: 18, px: 4 }}
            >
              {completingGame ? (isEditCompleted ? 'שומר...' : 'משלים...') : (isEditCompleted ? 'שמור שינויים' : 'השלם ערב משחק')}
            </Button>
          </span>
        </Tooltip>
      </Box>
      {/* Game night stats summary - modern card grid */}
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
                      {`קבוצת ${getTeamDisplayName(teamObj)}`}
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
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              מיני-משחקים
            </Typography>
            <Button variant="contained" color="primary" onClick={() => setMiniGameDialogOpen(true)} disabled={hasActiveGame}>
              צור מיני-משחק חדש
            </Button>
          </Box>
          {Array.isArray(gameDay.miniGames) && gameDay.miniGames.length > 0 ? (
            <Box>
              {[...gameDay.miniGames].reverse().map((mini: any, idx: number) => (
                isMobile ? (
                  // MOBILE LAYOUT
                  <Box key={mini.id || idx} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {/* Team A: captain + score, goals */}
                      <Box sx={{ textAlign: 'center', mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {`קבוצת ${getPlayerName(gameDay.teams?.[mini.teamA]?.captain || mini.teamA)} ${mini.scoreA}`}
                        </Typography>
                        {(mini.goals || []).filter((g: any) => g.team === mini.teamA).map((g: any, i: number) => {
                          const scorer = players.find((p: any) => p.id === g.scorerId)?.name || g.scorerId;
                          const assist = g.assistId ? (players.find((p: any) => p.id === g.assistId)?.name || g.assistId) : null;
                          return (
                            <Typography key={i} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.92rem', textAlign: 'center', mt: 0.2 }}>
                              {assist ? `${scorer} (${assist})` : scorer}
                            </Typography>
                          );
                        })}
                      </Box>
                      {/* Space between teams */}
                      <Box sx={{ height: 12 }} />
                      {/* Team B: captain + score, goals */}
                      <Box sx={{ textAlign: 'center', mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {`קבוצת ${getPlayerName(gameDay.teams?.[mini.teamB]?.captain || mini.teamB)} ${mini.scoreB}`}
                        </Typography>
                        {(mini.goals || []).filter((g: any) => g.team === mini.teamB).map((g: any, i: number) => {
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
                          {mini.status === 'complete' && mini.startTime && mini.endTime ? `משך: ${formatDuration(mini.startTime, mini.endTime)}` : ''}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          סטטוס: {getStatusLabel(mini.status)}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                          <IconButton
                            color="primary"
                            size="medium"
                            onClick={() => openEditDialog(mini)}
                            disabled={mini.status === 'live'}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            size="medium"
                            onClick={() => {
                              setMiniGameToDelete(mini);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={mini.status === 'live'}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      {/* Timer and add goal button */}
                      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                        {(mini.status === 'live' || mini.status === 'pending') && (
                          <GameTimer miniGame={mini} gameDayId={gameDay.id} />
                        )}
                        {mini.status === 'live' && (
                          <Button variant="contained" color="secondary" sx={{ mt: 2 }} onClick={() => { setGoalDialogOpen(true); setGoalMiniGameId(mini.id); }}>
                            הוסף שער
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  // DESKTOP LAYOUT (previous version)
                  <Box key={mini.id || idx} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      {/* Left side: All main game info, stick to left edge */}
                      <Box sx={{ flex: 'none', alignItems: 'flex-end', textAlign: 'right', pr: 0, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
                          <Box sx={{ pr: 0, mr: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', direction: 'rtl' }}>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {`קבוצת ${getPlayerName(gameDay.teams?.[mini.teamA]?.captain || mini.teamA)}`}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', direction: 'rtl' }}>
                              {(mini.goals || []).filter((g: any) => g.team === mini.teamA).map((g: any, i: number) => {
                                const scorer = players.find((p: any) => p.id === g.scorerId)?.name || g.scorerId;
                                const assist = g.assistId ? (players.find((p: any) => p.id === g.assistId)?.name || g.assistId) : null;
                                return (
                                  <Typography key={i} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.95rem', textAlign: 'right' }}>
                                    {assist ? `${scorer} (${assist})` : scorer}
                                  </Typography>
                                );
                              })}
                            </Box>
                          </Box>
                          <Typography variant="h5" fontWeight={900}>
                            {`${mini.scoreA} - ${mini.scoreB}`}
                          </Typography>
                          <Box sx={{ pr: 0, ml: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', direction: 'rtl' }}>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {`קבוצת ${getPlayerName(gameDay.teams?.[mini.teamB]?.captain || mini.teamB)}`}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', direction: 'rtl' }}>
                              {(mini.goals || []).filter((g: any) => g.team === mini.teamB).map((g: any, i: number) => {
                                const scorer = players.find((p: any) => p.id === g.scorerId)?.name || g.scorerId;
                                const assist = g.assistId ? (players.find((p: any) => p.id === g.assistId)?.name || g.assistId) : null;
                                return (
                                  <Typography key={i} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.95rem', textAlign: 'right' }}>
                                    {assist ? `${scorer} (${assist})` : scorer}
                                  </Typography>
                                );
                              })}
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                      {/* Right side: Duration, Status, and Delete Button */}
                      <Box sx={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        {mini.status === 'complete' && mini.startTime && mini.endTime && (
                          <Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '1.1rem', mb: 1 }}>
                            משך: {formatDuration(mini.startTime, mini.endTime)}
                          </Typography>
                        )}
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>סטטוס: {getStatusLabel(mini.status)}</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 1 }}>
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => openEditDialog(mini)}
                            disabled={mini.status === 'live'}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => {
                              setMiniGameToDelete(mini);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={mini.status === 'live'}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>
                    {/* Centered timer and buttons below the right-aligned info */}
                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                      {(mini.status === 'live' || mini.status === 'pending') && (
                        <GameTimer miniGame={mini} gameDayId={gameDay.id} />
                      )}
                      {mini.status === 'live' && (
                        <Button variant="contained" color="secondary" sx={{ mt: 2 }} onClick={() => { setGoalDialogOpen(true); setGoalMiniGameId(mini.id); }}>
                          הוסף שער
                        </Button>
                      )}
                    </Box>
                  </Box>
                )
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">אין מיני-משחקים עדיין</Typography>
          )}
        </CardContent>
      </Card>
      <Dialog open={miniGameDialogOpen} onClose={() => setMiniGameDialogOpen(false)}>
        <DialogTitle>צור מיני-משחק חדש</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <FormControl fullWidth sx={{ minWidth: 120 }}>
              <InputLabel>קבוצה 1</InputLabel>
              <Select value={team1} label="קבוצה 1" onChange={e => setTeam1(e.target.value)}>
                <MenuItem value="" disabled>בחר קבוצה 1</MenuItem>
                {['A', 'B', 'C'].filter(t => t !== team2).map(t => {
                  const teamObj = gameDay.teams?.[t];
                  const captainId = teamObj?.captain;
                  const captainName = captainId ? getPlayerName(captainId) : t;
                  return (
                    <MenuItem key={t} value={t}>{`קבוצת ${captainName}`}</MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ minWidth: 120 }}>
              <InputLabel>קבוצה 2</InputLabel>
              <Select value={team2} label="קבוצה 2" onChange={e => setTeam2(e.target.value)}>
                <MenuItem value="" disabled>בחר קבוצה 2</MenuItem>
                {['A', 'B', 'C'].filter(t => t !== team1).map(t => {
                  const teamObj = gameDay.teams?.[t];
                  const captainId = teamObj?.captain;
                  const captainName = captainId ? getPlayerName(captainId) : t;
                  return (
                    <MenuItem key={t} value={t}>{`קבוצת ${captainName}`}</MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMiniGameDialogOpen(false)} disabled={creatingMiniGame}>ביטול</Button>
          <Button onClick={handleCreateMiniGame} variant="contained" color="primary" disabled={!team1 || !team2 || team1 === team2 || creatingMiniGame}>
            {creatingMiniGame ? 'יוצר...' : 'צור מיני-משחק'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Add Goal Dialog */}
      <Dialog open={goalDialogOpen} onClose={() => setGoalDialogOpen(false)}>
        <DialogTitle>הוסף שער</DialogTitle>
        <DialogContent>
          {(() => {
            if (!Array.isArray(gameDay.miniGames)) return null;
            const mini = gameDay.miniGames.find((g: any) => g.id === goalMiniGameId);
            if (!mini) return null;
            const teamAObj = gameDay.teams?.[mini.teamA];
            const teamBObj = gameDay.teams?.[mini.teamB];
            const teamOptions = [
              { value: mini.teamA, label: `קבוצת ${getTeamDisplayName(teamAObj)}` },
              { value: mini.teamB, label: `קבוצת ${getTeamDisplayName(teamBObj)}` },
            ];
            const selectedTeamObj = goalTeam === mini.teamA ? teamAObj : goalTeam === mini.teamB ? teamBObj : null;
            const playerIds = selectedTeamObj ? selectedTeamObj.players : [];
            const options = players.filter((p: any) => playerIds.includes(p.id));
            return (
              <Box sx={{ mt: 1, minWidth: 300 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>בחר קבוצה</InputLabel>
                  <Select value={goalTeam} label="בחר קבוצה" onChange={e => { setGoalTeam(e.target.value); setScorer(null); setAssister(null); }}>
                    <MenuItem value="" disabled>בחר קבוצה</MenuItem>
                    {teamOptions.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Autocomplete
                  options={options}
                  getOptionLabel={option => option.name}
                  value={scorer}
                  onChange={(_, v) => setScorer(v)}
                  renderInput={params => <TextField {...params} label="מבקיע (חובה) *" required />}
                  sx={{ mb: 2 }}
                  disabled={!goalTeam}
                />
                <Autocomplete
                  options={options}
                  getOptionLabel={option => option.name}
                  value={assister}
                  onChange={(_, v) => setAssister(v)}
                  renderInput={params => <TextField {...params} label="מבשל (אופציונלי)" />}
                  sx={{ mb: 2 }}
                  disabled={!goalTeam}
                />
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={!scorer || !goalTeam || addingGoal}
                    onClick={() => handleAddGoal(mini)}
                  >
                    {addingGoal ? 'מוסיף...' : 'הוסף שער'}
                  </Button>
                  <Button onClick={() => {
                    if (pendingScoreTeam) {
                      // Revert the score increase
                      const scoreKey = pendingScoreTeam === 'A' ? 'scoreA' : 'scoreB';
                      setEditState((prev: any) => ({ ...prev, [scoreKey]: Math.max(0, prev[scoreKey] - 1) }));
                      setPendingScoreTeam(null);
                    }
                    setGoalDialogOpen(false);
                  }} disabled={addingGoal}>ביטול</Button>
                </Box>
              </Box>
            );
          })()}
        </DialogContent>
      </Dialog>
      {/* Delete Mini-Game Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>מחק מיני-משחק</DialogTitle>
        <DialogContent>
          <Typography>
            האם אתה בטוח שברצונך למחוק מיני-משחק זה? פעולה זו אינה הפיכה.
          </Typography>
          {miniGameToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {`קבוצת ${getPlayerName(gameDay.teams?.[miniGameToDelete.teamA]?.captain || miniGameToDelete.teamA)} vs קבוצת ${getPlayerName(gameDay.teams?.[miniGameToDelete.teamB]?.captain || miniGameToDelete.teamB)}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                תוצאה: {miniGameToDelete.scoreA} - {miniGameToDelete.scoreB}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                שערים: {(miniGameToDelete.goals || []).length}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deletingMiniGame}>
            ביטול
          </Button>
          <Button 
            onClick={handleDeleteMiniGame} 
            variant="contained" 
            color="error" 
            disabled={deletingMiniGame}
          >
            {deletingMiniGame ? 'מוחק...' : 'מחק'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Further live management features will go here */}
      <Dialog fullScreen={isMobile} open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ערוך מיני-משחק</DialogTitle>
        <DialogContent>
          {editState && (
            <Box>
              {/* Team names and score steppers */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {`קבוצת ${getPlayerName(gameDay.teams?.[editState.teamA]?.captain || editState.teamA)}`}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                    <Typography variant="h4" color="primary" sx={{ mx: 1 }}>{editState.scoreA}</Typography>
                    <IconButton size="small" onClick={() => handleScoreChange('A', 1)}>
                      <AddIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {`קבוצת ${getPlayerName(gameDay.teams?.[editState.teamB]?.captain || editState.teamB)}`}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                    <Typography variant="h4" color="primary" sx={{ mx: 1 }}>{editState.scoreB}</Typography>
                    <IconButton size="small" onClick={() => handleScoreChange('B', 1)}>
                      <AddIcon />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
              {/* Goals list for both teams */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700}>שערים</Typography>
                {editState.goals.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>אין שערים עדיין</Typography>
                )}
                {editState.goals.map((goal: any, index: number) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, border: '1px solid #eee', borderRadius: 1, p: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {goal.team === editState.teamA ? `קבוצת ${getPlayerName(gameDay.teams?.[editState.teamA]?.captain || editState.teamA)}` : `קבוצת ${getPlayerName(gameDay.teams?.[editState.teamB]?.captain || editState.teamB)}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getPlayerName(goal.scorerId)}
                      </Typography>
                      {goal.assistId && (
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                          ({getPlayerName(goal.assistId)})
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <IconButton size="small" onClick={() => openEditGoalDialog(goal.team, index)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteGoal(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ position: isMobile ? 'sticky' : 'static', bottom: 0, bgcolor: 'background.paper', zIndex: 1 }}>
          <Button onClick={() => setEditDialogOpen(false)} disabled={savingEdit}>
            ביטול
          </Button>
          <Button variant="contained" color="primary" disabled={!canSaveEdit || savingEdit} onClick={handleSaveEdit}>
            {savingEdit ? 'שומר...' : 'שמור'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Add Goal Dialog */}
      <Dialog open={editGoalDialogOpen} onClose={() => setEditGoalDialogOpen(false)} fullScreen={isMobile} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: isMobile ? 22 : undefined, textAlign: isMobile ? 'center' : undefined, mb: isMobile ? 2 : undefined }}>
          הוסף שער
        </DialogTitle>
        <DialogContent sx={{ p: isMobile ? 2 : 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 340, mx: 'auto', mt: 3 }}>
            <FormControl fullWidth sx={{ minWidth: 120 }}>
              <InputLabel>בחר קבוצה</InputLabel>
              <Select value={editGoalTeam || ''} label="בחר קבוצה" disabled>
                {Object.entries(gameDay.teams || {}).map(([teamKey, teamObj]: [string, any]) => (
                  <MenuItem key={teamKey} value={teamKey}>{`קבוצת ${getPlayerName(teamObj?.captain || teamKey)}`}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Autocomplete
              options={editGoalTeam && gameDay.teams?.[editGoalTeam]?.players ? players.filter((p: any) => gameDay.teams[editGoalTeam].players.includes(p.id)) : []}
              getOptionLabel={option => option?.name || ''}
              value={editGoalScorer}
              onChange={(_, v) => setEditGoalScorer(v)}
              renderInput={params => <TextField {...params} label="מבקיע (חובה) *" required sx={{ fontSize: isMobile ? 18 : undefined }} />}
              sx={{ mb: 2, fontSize: isMobile ? 18 : undefined }}
              disabled={!editGoalTeam}
            />
            <Autocomplete
              options={editGoalTeam && gameDay.teams?.[editGoalTeam]?.players ? players.filter((p: any) => gameDay.teams[editGoalTeam].players.includes(p.id)) : []}
              getOptionLabel={option => option?.name || ''}
              value={editGoalAssister}
              onChange={(_, v) => setEditGoalAssister(v)}
              renderInput={params => <TextField {...params} label="מבשל (אופציונלי)" sx={{ fontSize: isMobile ? 18 : undefined }} />}
              sx={{ mb: 2, fontSize: isMobile ? 18 : undefined }}
              disabled={!editGoalTeam}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ position: isMobile ? 'sticky' : 'static', bottom: 0, bgcolor: 'background.paper', zIndex: 1, p: isMobile ? 2 : 3 }}>
          <Button
            variant="contained"
            color="primary"
            disabled={!editGoalScorer || !editGoalTeam}
            onClick={() => {
              handleSaveGoal();
              setEditGoalDialogOpen(false);
            }}
            sx={{ fontSize: isMobile ? 18 : undefined, flex: 1 }}
          >
            {editGoalIndex === null ? 'הוסף שער' : 'עדכן שער'}
          </Button>
          <Button onClick={() => {
            if (pendingScoreTeam) {
              // Revert the score increase
              const scoreKey = pendingScoreTeam === 'A' ? 'scoreA' : 'scoreB';
              setEditState((prev: any) => ({ ...prev, [scoreKey]: Math.max(0, prev[scoreKey] - 1) }));
              setPendingScoreTeam(null);
            }
            setEditGoalDialogOpen(false);
          }} sx={{ fontSize: isMobile ? 18 : undefined, flex: 1 }}>
            ביטול
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 