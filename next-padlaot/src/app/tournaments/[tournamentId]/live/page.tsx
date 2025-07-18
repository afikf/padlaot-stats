'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { Tournament, TournamentTeam, TournamentMiniGame, TOURNAMENT_STATUS_MAP } from '@/types/tournament';
import { getQualifiersFromGroups, generateKnockoutBracket, convertKnockoutBracketForFirestore } from '@/lib/firebase/utils';
import { Box, Typography, Card, CardContent, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel, TextField, IconButton, Tooltip } from '@mui/material';
import { usePlayerStatsCache } from '@/hooks/usePlayerStatsCache';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AdminLayout from '@/app/admin/layout';
import TournamentGameTimer from '@/components/dashboard/TournamentGameTimer';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import TournamentTabs from '@/components/admin/TournamentTabs';
import KnockoutBracket from '@/components/admin/KnockoutBracket';

function getPlayerName(players: any[], id: string) {
  const player = players.find((p) => p.id === id);
  return player ? player.name : id;
}

export default function LiveTournamentPage() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { players, loading: loadingPlayers } = usePlayerStatsCache();

  // Move theme and isMobile hooks to the top
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Mini-game dialog state
  const [miniGameDialogOpen, setMiniGameDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [pitch, setPitch] = useState('');
  const [creatingMiniGame, setCreatingMiniGame] = useState(false);

  // Goal dialog state
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalMiniGameId, setGoalMiniGameId] = useState<string | null>(null);
  const [scorer, setScorer] = useState<any>(null);
  const [assister, setAssister] = useState<any>(null);
  const [goalTeam, setGoalTeam] = useState('');
  const [addingGoal, setAddingGoal] = useState(false);

  // Mini-game live controls
  const [liveMiniGameId, setLiveMiniGameId] = useState<string | null>(null);

  // --- Add state for edit/delete dialogs ---
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [miniGameToEdit, setMiniGameToEdit] = useState<any>(null);
  const [editState, setEditState] = useState<any>(null);
  const [editGoalDialogOpen, setEditGoalDialogOpen] = useState(false);
  const [editGoalTeam, setEditGoalTeam] = useState<string | null>(null);
  const [editGoalIndex, setEditGoalIndex] = useState<number | null>(null);
  const [editGoalScorer, setEditGoalScorer] = useState<any>(null);
  const [editGoalAssister, setEditGoalAssister] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [miniGameToDelete, setMiniGameToDelete] = useState<any>(null);
  const [deletingMiniGame, setDeletingMiniGame] = useState(false);

  // Add state for confirmation dialog
  const [completeGroupDialogOpen, setCompleteGroupDialogOpen] = useState(false);

  // Add state for draw resolution dialog
  const [drawResolutionDialogOpen, setDrawResolutionDialogOpen] = useState(false);
  const [drawMiniGame, setDrawMiniGame] = useState<any>(null);
  const [selectedWinner, setSelectedWinner] = useState<string>('');

  // Knockout mini-game creation state
  const [knockoutMiniGameDialogOpen, setKnockoutMiniGameDialogOpen] = useState(false);
  const [knockoutMatchId, setKnockoutMatchId] = useState<string | null>(null);
  const [knockoutTeamA, setKnockoutTeamA] = useState<string>('');
  const [knockoutTeamB, setKnockoutTeamB] = useState<string>('');
  const [knockoutPitch, setKnockoutPitch] = useState<string>('');
  const [creatingKnockoutMiniGame, setCreatingKnockoutMiniGame] = useState(false);

  // Add state for end tournament dialog
  const [endTournamentDialogOpen, setEndTournamentDialogOpen] = useState(false);
  const [endingTournament, setEndingTournament] = useState(false);

  // Auto-redirect to knockout tab when group stage is completed
  const [activeTab, setActiveTab] = useState<'group' | 'knockout'>('group');

  const miniGames = tournament?.miniGames || [];
  
  // Check if all knockout games are completed
  const knockoutGames = miniGames.filter((g: any) => g.knockoutMatchId);
  const allKnockoutGamesComplete = knockoutGames.length > 0 && knockoutGames.every((g: any) => g.status === 'complete');
  
  // Check if tournament is completed (read-only mode)
  const isTournamentCompleted = tournament?.status === 3; // 3 = completed
  console.log('=== All mini-games:', miniGames.map(m => ({ id: m.id, status: m.status, knockoutMatchId: m.knockoutMatchId })));
  // Add a local state for the timer
  const [liveTimers, setLiveTimers] = useState<Record<string, number>>({});
  useEffect(() => {
    const intervals: Record<string, NodeJS.Timeout> = {};
    miniGames.forEach((mini: any) => {
      if (mini.status === 'live' && mini.startTime) {
        if (!intervals[mini.id]) {
          intervals[mini.id] = setInterval(() => {
            setLiveTimers(prev => ({ ...prev, [mini.id]: Date.now() - mini.startTime }));
          }, 1000);
        }
      } else {
        if (intervals[mini.id]) {
          clearInterval(intervals[mini.id]);
        }
      }
    });
    return () => {
      Object.values(intervals).forEach(clearInterval);
    };
  }, [miniGames]);

  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);
    const ref = doc(db, 'tournaments', tournamentId as string);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const tournamentData = { id: snap.id, ...snap.data() } as Tournament;
        setTournament(tournamentData);
        setError(null);
        

      } else {
        setTournament(null);
        setError('טורניר לא נמצא');
      }
      setLoading(false);
    }, (err) => {
      setError('שגיאה בטעינת הטורניר');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [tournamentId]);

  if (loading || loadingPlayers) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 4, textAlign: 'center', color: 'red' }}>{error}</Box>;
  if (!tournament) return null;

  // --- Stats calculations ---
  const numMiniGames = miniGames.length;
  const allGoals = miniGames.flatMap((g: any) => g.goals || []);
  const totalGoals = allGoals.length;
  const completedGames = miniGames.filter((g: any) => g.status === 'complete' && g.startTime && g.endTime);
  const avgDurationMs = completedGames.length > 0 ? completedGames.reduce((sum: number, g: any) => sum + (new Date(g.endTime).getTime() - new Date(g.startTime).getTime()), 0) / completedGames.length : 0;
  const avgDurationStr = avgDurationMs > 0 ? (() => {
    const totalSeconds = Math.floor(avgDurationMs / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  })() : '-';
  // Top scorer
  const goalsByPlayer: Record<string, number> = {};
  allGoals.forEach((goal: any) => {
    if (!goal.scorerId) return;
    goalsByPlayer[goal.scorerId] = (goalsByPlayer[goal.scorerId] || 0) + 1;
  });
  const topScorerId = Object.keys(goalsByPlayer).sort((a, b) => goalsByPlayer[b] - goalsByPlayer[a])[0];
  const topScorerName = topScorerId ? (getPlayerName(players, topScorerId) + ` (${goalsByPlayer[topScorerId]})`) : '-';
  // Top assister
  const assistsByPlayer: Record<string, number> = {};
  allGoals.forEach((goal: any) => {
    if (!goal.assistId) return;
    assistsByPlayer[goal.assistId] = (assistsByPlayer[goal.assistId] || 0) + 1;
  });
  const topAssistId = Object.keys(assistsByPlayer).sort((a, b) => assistsByPlayer[b] - assistsByPlayer[a])[0];
  const topAssistName = topAssistId ? (getPlayerName(players, topAssistId) + ` (${assistsByPlayer[topAssistId]})`) : '-';

  // Add a Hebrew status map at the top (if not already present)
  const TOURNAMENT_STATUS_MAP_HE: { [key: number]: string } = {
    0: 'טיוטה',
    1: 'קרוב',
    2: 'חי',
    3: 'הושלם',
    4: 'לא הושלם',
  };
  // Restore teamKeys and isTeamBusy for mini-game creation dialog
  const teamKeys = tournament ? Object.keys(tournament.teams) : [];
  function isTeamBusy(teamKey: string) {
    return miniGames.some(mg => (mg.status === 'pending' || mg.status === 'live') && (mg.teamA === teamKey || mg.teamB === teamKey));
  }

  // Restore pitchOptions and isPitchBusy for mini-game creation dialog
  const pitchOptions = tournament ? Array.from({ length: tournament.settings.numberOfPitches }, (_, i) => i + 1) : [];
  function isPitchBusy(pitchNum: number) {
    return miniGames.some(mg => (mg.status === 'pending' || mg.status === 'live') && mg.pitchNumber === pitchNum);
  }

  // Restore handleCreateMiniGame and handleAddGoal
  async function handleCreateMiniGame() {
    if (!tournament || !tournament.id || !team1 || !team2 || team1 === team2 || !pitch) return;
    setCreatingMiniGame(true);
    const newMiniGame: TournamentMiniGame = {
      id: `mini-${Date.now()}`,
      teamA: team1,
      teamB: team2,
      scoreA: 0,
      scoreB: 0,
      goals: [],
      status: 'pending',
      pitchNumber: Number(pitch),
      startTime: null,
      endTime: null,
      group: selectedGroup || undefined,
      isGroupGame: !!selectedGroup,
    };
    try {
      await updateDoc(doc(db, 'tournaments', tournament.id), {
        miniGames: arrayUnion(newMiniGame),
      });
      setMiniGameDialogOpen(false);
      setSelectedGroup('');
      setTeam1('');
      setTeam2('');
      setPitch('');
      // Refetch tournament
      const ref = doc(db, 'tournaments', tournament.id);
      const snap = await getDoc(ref);
      if (snap.exists()) setTournament({ id: snap.id, ...snap.data() } as Tournament);
    } finally {
      setCreatingMiniGame(false);
    }
  }

  async function handleAddGoal(mini: TournamentMiniGame) {
    if (!tournament || !scorer || !goalTeam) {
      console.log('Missing required data for goal:', { tournament: !!tournament, scorer: !!scorer, goalTeam });
      return;
    }
    setAddingGoal(true);
    const goal = {
      scorerId: scorer.id,
      assistId: assister?.id || null,
      team: goalTeam,
      timestamp: Date.now(),
    };
    console.log('Adding goal:', goal);
    // Fetch latest miniGames array
    const ref = doc(db, 'tournaments', tournament.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const miniGames = Array.isArray(data.miniGames) ? data.miniGames : [];
    const updated = miniGames.map((g: any) => {
      if (g.id !== mini.id) return g;
      let scoreA = g.scoreA;
      let scoreB = g.scoreB;
      if (goalTeam === g.teamA) scoreA += 1;
      if (goalTeam === g.teamB) scoreB += 1;
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
    // Refetch tournament
    const snap2 = await getDoc(ref);
    if (snap2.exists()) setTournament({ id: snap2.id, ...snap2.data() } as Tournament);
  }

  // Add handlers for starting and ending a mini-game
  async function handleStartMiniGame(miniId: string) {
    if (!tournament?.id) return;
    const ref = doc(db, 'tournaments', tournament.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const miniGames = Array.isArray(data.miniGames) ? data.miniGames : [];
    const now = Date.now();
    const updatedMiniGames = miniGames.map((g: any) =>
      g.id === miniId ? { ...g, status: 'live', startTime: now } : g
    );
    await updateDoc(ref, { miniGames: updatedMiniGames });
    const snap2 = await getDoc(ref);
    if (snap2.exists()) setTournament({ id: snap2.id, ...snap2.data() } as Tournament);
  }
  async function handleEndMiniGame(miniId: string) {
    if (!tournament?.id) return;
    
    const ref = doc(db, 'tournaments', tournament.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    
    const data = snap.data();
    const miniGames = Array.isArray(data.miniGames) ? data.miniGames : [];
    const now = Date.now();
    
    // Find the mini-game being ended
    const miniGame = miniGames.find((g: any) => g.id === miniId);
    if (!miniGame) return;
    
    // Check if it's a draw (for knockout games)
    if (miniGame.knockoutMatchId && miniGame.scoreA === miniGame.scoreB) {
      // Show draw resolution dialog
      setDrawMiniGame(miniGame);
      setSelectedWinner('');
      setDrawResolutionDialogOpen(true);
      return;
    }
    
    // Update the mini-game to complete
    const updatedMiniGames = miniGames.map((g: any) =>
      g.id === miniId ? { ...g, status: 'complete', endTime: now } : g
    );
    
    // If this is a knockout game, process the advancement
    if (miniGame.knockoutMatchId && tournament.knockoutBracket) {
      // Use the same logic as processCompletedKnockoutGames
      const updatedBracket = { ...tournament.knockoutBracket };
      const winner = miniGame.scoreA > miniGame.scoreB ? miniGame.teamA : miniGame.teamB;
      const loser = miniGame.teamA === winner ? miniGame.teamB : miniGame.teamA;
      
      // Update the match in the bracket
      Object.keys(updatedBracket.rounds).forEach((roundKey) => {
        const round = (updatedBracket.rounds as any)[roundKey];
        if (Array.isArray(round)) {
          round.forEach((match: any) => {
            if (match.id === miniGame.knockoutMatchId) {
              match.winner = winner;
              match.status = 'complete';
            }
          });
        }
      });
      
      // Handle bracket advancement for semi-finals
      if (miniGame.knockoutMatchId.startsWith('semi-') || miniGame.knockoutMatchId === 'round-1-match-1' || miniGame.knockoutMatchId === 'round-1-match-2') {
        // Check if both semi-finals are complete
        const allSemiFinals = miniGames.filter((g: any) => 
          g.knockoutMatchId && g.knockoutMatchId.startsWith('semi-') && g.status === 'complete'
        );
        
        if (allSemiFinals.length === 2) {
          // Both semi-finals are complete, set final teams
          const semiFinalWinners = allSemiFinals.map((g: any) => 
            g.scoreA > g.scoreB ? g.teamA : g.teamB
          );
          
          // Set final teams
          const finalRound = (updatedBracket.rounds as any)['round2'];
          if (finalRound && Array.isArray(finalRound) && finalRound[0]) {
            const final = finalRound[0];
            final.teamA = semiFinalWinners[0];
            final.teamB = semiFinalWinners[1];
          }
          
          // Set third place teams
          const semiFinalLosers = allSemiFinals.map((g: any) => 
            g.scoreA > g.scoreB ? g.teamB : g.teamA
          );
          
          const thirdPlaceRound = (updatedBracket.rounds as any)['round3'];
          if (thirdPlaceRound && Array.isArray(thirdPlaceRound) && thirdPlaceRound[0]) {
            const thirdPlace = thirdPlaceRound[0];
            thirdPlace.teamA = semiFinalLosers[0];
            thirdPlace.teamB = semiFinalLosers[1];
          }
        } else {
          // Only one semi-final complete, just advance the winner
          const finalRound = (updatedBracket.rounds as any)['round2'];
          if (finalRound && Array.isArray(finalRound) && finalRound[0]) {
            const final = finalRound[0];
            if (!final.teamA) {
              final.teamA = winner;
            } else if (!final.teamB) {
              final.teamB = winner;
            }
          }
          
          // Add loser to third place game
          const thirdPlaceRound = (updatedBracket.rounds as any)['round3'];
          if (thirdPlaceRound && Array.isArray(thirdPlaceRound) && thirdPlaceRound[0]) {
            const thirdPlace = thirdPlaceRound[0];
            if (!thirdPlace.teamA) {
              thirdPlace.teamA = loser;
            } else if (!thirdPlace.teamB) {
              thirdPlace.teamB = loser;
            }
          }
        }
      }
      
      // Update both mini-games and bracket
      await updateDoc(ref, { 
        miniGames: updatedMiniGames,
        knockoutBracket: updatedBracket
      });
    } else {
      // Just update mini-games for non-knockout games
      await updateDoc(ref, { miniGames: updatedMiniGames });
    }
    
    // Refetch tournament
    const snap2 = await getDoc(ref);
    if (snap2.exists()) {
      const updatedTournament = { id: snap2.id, ...snap2.data() } as Tournament;
      setTournament(updatedTournament);
    }
  }

  // Add helpers from game night live page
  function getTeamDisplayName(teamObj: any) {
    if (!teamObj || !Array.isArray(teamObj.players) || teamObj.players.length === 0) return 'קבוצה';
    const captainId = teamObj.captain;
    const teamName = captainId ? getPlayerName(players, captainId) : getPlayerName(players, teamObj.players[0]);
    return teamName;
  }
  function getStatusLabel(status: string) {
    switch (status) {
      case 'pending': return 'עומד להתחיל';
      case 'live': return 'חי';
      case 'complete': return 'הסתיים';
      default: return status;
    }
  }

  function getKnockoutPhaseName(matchId: string) {
    if (matchId.startsWith('semi-')) return 'חצי גמר';
    if (matchId === 'final') return 'גמר';
    if (matchId === 'third-place') return 'מקום שלישי';
    return 'נוקאאוט';
  }
  function formatDuration(start: number | string, end: number | string) {
    if (!start || !end) return '';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // --- Edit dialog handlers ---
  function openEditDialog(mini: any) {
    setMiniGameToEdit(mini);
    setEditState({ ...mini, goals: [...(mini.goals || [])] });
    setEditDialogOpen(true);
  }
  function handleScoreChange(team: 'A' | 'B', delta: number) {
    if (!editState) return;
    const teamKey = team === 'A' ? 'teamA' : 'teamB';
    const scoreKey = team === 'A' ? 'scoreA' : 'scoreB';
    let newScore = editState[scoreKey] + delta;
    if (newScore < 0) newScore = 0;
    // Count current goals for this team
    const teamGoals = editState.goals.filter((g: any) => g.team === editState[teamKey]);
    if (delta > 0) {
      setEditGoalTeam(editState[teamKey]);
      setEditGoalIndex(null);
      setEditGoalScorer(null);
      setEditGoalAssister(null);
      setEditGoalDialogOpen(true);
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
  }
  function handleDeleteGoal(index: number) {
    let newGoals = [...editState.goals];
    newGoals.splice(index, 1);
    setEditState((prev: any) => ({ ...prev, goals: newGoals }));
  }
  const teamAGoals = editState ? editState.goals.filter((g: any) => g.team === editState.teamA).length : 0;
  const teamBGoals = editState ? editState.goals.filter((g: any) => g.team === editState.teamB).length : 0;
  const canSaveEdit = editState && editState.scoreA === teamAGoals && editState.scoreB === teamBGoals;
  async function handleSaveEdit() {
    if (!miniGameToEdit || !editState || !tournament?.id) return;
    setSavingEdit(true);
    try {
      const ref = doc(db, 'tournaments', tournament.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('Tournament not found');
      const data = snap.data();
      const miniGames = Array.isArray(data.miniGames) ? data.miniGames : [];
      const updatedMiniGames = miniGames.map((g: any) => g.id === miniGameToEdit.id ? { ...editState } : g);
      await updateDoc(ref, { miniGames: updatedMiniGames });
      setEditDialogOpen(false);
      setMiniGameToEdit(null);
      setEditState(null);
      // Refetch tournament
      const snap2 = await getDoc(ref);
      if (snap2.exists()) setTournament({ id: snap2.id, ...snap2.data() } as Tournament);
    } catch (error) {
      // TODO: show error toast
      setEditDialogOpen(false);
    } finally {
      setSavingEdit(false);
    }
  }
  async function handleDeleteMiniGame() {
    if (!miniGameToDelete || !tournament?.id) return;
    setDeletingMiniGame(true);
    try {
      const ref = doc(db, 'tournaments', tournament.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('Tournament not found');
      const data = snap.data();
      const miniGames = Array.isArray(data.miniGames) ? data.miniGames : [];
      const updatedMiniGames = miniGames.filter((g: any) => g.id !== miniGameToDelete.id);
      
      // If this is a knockout game, also update the bracket to remove winner indication
      let updatedBracket: any = null;
      if (miniGameToDelete.knockoutMatchId && tournament.knockoutBracket) {
        updatedBracket = { ...tournament.knockoutBracket };
        
        // Find and reset the match in the bracket
        Object.keys(updatedBracket.rounds).forEach((roundKey) => {
          const round = (updatedBracket.rounds as any)[roundKey];
          if (Array.isArray(round)) {
            round.forEach((match: any) => {
              if (match.id === miniGameToDelete.knockoutMatchId) {
                // Reset the match to its original state
                match.winner = null;
                match.status = 'pending';
                
                // If this was a semi-final, also reset the final and third place game
                if (miniGameToDelete.knockoutMatchId.startsWith('semi-')) {
                  // Reset final
                  const finalRound = (updatedBracket.rounds as any)['round2'];
                  if (finalRound && Array.isArray(finalRound) && finalRound[0]) {
                    const final = finalRound[0];
                    // Remove the team that was advanced from this semi-final
                    if (final.teamA === miniGameToDelete.teamA || final.teamA === miniGameToDelete.teamB) {
                      final.teamA = null;
                    }
                    if (final.teamB === miniGameToDelete.teamA || final.teamB === miniGameToDelete.teamB) {
                      final.teamB = null;
                    }
                    final.winner = null;
                    final.status = 'pending';
                  }
                  
                  // Reset third place game
                  const thirdPlaceRound = (updatedBracket.rounds as any)['round3'];
                  if (thirdPlaceRound && Array.isArray(thirdPlaceRound) && thirdPlaceRound[0]) {
                    const thirdPlace = thirdPlaceRound[0];
                    // Remove the team that was sent to third place from this semi-final
                    if (thirdPlace.teamA === miniGameToDelete.teamA || thirdPlace.teamA === miniGameToDelete.teamB) {
                      thirdPlace.teamA = null;
                    }
                    if (thirdPlace.teamB === miniGameToDelete.teamA || thirdPlace.teamB === miniGameToDelete.teamB) {
                      thirdPlace.teamB = null;
                    }
                    thirdPlace.winner = null;
                    thirdPlace.status = 'pending';
                  }
                } else if (miniGameToDelete.knockoutMatchId === 'final') {
                  // Reset final
                  const finalRound = (updatedBracket.rounds as any)['round2'];
                  if (finalRound && Array.isArray(finalRound) && finalRound[0]) {
                    const final = finalRound[0];
                    final.winner = null;
                    final.status = 'pending';
                  }
                } else if (miniGameToDelete.knockoutMatchId === 'third-place') {
                  // Reset third place game
                  const thirdPlaceRound = (updatedBracket.rounds as any)['round3'];
                  if (thirdPlaceRound && Array.isArray(thirdPlaceRound) && thirdPlaceRound[0]) {
                    const thirdPlace = thirdPlaceRound[0];
                    thirdPlace.winner = null;
                    thirdPlace.status = 'pending';
                  }
                }
              }
            });
          }
        });
      }
      
      // Update the tournament with both mini-games and bracket changes
      const updateData: any = { miniGames: updatedMiniGames };
      if (updatedBracket) {
        updateData.knockoutBracket = updatedBracket;
      }
      
      await updateDoc(ref, updateData);
      setDeleteDialogOpen(false);
      setMiniGameToDelete(null);
      // Refetch tournament
      const snap2 = await getDoc(ref);
      if (snap2.exists()) setTournament({ id: snap2.id, ...snap2.data() } as Tournament);
    } catch (error) {
      // TODO: show error toast
      setDeleteDialogOpen(false);
    } finally {
      setDeletingMiniGame(false);
    }
  }

  // Find the most recent mini game that is pending or live
  const liveMini = Array.isArray(miniGames)
    ? [...miniGames].reverse().find((g: any) => g.status === 'pending' || g.status === 'live')
    : null;

  // Calculate if all pitches are occupied
  const activeMiniGames = miniGames.filter((g: any) => g.status === 'pending' || g.status === 'live');
  const allPitchesBusy = activeMiniGames.length >= tournament.settings.numberOfPitches;

  function formatMMSS(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // --- UI ---
  console.log('isMobile:', isMobile);
  console.log('miniGames:', miniGames);

  // Before rendering the mini-games list:
  // On mobile, exclude the live mini-game from the main list (it's shown in sticky bar)
  // On desktop, show all mini-games in the main list
  // Also exclude knockout mini-games from group stage tab
  const filteredMiniGames = isMobile 
    ? [...miniGames].reverse().filter((mini: any) => !(liveMini && mini.id === liveMini.id) && !mini.knockoutMatchId)
    : [...miniGames].reverse().filter((mini: any) => !mini.knockoutMatchId);
  console.log('filteredMiniGames (to be rendered as cards):', filteredMiniGames.map(m => ({ id: m.id, status: m.status })));

  // In the sticky bar rendering:
  if (isMobile && liveMini) {
    console.log('RENDERING STICKY BAR', liveMini.id, liveMini.status);
  }

  // Calculate live standings for each group
  const calculateGroupStandings = (group: any) => {
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
    
    // Calculate standings from completed and live games in this group
    const groupGames = miniGames.filter((game: any) => 
      game.group === group.id && (game.status === 'complete' || game.status === 'live')
    );
    
    groupGames.forEach((game: any) => {
      const teamA = standings[game.teamA];
      const teamB = standings[game.teamB];
      
      if (teamA && teamB) {
        // Update games played
        teamA.played++;
        teamB.played++;
        
        // Update goals
        teamA.goalsFor += game.scoreA;
        teamA.goalsAgainst += game.scoreB;
        teamB.goalsFor += game.scoreB;
        teamB.goalsAgainst += game.scoreA;
        
        // Update results
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
    
    // Calculate goal differences
    Object.values(standings).forEach((standing: any) => {
      standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
    });
    
    // Sort teams by points, goal difference, and goals scored
    const sortedStandings = Object.values(standings).sort((a: any, b: any) => {
      // First sort by points (descending)
      if (a.points !== b.points) {
        return b.points - a.points;
      }
      // If points are equal, sort by goal difference (descending)
      if (a.goalDifference !== b.goalDifference) {
        return b.goalDifference - a.goalDifference;
      }
      // If goal difference is equal, sort by goals scored (descending)
      if (a.goalsFor !== b.goalsFor) {
        return b.goalsFor - a.goalsFor;
      }
      // If everything is equal, maintain original order
      return 0;
    });
    
    // Add position based on sorted order
    const orderedStandings = sortedStandings.map((standing: any, index: number) => ({
      ...standing,
      position: index + 1
    }));
    
    return orderedStandings;
  };

  // --- Group Stage Content ---
  const renderGroupTables = () => {
    if (!tournament.groups) return null;
    
    // Sort groups by ID to ensure consistent order
    const sortedGroups = Object.values(tournament.groups).sort((a: any, b: any) => a.id.localeCompare(b.id));
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4, justifyContent: 'center' }}>
        {sortedGroups.map((group: any) => {
          const standings = calculateGroupStandings(group);
          
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
    );
  };

  // Check if all group games are complete and if teams have equal games
  const groupGames = miniGames.filter((g: any) => g.isGroupGame);
  const allGroupGamesComplete = groupGames.every((g: any) => g.status === 'complete');
  
  // Check if all teams have equal number of games
  const teamGameCounts: Record<string, number> = {};
  groupGames.forEach((game: any) => {
    if (game.status === 'complete') {
      teamGameCounts[game.teamA] = (teamGameCounts[game.teamA] || 0) + 1;
      teamGameCounts[game.teamB] = (teamGameCounts[game.teamB] || 0) + 1;
    }
  });
  
  const allTeamsHaveEqualGames = Object.values(tournament.groups || {}).every((group: any) => {
    const groupTeamCounts = group.teams.map((teamKey: string) => teamGameCounts[teamKey] || 0);
    return groupTeamCounts.every((count: number) => count === groupTeamCounts[0]);
  });
  
  const canCompleteGroupStage = allGroupGamesComplete && !tournament.settings.groupStageComplete;

  async function handleCompleteGroupStage() {
    if (allTeamsHaveEqualGames) {
      await completeGroupStageAndGenerateBracket();
    } else {
      setCompleteGroupDialogOpen(true);
    }
  }

  async function completeGroupStageAndGenerateBracket() {
    if (!tournament) return;
    
    try {
      console.log('Starting group stage completion...');
      console.log('Tournament:', tournament);
      console.log('Groups:', tournament.groups);
      console.log('Settings:', tournament.settings);
      
      // Get qualifiers based on current standings
      const qualifiers = getQualifiersFromGroups(tournament, tournament.settings.qualifierDistribution);
      
      // Generate knockout bracket
      const knockoutBracket = generateKnockoutBracket(qualifiers);
      
      // Convert to Firestore-compatible format
      const firestoreBracket = convertKnockoutBracketForFirestore(knockoutBracket);
      
      // Update tournament
      await updateDoc(doc(db, 'tournaments', tournament.id), {
        'settings.groupStageComplete': true,
        'settings.knockoutStageStarted': true,
        knockoutBracket: firestoreBracket
      });
      

      setCompleteGroupDialogOpen(false);
      
      // Auto-redirect to knockout tab
      setActiveTab('knockout');
    } catch (error: any) {
      console.error('Error completing group stage:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      alert(`שגיאה בסיום שלב הבתים: ${error.message || 'Unknown error'}`);
    }
  }

  const groupStageContent = (
    <>
      {renderGroupTables()}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Button
            variant="contained"
            color="primary"
            disabled={!canCompleteGroupStage || isTournamentCompleted}
            onClick={handleCompleteGroupStage}
          >
            סיים שלב בתים
          </Button>
        </Box>
      {/* MOBILE: Floating Action Button for Create New Mini Game (only when no live mini game) */}
      {isMobile && !liveMini && !isTournamentCompleted && (
        <Box sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 2001,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
        }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setMiniGameDialogOpen(true)}
            sx={{
              borderRadius: '50%',
              minWidth: 64,
              minHeight: 64,
              width: 64,
              height: 64,
              boxShadow: 4,
              p: 0,
              fontSize: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AddIcon sx={{ fontSize: 36 }} />
          </Button>
        </Box>
      )}
      {/* MOBILE: Sticky bar for live or pending mini-game (pixel-perfect parity with game night) */}
      {isMobile && liveMini && (
        <Box
          data-testid="tournament-sticky-bar"
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
          <Box key={liveMini.id} sx={{
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
                  {`קבוצת ${getTeamDisplayName(tournament.teams?.[liveMini.teamA])} ${liveMini.scoreA}`}
                </Typography>
                {(liveMini.goals || []).filter((g: any) => g.team === liveMini.teamA).map((g: any, i: number) => {
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
                  {`קבוצת ${getTeamDisplayName(tournament.teams?.[liveMini.teamB])} ${liveMini.scoreB}`}
                </Typography>
                {(liveMini.goals || []).filter((g: any) => g.team === liveMini.teamB).map((g: any, i: number) => {
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
                  {liveMini.status === 'complete' && liveMini.startTime && liveMini.endTime ? `משך: ${formatDuration(liveMini.startTime, liveMini.endTime)}` : ''}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  סטטוס: {getStatusLabel(liveMini.status)}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                  {/* Only show edit/delete when not live and tournament is not completed */}
                  {!isTournamentCompleted && (
                    <>
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => openEditDialog(liveMini)}
                        disabled={liveMini.status === 'live'}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => {
                          setMiniGameToDelete(liveMini);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={liveMini.status === 'live'}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </Box>
              </Box>
              {/* Timer */}
              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                {(liveMini.status === 'live' || liveMini.status === 'pending') && (
                  <TournamentGameTimer
                    miniGame={liveMini}
                    tournamentId={tournament.id}
                    onAddGoal={liveMini.status === 'live' ? () => { setGoalDialogOpen(true); setGoalMiniGameId(liveMini.id); } : undefined}
                  />
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
      <Box sx={{ maxWidth: 900, mx: 'auto', py: 4, position: 'relative' }}>
        <Typography variant="h4" fontWeight={900} color="primary" align="center" gutterBottom>
          ניהול טורניר חי
        </Typography>
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={700}>
            תאריך: {tournament.date} | סטטוס: {TOURNAMENT_STATUS_MAP_HE[tournament.status] || tournament.status}
          </Typography>
        </Box>
        {/* Stats summary - modern card grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
          <Card sx={{ borderRadius: 3, textAlign: 'center', bgcolor: 'background.paper', boxShadow: 2 }}>
            <CardContent>
              <Typography variant="h6" color="primary" fontWeight={700}>{numMiniGames}</Typography>
              <Typography variant="body2" color="text.secondary">מספר מיני-משחקים</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>סה"כ שערים: {totalGoals}</Typography>
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
              <Typography variant="body2" color="text.secondary">מלך השערים</Typography>
              <Typography variant="h6" fontWeight={700} color="primary">{topScorerName}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 3, textAlign: 'center', bgcolor: 'background.paper', boxShadow: 2 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">מלך הבישולים</Typography>
              <Typography variant="h6" fontWeight={700} color="primary">{topAssistName}</Typography>
            </CardContent>
          </Card>
        </Box>
        {/* Mini-Games List */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              מיני-משחקים
            </Typography>
            {tournament.status === 2 && !isTournamentCompleted && (
              <Tooltip
                title={allPitchesBusy ? 'שני מגרשים פעילים, סיים משחק כדי ליצור חדש' : ''}
                arrow
                disableHoverListener={!allPitchesBusy}
              >
                <span>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setMiniGameDialogOpen(true)}
                    disabled={allPitchesBusy}
                  >
                    צור מיני-משחק חדש
                  </Button>
                </span>
              </Tooltip>
            )}
          </Box>
          {/* The rest of the mini-games, excluding the live/pending one on mobile */}
          {filteredMiniGames.length === 0 ? (
            <Typography variant="body2" color="text.secondary">אין מיני-משחקים עדיין</Typography>
          ) : (
            <Box>
              {filteredMiniGames.map((mini: any, idx: number) => (
                <Card sx={{ 
                  mb: 2, 
                  p: 2, 
                  border: mini.knockoutMatchId ? '2px solid #d32f2f' : '2px solid #1976d2', 
                  borderRadius: 3, 
                  bgcolor: mini.knockoutMatchId ? '#ffebee' : 'background.paper', 
                  boxShadow: 2, 
                  width: '100%', 
                  maxWidth: 600, 
                  mx: 'auto',
                  position: 'relative'
                }} key={mini.id || idx}>
                  {/* Phase Badge */}
                  {mini.knockoutMatchId && (
                    <Box sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: '#d32f2f',
                      color: 'white',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      zIndex: 1
                    }}>
                      {getKnockoutPhaseName(mini.knockoutMatchId)}
                    </Box>
                  )}
                  {mini.group && (
                    <Box sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: '#1976d2',
                      color: 'white',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      zIndex: 1
                    }}>
                      בית {mini.group}
                    </Box>
                  )}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' }, 
                    justifyContent: 'space-between', 
                    alignItems: { xs: 'stretch', sm: 'flex-start' },
                    pt: (mini.knockoutMatchId || mini.group) ? 3 : 0 // Add top padding when badge is present
                  }}>
                    {/* Left side: Team A */}
                    <Box sx={{ flex: 'none', alignItems: 'flex-end', textAlign: 'right', pr: 0, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Box sx={{ pr: 0, mr: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', direction: 'rtl' }}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {`קבוצת ${getTeamDisplayName(tournament.teams?.[mini.teamA])}`}
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', direction: 'rtl' }}>
                            {(mini.goals || []).filter((g: any) => g.team === mini.teamA).map((g: any, i: number) => {
                              const scorer = getPlayerName(players, g.scorerId);
                              const assist = g.assistId ? getPlayerName(players, g.assistId) : null;
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
                            {`קבוצת ${getTeamDisplayName(tournament.teams?.[mini.teamB])}`}
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', direction: 'rtl' }}>
                            {(mini.goals || []).filter((g: any) => g.team === mini.teamB).map((g: any, i: number) => {
                              const scorer = getPlayerName(players, g.scorerId);
                              const assist = g.assistId ? getPlayerName(players, g.assistId) : null;
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
                    {/* Right side: Duration, Status, Pitch, and Action Buttons */}
                    <Box sx={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      {mini.status === 'complete' && mini.startTime && mini.endTime && (
                        <Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '1.1rem', mb: 1 }}>
                          משך: {formatDuration(mini.startTime, mini.endTime)}
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>סטטוס: {getStatusLabel(mini.status)}</Typography>
                      {mini.pitchNumber && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>מגרש: {mini.pitchNumber}</Typography>
                      )}
                      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 1 }}>
                        {/* Only show edit/delete when not live and tournament is not completed */}
                        {!isTournamentCompleted && (
                          <>
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
                          </>
                        )}
                      </Box>
                    </Box>
                  </Box>
                  {/* Centered timer and buttons below the right-aligned info */}
                  <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                    {/* Timer display only */}
                    {mini.status === 'live' && mini.startTime && (
                      <Typography variant="h2" fontWeight={900} color="primary" sx={{ mb: 2, fontFamily: 'monospace' }}>
                        {formatMMSS(liveTimers[mini.id] ?? Date.now() - mini.startTime)}
                      </Typography>
                    )}
                    {mini.status === 'pending' && (
                      <Button data-testid="list-start-game" variant="contained" color="success" sx={{ mt: 2 }} onClick={() => handleStartMiniGame(mini.id)}>
                        התחל משחק (B)
                      </Button>
                    )}
                    {mini.status === 'live' && (
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 2 }}>
                        <Button variant="contained" color="secondary" onClick={() => { 
                          setGoalDialogOpen(true); 
                          setGoalMiniGameId(mini.id);
                          setGoalTeam('');
                          setScorer(null);
                          setAssister(null);
                        }}>
                          הוסף שער
                        </Button>
                        <Button variant="contained" color="error" onClick={() => handleEndMiniGame(mini.id)}>
                          סיים משחק
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Card>
              ))}
            </Box>
          )}
        </Box>
        {/* Mini-Game Creation Dialog */}
        <Dialog open={miniGameDialogOpen} onClose={() => setMiniGameDialogOpen(false)} maxWidth="xs" fullWidth container={typeof window !== 'undefined' ? document.body : undefined} PaperProps={{ sx: { zIndex: 3000 } }}>
          <DialogTitle>צור מיני-משחק חדש</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', gap: 2, mt: 1, flexDirection: 'column' }}>
              <FormControl fullWidth sx={{ minWidth: 120 }}>
                <InputLabel>בית</InputLabel>
                <Select value={selectedGroup} label="בית" onChange={e => {
                  setSelectedGroup(e.target.value);
                  setTeam1('');
                  setTeam2('');
                }}>
                  <MenuItem value="" disabled>בחר בית</MenuItem>
                  {Object.keys(tournament.groups || {}).map(groupId => (
                    <MenuItem key={groupId} value={groupId}>בית {groupId}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ minWidth: 120 }}>
                <InputLabel>קבוצה 1</InputLabel>
                <Select value={team1} label="קבוצה 1" onChange={e => setTeam1(e.target.value)} disabled={!selectedGroup}>
                  <MenuItem value="" disabled>בחר קבוצה 1</MenuItem>
                  {(() => {
                    if (!selectedGroup) return [];
                    const groupTeams = tournament.groups[selectedGroup]?.teams || [];
                    return groupTeams.filter(t => t !== team2 && !isTeamBusy(t)).map(t => {
                      const teamObj = tournament.teams[t];
                      const captainId = teamObj?.captain;
                      const captainName = captainId ? getPlayerName(players, captainId) : t;
                      return (
                        <MenuItem key={t} value={t}>{`קבוצת ${captainName}`}</MenuItem>
                      );
                    });
                  })()}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ minWidth: 120 }}>
                <InputLabel>קבוצה 2</InputLabel>
                <Select value={team2} label="קבוצה 2" onChange={e => setTeam2(e.target.value)} disabled={!selectedGroup}>
                  <MenuItem value="" disabled>בחר קבוצה 2</MenuItem>
                  {(() => {
                    if (!selectedGroup) return [];
                    const groupTeams = tournament.groups[selectedGroup]?.teams || [];
                    return groupTeams.filter(t => t !== team1 && !isTeamBusy(t)).map(t => {
                      const teamObj = tournament.teams[t];
                      const captainId = teamObj?.captain;
                      const captainName = captainId ? getPlayerName(players, captainId) : t;
                      return (
                        <MenuItem key={t} value={t}>{`קבוצת ${captainName}`}</MenuItem>
                      );
                    });
                  })()}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ minWidth: 120 }}>
                <InputLabel>מגרש</InputLabel>
                <Select value={pitch} label="מגרש" onChange={e => setPitch(e.target.value)}>
                  <MenuItem value="" disabled>בחר מגרש</MenuItem>
                  {pitchOptions.filter(p => !isPitchBusy(p)).map(p => (
                    <MenuItem key={p} value={p}>{`מגרש ${p}`}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMiniGameDialogOpen(false)} disabled={creatingMiniGame}>ביטול</Button>
            <Button onClick={handleCreateMiniGame} variant="contained" color="primary" disabled={!selectedGroup || !team1 || !team2 || team1 === team2 || !pitch || creatingMiniGame}>
              {creatingMiniGame ? 'יוצר...' : 'צור מיני-משחק'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Complete Group Stage Confirmation Dialog */}
        <Dialog open={completeGroupDialogOpen} onClose={() => setCompleteGroupDialogOpen(false)} maxWidth="xs" fullWidth container={typeof window !== 'undefined' ? document.body : undefined} PaperProps={{ sx: { zIndex: 3000 } }}>
          <DialogTitle>סיים שלב בתים</DialogTitle>
          <DialogContent>
            <Typography>
              חלק מהקבוצות שיחקו מספר משחקים שונה. האם אתה בטוח שברצונך לסיים את שלב הבתים?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCompleteGroupDialogOpen(false)}>ביטול</Button>
            <Button onClick={completeGroupStageAndGenerateBracket} variant="contained" color="primary">סיים שלב בתים</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );

  // Knockout mini-game creation handlers
  function handleCreateKnockoutMiniGame(matchId: string, teamA: string, teamB: string) {
    setKnockoutMatchId(matchId);
    setKnockoutTeamA(teamA);
    setKnockoutTeamB(teamB);
    setKnockoutPitch('');
    setKnockoutMiniGameDialogOpen(true);
  }

  async function handleCreateKnockoutMiniGameSubmit() {
    if (!tournament?.id || !knockoutMatchId || !knockoutTeamA || !knockoutTeamB || !knockoutPitch) return;
    
    setCreatingKnockoutMiniGame(true);
    const newMiniGame: TournamentMiniGame = {
      id: `knockout-${Date.now()}`,
      teamA: knockoutTeamA,
      teamB: knockoutTeamB,
      scoreA: 0,
      scoreB: 0,
      goals: [],
      status: 'pending',
      pitchNumber: Number(knockoutPitch),
      startTime: null,
      endTime: null,
      knockoutMatchId: knockoutMatchId,
      isGroupGame: false,
    };
    
    try {
      // Fetch latest tournament data
      const ref = doc(db, 'tournaments', tournament.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('Tournament not found');
      
      const data = snap.data();
      const miniGames = Array.isArray(data.miniGames) ? data.miniGames : [];
      
      // Add the new mini-game
      await updateDoc(ref, {
        miniGames: arrayUnion(newMiniGame),
      });
      
      // Refetch tournament to update the UI
      const snap2 = await getDoc(ref);
      if (snap2.exists()) setTournament({ id: snap2.id, ...snap2.data() } as Tournament);
      
      setKnockoutMiniGameDialogOpen(false);
      setKnockoutMatchId(null);
      setKnockoutTeamA('');
      setKnockoutTeamB('');
      setKnockoutPitch('');
    } catch (error) {
      console.error('Error creating knockout mini-game:', error);
      alert('שגיאה ביצירת משחק נוקאאוט');
    } finally {
      setCreatingKnockoutMiniGame(false);
    }
  }

  async function handleDrawResolution() {
    if (!selectedWinner || !drawMiniGame || !tournament?.id) return;
    
    const ref = doc(db, 'tournaments', tournament.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const miniGames = Array.isArray(data.miniGames) ? data.miniGames : [];
    const now = Date.now();
    
    // Update the mini-game with the selected winner
    const updatedMiniGames = miniGames.map((g: any) =>
      g.id === drawMiniGame.id ? { ...g, status: 'complete', endTime: now } : g
    );
    
    // Update the bracket with the winner
    if (tournament.knockoutBracket) {
      const updatedBracket = { ...tournament.knockoutBracket };
      
      // Find and update the match in the Firestore bracket structure
      Object.keys(updatedBracket.rounds).forEach((roundKey) => {
        const round = (updatedBracket.rounds as any)[roundKey];
        if (Array.isArray(round)) {
          round.forEach((match: any) => {
            if (match.id === drawMiniGame.knockoutMatchId) {
              match.winner = selectedWinner;
              match.status = 'complete';
            }
          });
        }
      });
      
      // Handle bracket advancement for 4-team tournament
      if (drawMiniGame.knockoutMatchId.startsWith('semi-')) {
        console.log('Processing semi-final advancement for draw resolution:', drawMiniGame.knockoutMatchId);
        console.log('Selected winner:', selectedWinner);
        
        // Find the current match
        let currentMatch = null;
        Object.keys(updatedBracket.rounds).forEach((roundKey) => {
          const round = (updatedBracket.rounds as any)[roundKey];
          if (Array.isArray(round)) {
            const match = round.find((m: any) => m.id === drawMiniGame.knockoutMatchId);
            if (match) currentMatch = match;
          }
        });
        
        const loser = drawMiniGame.teamA === selectedWinner ? drawMiniGame.teamB : drawMiniGame.teamA;
        console.log('Loser:', loser);
        
        if (currentMatch) {
          // Advance winner to final (round2)
          const finalRound = (updatedBracket.rounds as any)['round2'];
          console.log('Final round before draw resolution update:', finalRound);
          if (finalRound && Array.isArray(finalRound) && finalRound[0]) {
            const final = finalRound[0];
            if (!final.teamA) {
              final.teamA = selectedWinner;
              console.log('Set final.teamA to:', selectedWinner);
            } else if (!final.teamB) {
              final.teamB = selectedWinner;
              console.log('Set final.teamB to:', selectedWinner);
            }
          }
          console.log('Final round after draw resolution update:', finalRound);
          
          // Add loser to third place game (round3)
          const thirdPlaceRound = (updatedBracket.rounds as any)['round3'];
          console.log('Third place round before draw resolution update:', thirdPlaceRound);
          if (thirdPlaceRound && Array.isArray(thirdPlaceRound) && thirdPlaceRound[0]) {
            const thirdPlace = thirdPlaceRound[0];
            if (!thirdPlace.teamA) {
              thirdPlace.teamA = loser;
              console.log('Set thirdPlace.teamA to:', loser);
            } else if (!thirdPlace.teamB) {
              thirdPlace.teamB = loser;
              console.log('Set thirdPlace.teamB to:', loser);
            }
          }
          console.log('Third place round after draw resolution update:', thirdPlaceRound);
        }
        
        console.log('Updated bracket after draw resolution:', updatedBracket);
      } else if (drawMiniGame.knockoutMatchId === 'final') {
        // Final completed - tournament is done
        console.log('Tournament final completed!');
      } else if (drawMiniGame.knockoutMatchId === 'third-place') {
        // Third place game completed
        console.log('Third place game completed!');
      }
      
      await updateDoc(ref, { 
        miniGames: updatedMiniGames,
        knockoutBracket: updatedBracket
      });
    } else {
      await updateDoc(ref, { miniGames: updatedMiniGames });
    }
    
    // Close dialog and reset state
    setDrawResolutionDialogOpen(false);
    setDrawMiniGame(null);
    setSelectedWinner('');
    
    // Refetch tournament
    const snap2 = await getDoc(ref);
    if (snap2.exists()) setTournament({ id: snap2.id, ...snap2.data() } as Tournament);
  }

  async function handleEndTournament() {
    if (!tournament?.id) return;
    
    setEndingTournament(true);
    try {
      await updateDoc(doc(db, 'tournaments', tournament.id), {
        status: 3 // 3 = completed
      });
      
      setEndTournamentDialogOpen(false);
      
      // Refetch tournament to update the UI
      const ref = doc(db, 'tournaments', tournament.id);
      const snap = await getDoc(ref);
      if (snap.exists()) setTournament({ id: snap.id, ...snap.data() } as Tournament);
    } catch (error) {
      console.error('Error ending tournament:', error);
      alert('שגיאה בסיום הטורניר');
    } finally {
      setEndingTournament(false);
    }
  }

  function handleUpdateKnockoutMatch(matchId: string, winner: string) {
    // This will be called when a knockout game ends
    console.log('Updating knockout match:', matchId, 'winner:', winner);
    // TODO: Update the bracket with the winner advancing to next round
  }





  // --- Knockout Content ---
  const knockoutContent = (
    <>
      {/* End Tournament Button - only show if all knockout games are complete and tournament is not already completed */}
      {allKnockoutGamesComplete && !isTournamentCompleted && (
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Button
            variant="contained"
            color="success"
            size="large"
            onClick={() => setEndTournamentDialogOpen(true)}
            sx={{ fontSize: '1.1rem', px: 4, py: 1.5 }}
          >
            סיים טורניר
          </Button>
        </Box>
      )}
      
      <KnockoutBracket
        tournament={tournament}
        miniGames={miniGames}
        players={players}
        onCreateMiniGame={handleCreateKnockoutMiniGame}
        onUpdateMatch={handleUpdateKnockoutMatch}
      />
      
      {/* Knockout Mini-Games List */}
      <Box sx={{ maxWidth: 900, mx: 'auto', py: 4, position: 'relative' }}>
        <Typography variant="h4" fontWeight={900} color="primary" align="center" gutterBottom>
          משחקי נוקאאוט
        </Typography>
        
        {/* Filter mini-games to show only knockout games, newest first */}
        {(() => {
          const knockoutMiniGames = [...miniGames]
            .filter((g: any) => g.knockoutMatchId)
            .reverse(); // Newest games first
          
          if (knockoutMiniGames.length === 0) {
            return (
              <Typography variant="body2" color="text.secondary" textAlign="center">
                אין משחקי נוקאאוט עדיין
              </Typography>
            );
          }
          
          return (
            <Box>
              {knockoutMiniGames.map((mini: any, idx: number) => (
                <Card sx={{ 
                  mb: 2, 
                  p: 2, 
                  border: '2px solid #d32f2f', 
                  borderRadius: 3, 
                  bgcolor: '#ffebee', 
                  boxShadow: 2, 
                  width: '100%', 
                  maxWidth: 600, 
                  mx: 'auto',
                  position: 'relative'
                }} key={mini.id || idx}>
                  {/* Phase Badge */}
                  <Box sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: '#d32f2f',
                    color: 'white',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    zIndex: 1
                  }}>
                    {getKnockoutPhaseName(mini.knockoutMatchId)}
                  </Box>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' }, 
                    justifyContent: 'space-between', 
                    alignItems: { xs: 'stretch', sm: 'flex-start' },
                    pt: 3 // Add top padding for knockout games since they always have badges
                  }}>
                    {/* Left side: Team A */}
                    <Box sx={{ flex: 'none', alignItems: 'flex-end', textAlign: 'right', pr: 0, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Box sx={{ pr: 0, mr: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', direction: 'rtl' }}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {`קבוצת ${getTeamDisplayName(tournament.teams?.[mini.teamA])}`}
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', direction: 'rtl' }}>
                            {(mini.goals || []).filter((g: any) => g.team === mini.teamA).map((g: any, i: number) => {
                              const scorer = getPlayerName(players, g.scorerId);
                              const assist = g.assistId ? getPlayerName(players, g.assistId) : null;
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
                            {`קבוצת ${getTeamDisplayName(tournament.teams?.[mini.teamB])}`}
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', direction: 'rtl' }}>
                            {(mini.goals || []).filter((g: any) => g.team === mini.teamB).map((g: any, i: number) => {
                              const scorer = getPlayerName(players, g.scorerId);
                              const assist = g.assistId ? getPlayerName(players, g.assistId) : null;
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
                    {/* Right side: Duration, Status, Pitch, and Action Buttons */}
                    <Box sx={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      {mini.status === 'complete' && mini.startTime && mini.endTime && (
                        <Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '1.1rem', mb: 1 }}>
                          משך: {formatDuration(mini.startTime, mini.endTime)}
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>סטטוס: {getStatusLabel(mini.status)}</Typography>
                      {mini.pitchNumber && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>מגרש: {mini.pitchNumber}</Typography>
                      )}
                      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 1 }}>
                        {/* Only show edit/delete when not live and tournament is not completed */}
                        {!isTournamentCompleted && (
                          <>
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
                          </>
                        )}
                      </Box>
                    </Box>
                  </Box>
                  {/* Centered timer and buttons below the right-aligned info */}
                  <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                    {/* Timer display only */}
                    {mini.status === 'live' && mini.startTime && (
                      <Typography variant="h2" fontWeight={900} color="primary" sx={{ mb: 2, fontFamily: 'monospace' }}>
                        {formatMMSS(liveTimers[mini.id] ?? Date.now() - mini.startTime)}
                      </Typography>
                    )}
                    {mini.status === 'pending' && (
                      <Button data-testid="list-start-game" variant="contained" color="success" sx={{ mt: 2 }} onClick={() => handleStartMiniGame(mini.id)}>
                        התחל משחק (B)
                      </Button>
                    )}
                    {mini.status === 'live' && (
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 2 }}>
                        <Button variant="contained" color="secondary" onClick={() => { 
                          setGoalDialogOpen(true); 
                          setGoalMiniGameId(mini.id);
                          setGoalTeam('');
                          setScorer(null);
                          setAssister(null);
                        }}>
                          הוסף שער
                        </Button>
                        <Button variant="contained" color="error" onClick={() => handleEndMiniGame(mini.id)}>
                          סיים משחק
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Card>
              ))}
            </Box>
          );
        })()}
      </Box>
      
      {/* Knockout Mini-Game Creation Dialog */}
      <Dialog open={knockoutMiniGameDialogOpen} onClose={() => setKnockoutMiniGameDialogOpen(false)} maxWidth="xs" fullWidth container={typeof window !== 'undefined' ? document.body : undefined} PaperProps={{ sx: { zIndex: 3000 } }}>
        <DialogTitle>צור משחק נוקאאוט</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mt: 1, flexDirection: 'column' }}>
            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                {getPlayerName(players, tournament.teams[knockoutTeamA]?.captain)} vs {getPlayerName(players, tournament.teams[knockoutTeamB]?.captain)}
              </Typography>
            </Box>
            <FormControl fullWidth sx={{ minWidth: 120 }}>
              <InputLabel>מגרש</InputLabel>
              <Select value={knockoutPitch} label="מגרש" onChange={e => setKnockoutPitch(e.target.value)}>
                <MenuItem value="" disabled>בחר מגרש</MenuItem>
                {pitchOptions.filter(p => !isPitchBusy(p)).map(p => (
                  <MenuItem key={p} value={p}>{`מגרש ${p}`}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKnockoutMiniGameDialogOpen(false)} disabled={creatingKnockoutMiniGame}>ביטול</Button>
          <Button onClick={handleCreateKnockoutMiniGameSubmit} variant="contained" color="primary" disabled={!knockoutPitch || creatingKnockoutMiniGame}>
            {creatingKnockoutMiniGame ? 'יוצר...' : 'צור משחק'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  return (
    <AdminLayout>
      <TournamentTabs
        tournament={tournament}
        miniGames={miniGames}
        players={players}
        groupStageContent={groupStageContent}
        knockoutContent={knockoutContent}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {/* All dialogs moved outside tabs so they are always rendered */}
      
      {/* Add Goal Dialog */}
      <Dialog open={goalDialogOpen} onClose={() => setGoalDialogOpen(false)} maxWidth="xs" fullWidth container={typeof window !== 'undefined' ? document.body : undefined} PaperProps={{ sx: { zIndex: 3000 } }}>
        <DialogTitle>הוסף שער</DialogTitle>
        <DialogContent>
          {(() => {
            if (!goalMiniGameId) return null;
            const mini = miniGames.find((g: any) => g.id === goalMiniGameId);
            if (!mini) return null;
            console.log('Goal dialog - mini game:', mini);
            console.log('Goal dialog - tournament teams:', tournament.teams);
            // Handle both group games and knockout games
            let teamAObj, teamBObj;
            if (mini.knockoutMatchId) {
              // Knockout game - teams are stored as keys (like 'A', 'D'), need to find the actual team objects
              // First, find which groups contain these team keys
              const allGroups = Object.values(tournament.groups || {});
              const groupWithTeamA = allGroups.find((group: any) => group.teams.includes(mini.teamA));
              const groupWithTeamB = allGroups.find((group: any) => group.teams.includes(mini.teamB));
              // Get the actual team objects from the tournament teams
              teamAObj = tournament.teams[mini.teamA];
              teamBObj = tournament.teams[mini.teamB];
              // If not found directly, try to find by team key in groups
              if (!teamAObj && groupWithTeamA) {
                teamAObj = tournament.teams[mini.teamA];
              }
              if (!teamBObj && groupWithTeamB) {
                teamBObj = tournament.teams[mini.teamB];
              }
              // Fallback if still not found
              if (!teamAObj) {
                teamAObj = { players: [], captain: mini.teamA };
              }
              if (!teamBObj) {
                teamBObj = { players: [], captain: mini.teamB };
              }
            } else {
              // Group game - teams are stored as full objects
              teamAObj = tournament.teams[mini.teamA];
              teamBObj = tournament.teams[mini.teamB];
            }
            console.log('Goal dialog - team objects:', { teamAObj, teamBObj });
            const teamOptions = [
              { value: mini.teamA, label: `קבוצת ${getPlayerName(players, teamAObj?.captain || mini.teamA)}` },
              { value: mini.teamB, label: `קבוצת ${getPlayerName(players, teamBObj?.captain || mini.teamB)}` },
            ];
            console.log('Goal dialog - team options:', teamOptions);
            console.log('Goal dialog - current goalTeam:', goalTeam);
            const selectedTeamObj = goalTeam === mini.teamA ? teamAObj : goalTeam === mini.teamB ? teamBObj : null;
            const playerIds = selectedTeamObj
              ? selectedTeamObj.players.map((p: any) => typeof p === 'string' ? p : p.id)
              : [];
            const options = players.filter((p: any) => playerIds.includes(p.id));
            console.log('Goal dialog - selected team:', { goalTeam, selectedTeamObj, playerIds, options });
            return (
              <Box>
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>קבוצה</InputLabel>
                  <Select value={goalTeam} label="קבוצה" onChange={e => setGoalTeam(e.target.value)}>
                    <MenuItem value="" disabled>בחר קבוצה</MenuItem>
                    {teamOptions.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>מבקיע</InputLabel>
                  <Select value={scorer?.id || ''} label="מבקיע" onChange={e => setScorer(options.find(p => p.id === e.target.value))}>
                    <MenuItem value="" disabled>בחר שחקן</MenuItem>
                    {options.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>מבשל (לא חובה)</InputLabel>
                  <Select value={assister?.id || ''} label="מבשל (לא חובה)" onChange={e => setAssister(options.find(p => p.id === e.target.value))}>
                    <MenuItem value="">ללא</MenuItem>
                    {options.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGoalDialogOpen(false)} disabled={addingGoal}>ביטול</Button>
          <Button onClick={() => {
            const mini = miniGames.find((g: any) => g.id === goalMiniGameId);
            if (mini) handleAddGoal(mini);
          }} variant="contained" color="primary" disabled={!scorer || !goalTeam || addingGoal}>
            {addingGoal ? 'מוסיף...' : 'הוסף שער'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Mini-Game Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xs" fullWidth container={typeof window !== 'undefined' ? document.body : undefined} PaperProps={{ sx: { zIndex: 3000 } }}>
        <DialogTitle>ערוך מיני-משחק</DialogTitle>
        <DialogContent>
          {editState && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle2">קבוצה 1: {getPlayerName(players, tournament.teams[editState.teamA]?.captain || editState.teamA)}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton onClick={() => handleScoreChange('A', -1)}><RemoveIcon /></IconButton>
                <Typography>{editState.scoreA}</Typography>
                <IconButton onClick={() => handleScoreChange('A', 1)}><AddIcon /></IconButton>
              </Box>
              <Typography variant="subtitle2">קבוצה 2: {getPlayerName(players, tournament.teams[editState.teamB]?.captain || editState.teamB)}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton onClick={() => handleScoreChange('B', -1)}><RemoveIcon /></IconButton>
                <Typography>{editState.scoreB}</Typography>
                <IconButton onClick={() => handleScoreChange('B', 1)}><AddIcon /></IconButton>
              </Box>
              {/* List/edit goals */}
              <Typography variant="subtitle2">שערים</Typography>
              {editState.goals.map((g: any, i: number) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>{getPlayerName(players, g.scorerId)}{g.assistId ? ` (${getPlayerName(players, g.assistId)})` : ''} - {g.team === editState.teamA ? 'קבוצה 1' : 'קבוצה 2'}</Typography>
                  <Button size="small" onClick={() => openEditGoalDialog(g.team, i)}>ערוך</Button>
                  <Button size="small" color="error" onClick={() => handleDeleteGoal(i)}>מחק</Button>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={savingEdit}>ביטול</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary" disabled={!canSaveEdit || savingEdit}>{savingEdit ? 'שומר...' : 'שמור שינויים'}</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={editGoalDialogOpen} onClose={() => setEditGoalDialogOpen(false)} maxWidth="xs" fullWidth container={typeof window !== 'undefined' ? document.body : undefined} PaperProps={{ sx: { zIndex: 3000 } }}>
        <DialogTitle>ערוך שער</DialogTitle>
        <DialogContent>
          {editGoalTeam && (
            <Box>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>מבקיע</InputLabel>
                <Select value={editGoalScorer?.id || ''} label="מבקיע" onChange={e => setEditGoalScorer(players.find((p: any) => p.id === e.target.value))}>
                  <MenuItem value="" disabled>בחר שחקן</MenuItem>
                  {(() => {
                    const teamObj = tournament.teams[editGoalTeam];
                    const playerIds = teamObj ? teamObj.players : [];
                    return players.filter((p: any) => playerIds.includes(p.id)).map((p: any) => (
                      <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                    ));
                  })()}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>מבשל (לא חובה)</InputLabel>
                <Select value={editGoalAssister?.id || ''} label="מבשל (לא חובה)" onChange={e => setEditGoalAssister(players.find((p: any) => p.id === e.target.value))}>
                  <MenuItem value="">ללא</MenuItem>
                  {(() => {
                    const teamObj = tournament.teams[editGoalTeam];
                    const playerIds = teamObj ? teamObj.players : [];
                    return players.filter((p: any) => playerIds.includes(p.id)).map((p: any) => (
                      <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                    ));
                  })()}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditGoalDialogOpen(false)}>ביטול</Button>
          <Button onClick={handleSaveGoal} variant="contained" color="primary" disabled={!editGoalScorer}>שמור</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Mini-Game Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth container={typeof window !== 'undefined' ? document.body : undefined} PaperProps={{ sx: { zIndex: 3000 } }}>
        <DialogTitle>מחק מיני-משחק</DialogTitle>
        <DialogContent>
          <Typography>האם אתה בטוח שברצונך למחוק את המיני-משחק? פעולה זו אינה הפיכה.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deletingMiniGame}>ביטול</Button>
          <Button onClick={handleDeleteMiniGame} variant="contained" color="error" disabled={deletingMiniGame}>{deletingMiniGame ? 'מוחק...' : 'מחק'}</Button>
        </DialogActions>
      </Dialog>
      
      {/* Draw Resolution Dialog */}
      <Dialog open={drawResolutionDialogOpen} onClose={() => setDrawResolutionDialogOpen(false)} maxWidth="xs" fullWidth container={typeof window !== 'undefined' ? document.body : undefined} PaperProps={{ sx: { zIndex: 3000 } }}>
        <DialogTitle>תיקו במשחק נוקאאוט</DialogTitle>
        <DialogContent>
          {drawMiniGame && (
            <Box>
              <Typography sx={{ mb: 2 }}>
                המשחק הסתיים בתיקו. יש לבחור מנצח כדי להמשיך בטורניר:
              </Typography>
              <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {getPlayerName(players, tournament.teams[drawMiniGame.teamA]?.captain)} vs {getPlayerName(players, tournament.teams[drawMiniGame.teamB]?.captain)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  תוצאה: {drawMiniGame.scoreA} - {drawMiniGame.scoreB}
                </Typography>
      </Box>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>בחר מנצח</InputLabel>
                <Select value={selectedWinner} label="בחר מנצח" onChange={e => setSelectedWinner(e.target.value)} disabled={isTournamentCompleted}>
                  <MenuItem value="" disabled>בחר קבוצה</MenuItem>
                  <MenuItem value={drawMiniGame.teamA}>
                    {getPlayerName(players, tournament.teams[drawMiniGame.teamA]?.captain)}
                  </MenuItem>
                  <MenuItem value={drawMiniGame.teamB}>
                    {getPlayerName(players, tournament.teams[drawMiniGame.teamB]?.captain)}
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDrawResolutionDialogOpen(false)} disabled={isTournamentCompleted}>ביטול</Button>
          <Button onClick={handleDrawResolution} variant="contained" color="primary" disabled={!selectedWinner || isTournamentCompleted}>
            אישר מנצח
          </Button>
        </DialogActions>
      </Dialog>

      {/* End Tournament Confirmation Dialog */}
      <Dialog open={endTournamentDialogOpen} onClose={() => setEndTournamentDialogOpen(false)} maxWidth="xs" fullWidth container={typeof window !== 'undefined' ? document.body : undefined} PaperProps={{ sx: { zIndex: 3000 } }}>
        <DialogTitle>סיים טורניר</DialogTitle>
        <DialogContent>
          <Typography>
            האם אתה בטוח שברצונך לסיים את הטורניר? פעולה זו תהפוך את כל הנתונים לקריאה בלבד.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEndTournamentDialogOpen(false)} disabled={endingTournament}>ביטול</Button>
          <Button onClick={handleEndTournament} variant="contained" color="success" disabled={endingTournament}>
            {endingTournament ? 'מסיים...' : 'סיים טורניר'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
