"use client";

import { useState, useEffect } from 'react';
import { Box, Button, Stepper, Step, StepLabel, Paper, Typography, InputAdornment, IconButton, TextField, CircularProgress } from '@mui/material';
import AdminGuard from '@/components/auth/AdminGuard';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import ClearIcon from '@mui/icons-material/Clear';
import { firestore } from '@/lib/firebase/utils';
import { useRouter } from 'next/navigation';
import { getDocs } from 'firebase/firestore';
import { usePlayerStatsCache } from '@/hooks/usePlayerStatsCache';
import { Checkbox, Card, CardContent, Avatar } from '@mui/material';
import { Grid } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Chip } from '@mui/material';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useToast } from '@/contexts/ToastContext';
import { useSearchParams } from 'next/navigation';
import { useSubscriptionsCache } from '@/hooks/useSubscriptionsCache';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs as getDocsFirestore } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const steps = [
  'בחירת תאריך',
  'בחירת שחקנים',
  'שיבוץ לקבוצות',
  'סקירה וסיום',
];

export default function CreateGameNightPage() {
  console.log('CreateGameNightPage rendered');
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [date, setDate] = useState<Dayjs | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gameNightId, setGameNightId] = useState<string | null>(null);
  const router = useRouter();
  const { players, loading: loadingPlayers, error: errorPlayers } = usePlayerStatsCache();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [teams, setTeams] = useState<{ A: string[]; B: string[]; C: string[] }>({ A: [], B: [], C: [] });
  const teamKeys: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
  const [addPlayerDialog, setAddPlayerDialog] = useState<{ open: boolean; team: 'A' | 'B' | 'C' | null }>({ open: false, team: null });
  const [addPlayerSearch, setAddPlayerSearch] = useState('');
  const [addPlayerValue, setAddPlayerValue] = useState<any>(null);
  // Add state for drag-and-drop
  const [dragCaptain, setDragCaptain] = useState<{ team: 'A' | 'B' | 'C'; playerId: string } | null>(null);
  const { showToast } = useToast ? useToast() : { showToast: undefined };
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isEditMode = !!id;
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const { subscriptions, loading: loadingSubs } = useSubscriptionsCache();
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [pendingSubscriptionDay, setPendingSubscriptionDay] = useState<string | null>(null);
  // After loading the gameNight in useEffect, store fromSubscription in a state
  const [fromSubscription, setFromSubscription] = useState(false);
  // Add state for abort dialog
  const [abortDialogOpen, setAbortDialogOpen] = useState(false);
  // Add state for date conflict dialog
  const [dateConflictDialogOpen, setDateConflictDialogOpen] = useState(false);
  const [conflictingDate, setConflictingDate] = useState<string | null>(null);
  const { user } = useAuth();
  const [playerAverages, setPlayerAverages] = useState<Record<string, number>>({});

  // Steps: remove step 4 if in edit mode
  const steps = isEditMode
    ? ['בחירת תאריך', 'בחירת שחקנים', 'שיבוץ לקבוצות']
    : ['בחירת תאריך', 'בחירת שחקנים', 'שיבוץ לקבוצות', 'סקירה וסיום'];

  // 1. Refactor useEffect for edit mode
  useEffect(() => {
    const id = searchParams.get('id');
    const stepParam = searchParams.get('step');
    if (id) {
      setLoading(true);
      firestore.getDoc(`gameDays/${id}`).then((doc) => {
        const gameNight = doc as any; // treat as GameNight
        if (gameNight) {
          setGameNightId(gameNight.id);
          setDate(gameNight.date ? dayjs(gameNight.date) : null);
          setSelectedPlayers(gameNight.participants || []);
          setFromSubscription(!!gameNight.fromSubscription);
          // Support both old and new team structures
          if (gameNight.teams && gameNight.teams.A && gameNight.teams.B && gameNight.teams.C) {
            setTeams({
              A: gameNight.teams.A.players || [],
              B: gameNight.teams.B.players || [],
              C: gameNight.teams.C.players || [],
            });
          } else {
            setTeams({ A: [], B: [], C: [] });
          }
          // Always start at team assignment step in edit mode
          setActiveStep(2);
        }
        setLoading(false);
      });
    }
  }, [id, searchParams]); // Only run on mount

  // Fetch player average ratings
  useEffect(() => {
    async function fetchAverages() {
      const snap = await getDocsFirestore(collection(db, 'playerRatings'));
      const averages: Record<string, number> = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (typeof data.average === 'number') averages[doc.id] = data.average;
      });
      setPlayerAverages(averages);
    }
    fetchAverages();
  }, []);

  // Get today's date (local, not strict Israeli time)
  const today = dayjs().startOf('day'); // TODO: For strict Israeli time, use dayjs-tz plugin

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : prev.length < 21
        ? [...prev, playerId]
        : prev
    );
  };
  const handleClearSelection = () => setSelectedPlayers([]);
  const handleSelectAll = () => setSelectedPlayers(players.slice(0, 21).map((p) => p.id));

  // Check if date already has a game (including drafts)
  const checkDateConflict = async (selectedDate: string): Promise<boolean> => {
    try {
      const existingQuery = firestore.query('gameDays', firestore.where('date', '==', selectedDate));
      const existingDocs = await getDocs(existingQuery);
      return !existingDocs.empty;
    } catch (error) {
      console.error('Error checking date conflict:', error);
      return false;
    }
  };

  const handleDateChange = (newValue: Dayjs | null) => {
    setDate(newValue);
    setDateError(null);
    setConflictingDate(null);
    
    if (!isEditMode && newValue) {
      // Check for date conflict first
      const selectedDate = newValue.format('YYYY-MM-DD');
      checkDateConflict(selectedDate).then(hasConflict => {
        if (hasConflict) {
          setConflictingDate(selectedDate);
          setDateConflictDialogOpen(true);
          setDate(null); // Clear the date selection
          return;
        }
        // Only open subscription dialog if no conflict
        const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayKey = weekDays[newValue.day()];
        const subs = subscriptions[dayKey] || [];
        if (subs.length === 21) {
          setPendingSubscriptionDay(dayKey);
          setSubscriptionDialogOpen(true);
        }
      });
    }
  };

  const handleUseSubscription = async () => {
    if (!pendingSubscriptionDay || !date) return;
    
    // Check for date conflict before proceeding with subscription
    const selectedDate = date.format('YYYY-MM-DD');
    const hasConflict = await checkDateConflict(selectedDate);
    if (hasConflict) {
      setConflictingDate(selectedDate);
      setDateConflictDialogOpen(true);
      setSubscriptionDialogOpen(false);
      setPendingSubscriptionDay(null);
      return;
    }
    
    const subs = subscriptions[pendingSubscriptionDay] || [];
    setSelectedPlayers(subs.map(p => p.id));
    // If game night not created yet, create it
    if (!gameNightId) {
      setLoading(true);
      try {
        const gameNightData = {
          date: selectedDate,
          status: 0, // draft
          participants: subs.map(p => p.id),
          teams: { A: { players: [] }, B: { players: [] }, C: { players: [] } },
          miniGames: [],
          fromSubscription: true,
          subscriptionDay: pendingSubscriptionDay,
          createdBy: user?.uid || null,
        };
        const docId = await firestore.addDoc('gameDays', gameNightData);
        setGameNightId(docId);
        setActiveStep(2); // Jump to team selection
        setFromSubscription(true);
      } catch (error) {
        setDateError('שגיאה ביצירת ערב משחק');
      } finally {
        setLoading(false);
      }
    } else {
      setActiveStep(2);
    }
    setSubscriptionDialogOpen(false);
    setPendingSubscriptionDay(null);
  };
  const handleSkipSubscription = () => {
    setActiveStep(1);
    setSubscriptionDialogOpen(false);
    setPendingSubscriptionDay(null);
  };

  // Filter players by search
  const filteredPlayers = players.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Step 3: Team assignment helpers
  const allSelectedPlayers = selectedPlayers;
  const assignedPlayerIds = [...teams.A, ...teams.B, ...teams.C];
  const unassignedPlayers = allSelectedPlayers.filter(id => !assignedPlayerIds.includes(id));
  const getPlayer = (id: string) => players.find(p => p.id === id);
  const teamNames = { A: 'קבוצה א׳', B: 'קבוצה ב׳', C: 'קבוצה ג׳' };
  const handleAssign = (playerId: string, team: 'A' | 'B' | 'C') => {
    // Remove from all teams, add to selected team (at end)
    setTeams(prev => {
      const newTeams = { ...prev };
      for (const k of teamKeys) newTeams[k] = newTeams[k].filter(id => id !== playerId);
      newTeams[team] = [...newTeams[team], playerId];
      return newTeams;
    });
  };
  const handleUnassign = (playerId: string) => {
    setTeams(prev => {
      const newTeams = { ...prev };
      for (const k of teamKeys) newTeams[k] = newTeams[k].filter(id => id !== playerId);
      return newTeams;
    });
  };
  const handleMakeCaptain = (team: 'A' | 'B' | 'C', playerId: string) => {
    setTeams(prev => {
      const arr = prev[team];
      if (arr[0] === playerId) return prev;
      return { ...prev, [team]: [playerId, ...arr.filter(id => id !== playerId)] };
    });
  };
  const handleRandomSplit = () => {
    const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5);
    setTeams({
      A: shuffled.slice(0, 7),
      B: shuffled.slice(7, 14),
      C: shuffled.slice(14, 21),
    });
  };

  const handleSmartSplit = () => {
    // Greedy algorithm: sort players by average, snake-draft into teams
    const playerIds = [...selectedPlayers];
    playerIds.sort((a, b) => (playerAverages[b] ?? 0) - (playerAverages[a] ?? 0));
    const teamsArr: string[][] = [[], [], []];
    let dir = 1, idx = 0;
    for (const pid of playerIds) {
      teamsArr[idx].push(pid);
      idx += dir;
      if (idx === 3) { idx = 2; dir = -1; }
      if (idx === -1) { idx = 0; dir = 1; }
    }
    setTeams({ A: teamsArr[0], B: teamsArr[1], C: teamsArr[2] });
  };

  // Add player to team (and to selectedPlayers if not present)
  const handleAddPlayerToTeam = (playerId: string, team: 'A' | 'B' | 'C') => {
    if (!selectedPlayers.includes(playerId)) {
      setSelectedPlayers(prev => prev.length < 21 ? [...prev, playerId] : prev);
    }
    handleAssign(playerId, team);
    setAddPlayerDialog({ open: false, team: null });
    setAddPlayerValue(null);
    setAddPlayerSearch('');
  };

  const handleNext = async () => {
    // Logic for Step 0: Date selection and creating the draft
    if (activeStep === 0) {
      if (!date) {
        setDateError('יש לבחור תאריך');
        return;
      }
      setDateError(null);
      setLoading(true);
      try {
        const selectedDate = date.format('YYYY-MM-DD');
        // Double-check for date conflict (in case user somehow bypassed the initial check)
        const hasConflict = await checkDateConflict(selectedDate);
        if (hasConflict) {
          setConflictingDate(selectedDate);
          setDateConflictDialogOpen(true);
          setLoading(false);
          return;
        }
        const gameNightData = {
          date: selectedDate,
          status: 0, // draft
          participants: [],
          teams: { A: { players: [] }, B: { players: [] }, C: { players: [] } },
          miniGames: [],
          createdBy: user?.uid || null,
        };
        const docId = await firestore.addDoc('gameDays', gameNightData);
        setGameNightId(docId);
        setActiveStep((prev) => prev + 1);
      } catch (error) {
        console.error('Error creating draft game night:', error);
      } finally {
        setLoading(false);
      }
      return; // Stop execution after this step
    }
  
    // Logic for Step 1: Saving players
    if (activeStep === 1) {
      if (selectedPlayers.length !== 21 || !gameNightId) return;
      setLoading(true);
      try {
        await firestore.updateDoc(`gameDays/${gameNightId}`, { participants: selectedPlayers });
        setActiveStep((prev) => prev + 1);
      } catch (error) {
        alert('שגיאה בשמירת השחקנים');
      } finally {
        setLoading(false);
      }
      return; // Stop execution
    }
  
    // Logic for Step 2: Saving teams
    if (activeStep === 2) {
      if (!gameNightId) return;
      const teamsObj = {
        A: { players: teams.A, captain: teams.A[0] || '' },
        B: { players: teams.B, captain: teams.B[0] || '' },
        C: { players: teams.C, captain: teams.C[0] || '' },
      };
      setLoading(true);
      try {
        await firestore.updateDoc(`gameDays/${gameNightId}`, { teams: teamsObj });
      setActiveStep((prev) => prev + 1);
      } catch (error) {
        alert('שגיאה בשמירת הקבוצות');
      } finally {
        setLoading(false);
      }
      return; // Stop execution
    }
    
    // *** THIS IS THE FIX ***
    // Logic for Step 3 (Final Step): Finalizing and redirecting
    if (activeStep === 3) {
        if (!gameNightId) return;
        setLoading(true);
        try {
            // Finalize the game night by setting its status to active (e.g., status: 1)
            await firestore.updateDoc(`gameDays/${gameNightId}`, { status: 1 });
  
            // Show success toast
            if (showToast) showToast('ערב משחק נוצר בהצלחה!', 'success');
  
            // Redirect to the admin dashboard
            router.push('/admin');
  
        } catch (error) {
            console.error("Error finalizing game night:", error);
            if (showToast) showToast('שגיאה בסיום ערב המשחק', 'error');
            setLoading(false); // Only set loading to false on error, as success redirects away
        }
        return; // Stop execution
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setCompleted(false);
  };

  // Save changes handler (edit mode)
  const handleSaveChanges = async () => {
    if (!gameNightId) return;
    setLoading(true);
    try {
      await firestore.updateDoc(`gameDays/${gameNightId}`, {
        date: date ? date.format('YYYY-MM-DD') : '',
        participants: selectedPlayers,
        teams: {
          A: { players: teams.A, captain: teams.A[0] || '' },
          B: { players: teams.B, captain: teams.B[0] || '' },
          C: { players: teams.C, captain: teams.C[0] || '' },
        },
      });
      if (showToast) showToast('השינויים נשמרו בהצלחה', 'success');
      router.push('/admin');
    } catch (error) {
      if (showToast) showToast('שגיאה בשמירת השינויים', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Discard changes handler
  const handleDiscard = () => setDiscardDialogOpen(true);
  const confirmDiscard = () => {
    setDiscardDialogOpen(false);
    router.push('/admin');
  };

  // Abort game creation handlers
  const handleAbort = () => setAbortDialogOpen(true);
  
  const handleAbortYes = async () => {
    setAbortDialogOpen(false);
    setLoading(true);
    try {
      // If game night exists, delete it
      if (gameNightId) {
        await firestore.deleteDoc(`gameDays/${gameNightId}`);
      }
      // Reset all state
      setActiveStep(0);
      setGameNightId(null);
      setSelectedPlayers([]);
      setTeams({ A: [], B: [], C: [] });
      setDate(null);
      setCompleted(false);
      setFromSubscription(false);
      if (showToast) showToast('יצירת ערב המשחק בוטלה', 'info');
      // Navigate back to previous page
      router.back();
    } catch (error) {
      if (showToast) showToast('שגיאה בביטול יצירת ערב המשחק', 'error');
      else alert('שגיאה בביטול יצירת ערב המשחק');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAbortNo = () => {
    setAbortDialogOpen(false);
    // Stay in current state - do nothing
  };
  
  const handleAbortSaveAsDraft = async () => {
    setAbortDialogOpen(false);
    setLoading(true);
    try {
      // Save current state as draft
      const gameNightData = {
        date: date ? date.format('YYYY-MM-DD') : '',
        status: 0, // draft
        participants: selectedPlayers,
        teams: {
          A: { players: teams.A, captain: teams.A[0] || '' },
          B: { players: teams.B, captain: teams.B[0] || '' },
          C: { players: teams.C, captain: teams.C[0] || '' },
        },
        fromSubscription,
        subscriptionDay: pendingSubscriptionDay
      };
      
      if (gameNightId) {
        // Update existing draft
        await firestore.updateDoc(`gameDays/${gameNightId}`, gameNightData);
      } else {
        // Create new draft
        await firestore.addDoc('gameDays', gameNightData);
      }
      
      if (showToast) showToast('ערב המשחק נשמר כטיוטה', 'success');
      // Navigate back to previous page
      router.back();
    } catch (error) {
      if (showToast) showToast('שגיאה בשמירת הטיוטה', 'error');
      else alert('שגיאה בשמירת הטיוטה');
    } finally {
      setLoading(false);
    }
  };

  const handleDateConflictClose = () => {
    setDateConflictDialogOpen(false);
    setConflictingDate(null);
  };

  console.log('isEditMode:', isEditMode, 'activeStep:', activeStep, 'steps.length:', steps.length);

  // Helper to get player average
  const getPlayerAverage = (id: string) => playerAverages[id] ?? '-';
  // Helper to get team average
  const getTeamAverage = (team: string[]) => {
    const avgs = team.map(pid => playerAverages[pid]).filter(v => typeof v === 'number');
    if (avgs.length === 0) return '-';
    const avg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
    return avg.toFixed(2);
  };

  // 2. Define EditModeButtons and CreateModeButtons components inside CreateGameNightPage
  function EditModeButtons() {
    return (
      <Box sx={{ mt: 3, display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0 || loading}
          variant="outlined"
          sx={{ minHeight: 44, flex: 1 }}
        >
          {'הקודם'}
        </Button>
        <Button
          onClick={handleDiscard}
          variant="outlined"
          color="error"
          disabled={loading}
          sx={{ minHeight: 44, flex: 1 }}
        >
          בטל שינויים
        </Button>
        <Button
          onClick={handleSaveChanges}
          variant="contained"
          color="success"
          disabled={
            loading ||
            (activeStep === 0 && !date) ||
            (activeStep === 1 && selectedPlayers.length !== 21) ||
            (activeStep === 2 && (teams.A.length !== 7 || teams.B.length !== 7 || teams.C.length !== 7))
          }
          sx={{ minHeight: 44, flex: 2 }}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? 'שומר...' : 'שמור שינויים'}
        </Button>
      </Box>
    );
  }

  function CreateModeButtons() {
    return (
      <Box sx={{ mt: 3, display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0 || loading}
          variant="outlined"
          sx={{ minHeight: 44, flex: 1 }}
        >
          {'הקודם'}
        </Button>
        <Button
          onClick={handleAbort}
          variant="outlined"
          color="error"
          disabled={loading}
          sx={{ minHeight: 44, flex: 1 }}
        >
          בטל יצירה
        </Button>
        <Button
          onClick={handleNext}
          variant="contained"
          color="primary"
          disabled={
            (activeStep === 0 && !date) ||
            (activeStep === 1 && selectedPlayers.length !== 21) ||
            (activeStep === 2 && (teams.A.length !== 7 || teams.B.length !== 7 || teams.C.length !== 7)) ||
            loading
          }
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
          sx={{ minHeight: 44, flex: 1 }}
        >
          {loading
            ? 'יוצר...'
            : activeStep === steps.length - 1
            ? 'סיים וצור ערב משחק'
            : 'הבא'}
        </Button>
      </Box>
    );
  }

  return (
    <AdminGuard>
      <Box sx={{ maxWidth: 900, mx: 'auto', py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h4" color="primary" fontWeight={900} gutterBottom align="center">
            {isEditMode ? 'עריכת ערב משחק' : 'יצירת ערב משחק חדש'}
        </Typography>
          {fromSubscription && (
            <Chip 
              color="warning" 
              label="משתמש במנויים" 
              sx={{ 
                fontWeight: 900, 
                fontSize: 16, 
                px: 2.5, 
                py: 1, 
                border: '2px solid #f59e0b', // strong orange border
                bgcolor: '#fffbe6', // light orange background
                color: '#b45309', // dark orange text
                boxShadow: '0 2px 8px -2px #f59e0b44',
                letterSpacing: 1,
              }} 
            />
          )}
        </Box>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Paper sx={{ p: 4, minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {completed ? (
            <>
              <Typography variant="h6" gutterBottom>
                צור ערב נוסף
              </Typography>
              <Button onClick={handleReset} variant="outlined" color="primary">צור ערב נוסף</Button>
            </>
          ) : (
            <>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                שלב: {steps[activeStep]}
              </Typography>
              {activeStep === 0 && (
                <Box sx={{ mt: 2, width: '100%', maxWidth: 320 }}>
                  <DatePicker
                    label="בחר תאריך לערב המשחק"
                    value={date}
                    onChange={handleDateChange}
                    minDate={today}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        variant: 'outlined',
                        error: !!dateError,
                        helperText: dateError,
                      }
                    }}
                    format="DD/MM/YYYY"
                  />
                </Box>
              )}
              {activeStep === 1 && (
                <Box sx={{ mt: 2, width: '100%' }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    בחר 21 שחקנים לערב המשחק
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {selectedPlayers.length} / 21 נבחרו
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: 2,
                      mb: 2,
                      alignItems: { xs: 'stretch', sm: 'center' },
                    }}
                  >
                      <TextField
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="חפש שחקן..."
                      variant="outlined"
                      size="small"
                        fullWidth
                      sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
                      InputProps={{
                        startAdornment: (
                          <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        )
                      }}
                    />
                    <Button
                      onClick={handleClearSelection}
                      variant="outlined"
                      color="secondary"
                      startIcon={<ClearIcon />}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      נקה בחירה
                    </Button>
                    <Button
                      onClick={handleSelectAll}
                        variant="outlined"
                      color="primary"
                      disabled={players.length < 21}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      בחר 21 ראשונים
                    </Button>
                  </Box>
                  <Box sx={{ maxHeight: 420, overflowY: 'auto', pr: 1, mb: 2, borderRadius: 2, bgcolor: 'background.default', boxShadow: 1 }}>
                    {loadingPlayers ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
                    ) : errorPlayers ? (
                      <Typography color="error">שגיאה בטעינת שחקנים</Typography>
                    ) : (
                      <Grid container spacing={2}>
                        {filteredPlayers.map((player: any) => {
                          const selected = selectedPlayers.includes(player.id);
                          return (
                            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={player.id}>
                              <Card
                                onClick={() => handlePlayerToggle(player.id)}
                                sx={{
                                  cursor: 'pointer',
                                  borderRadius: 3,
                                  boxShadow: selected ? 6 : 1,
                                  border: selected ? '2px solid #7c3aed' : '1px solid #e0e0e0',
                                  transition: 'all 0.15s cubic-bezier(.4,2,.6,1)',
                                  bgcolor: selected ? 'primary.50' : 'background.paper',
                                  '&:hover': {
                                    boxShadow: 8,
                                    border: '2px solid #7c3aed',
                                    transform: 'scale(1.04)',
                                  },
                                  '&:active': {
                                    boxShadow: 12,
                                    transform: 'scale(0.98)',
                                  },
                                }}
                              >
                                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                                  <Avatar sx={{ mb: 1, width: 48, height: 48, fontSize: 24, bgcolor: selected ? 'primary.main' : 'grey.200', color: selected ? 'white' : 'primary.main' }}>
                                    {player.name?.[0] || '?'}
                                  </Avatar>
                                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: selected ? 'primary.main' : 'text.primary' }}>{player.name}</Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>ממוצע: {getPlayerAverage(player.id)}</Typography>
                                  <Checkbox
                                    checked={selected}
                                    onChange={e => { e.stopPropagation(); handlePlayerToggle(player.id); }}
                                    color="primary"
                                    sx={{ p: 0, mt: 1 }}
                                    tabIndex={-1}
                                    inputProps={{ 'aria-label': `בחר ${player.name}` }}
                                  />
                                </CardContent>
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    )}
                  </Box>
                </Box>
              )}
              {activeStep === 2 && (
                <Box sx={{ width: '100%' }}>
                  <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>שיבוץ שחקנים לקבוצות (7 בכל קבוצה)</Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                    <Button onClick={handleRandomSplit} variant="outlined" color="primary" startIcon={<ShuffleIcon />}>פצל אקראית</Button>
                    <Button onClick={handleSmartSplit} variant="contained" color="secondary">פצל חכם (דירוגים)</Button>
                  </Box>
                  {/* Unassigned players */}
                  {unassignedPlayers.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontSize: { xs: '0.95rem', md: '1rem' } }}>שחקנים לא משובצים</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {unassignedPlayers.map(id => {
                          const p = getPlayer(id);
                          if (!p) return null;
                          return (
                            <Chip
                              key={id}
                              label={`${p.name} (${getPlayerAverage(id)})`}
                              avatar={<Avatar>{p.name?.[0] || '?'}</Avatar>}
                              onClick={() => {
                                // Assign to team with least players
                                const counts = teamKeys.map(k => teams[k].length);
                                const min = Math.min(...counts);
                                const team = teamKeys.find(k => teams[k].length === min) || 'A';
                                handleAssign(id, team);
                              }}
                              sx={{ cursor: 'pointer', fontWeight: 600, minHeight: 44 }}
                            />
                          );
                        })}
                      </Box>
                    </Box>
                  )}
                  {/* Teams - Responsive layout */}
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      justifyContent: { xs: 'center', md: 'space-between' },
                      flexDirection: { xs: 'column', md: 'row' },
                      alignItems: { xs: 'stretch', md: 'flex-start' },
                    }}
                  >
                    {teamKeys.map(team => (
                      <Box key={team} sx={{ flex: 1, bgcolor: 'background.default', borderRadius: 3, p: 2, boxShadow: 1, mb: { xs: 2, md: 0 } }}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, fontSize: { xs: '1rem', md: '1.1rem' } }}>{teamNames[team]}</Typography>
                        <Typography variant="caption" color={teams[team].length === 7 ? 'success.main' : 'text.secondary'} sx={{ mb: 1, display: 'block', fontSize: { xs: '0.95rem', md: '1rem' } }}>
                          {teams[team].length} / 7
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="secondary" sx={{ mb: 1 }}>
                          ממוצע דירוג: {getTeamAverage(teams[team])}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {teams[team].map((id, idx) => {
                            const p = getPlayer(id);
                            if (!p) return null;
                            return (
                              <Box
                                key={id}
                                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                onDragOver={e => {
                                  if (dragCaptain && dragCaptain.team === team && dragCaptain.playerId !== id) e.preventDefault();
                                }}
                                onDrop={e => {
                                  if (dragCaptain && dragCaptain.team === team && dragCaptain.playerId !== id) {
                                    handleMakeCaptain(team, id);
                                    setDragCaptain(null);
                                  }
                                }}
                              >
                                <Chip
                                  label={`${p.name} (${getPlayerAverage(id)})`}
                                  avatar={<Avatar>{p.name?.[0] || '?'}</Avatar>}
                                  color={idx === 0 ? 'primary' : 'default'}
                                  onClick={() => handleUnassign(id)}
                                  sx={{ cursor: 'pointer', fontWeight: 600, minHeight: 44 }}
                                />
                                {idx === 0 && (
                                  <Chip
                                    label="C"
                                    size="small"
                                    color="secondary"
                                    sx={{ fontWeight: 700, ml: 0.5, cursor: 'grab', minHeight: 32 }}
                                    draggable
                                    onDragStart={() => setDragCaptain({ team, playerId: id })}
                                    onDragEnd={() => setDragCaptain(null)}
                                    // Tap-to-make-captain fallback for mobile
                                    onClick={() => {
                                      if (window.innerWidth < 900) {
                                        // On mobile, tap the C chip to open a dialog to select a new captain
                                        const nextIdx = (teams[team].indexOf(id) + 1) % teams[team].length;
                                        handleMakeCaptain(team, teams[team][nextIdx]);
                                      }
                                    }}
                                  />
                                )}
                              </Box>
                            );
                          })}
                        </Box>
                        {teams[team].length < 7 && (
                          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Button
                              variant="outlined"
                              color="primary"
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => setAddPlayerDialog({ open: true, team })}
                              sx={{ minHeight: 44 }}
                            >
                              הוסף שחקן
                </Button>
              </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                  {/* Add Player Dialog - full width on mobile */}
                  <Dialog open={addPlayerDialog.open} onClose={() => setAddPlayerDialog({ open: false, team: null })} fullWidth maxWidth="xs">
                    <DialogTitle>הוסף שחקן לקבוצה</DialogTitle>
                    <DialogContent>
                      <Autocomplete
                        options={players}
                        getOptionLabel={option => option.name || ''}
                        value={addPlayerValue}
                        onChange={(_, newValue) => setAddPlayerValue(newValue)}
                        inputValue={addPlayerSearch}
                        onInputChange={(_, newInputValue) => setAddPlayerSearch(newInputValue)}
                        renderInput={params => <TextField {...params} label="חפש שחקן..." />}
                        sx={{ minWidth: 250, mt: 1 }}
                      />
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setAddPlayerDialog({ open: false, team: null })}>ביטול</Button>
                      <Button
                        onClick={() => {
                          if (addPlayerValue && addPlayerDialog.team) {
                            handleAddPlayerToTeam(addPlayerValue.id, addPlayerDialog.team);
                          }
                        }}
                        disabled={!addPlayerValue || !addPlayerDialog.team}
                        variant="contained"
                        color="primary"
                      >
                        הוסף
                      </Button>
                    </DialogActions>
                  </Dialog>
                </Box>
              )}
              {activeStep === 3 && (
                <Box sx={{ width: '100%' }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>סקירה וסיום</Typography>
                  {/* Summary Section */}
                  <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>תאריך ערב המשחק:</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>{date ? date.format('DD/MM/YYYY') : '—'}</Typography>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>שחקנים נבחרים ({selectedPlayers.length}):</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {selectedPlayers.map(id => {
                        const p = getPlayer(id);
                        return p ? <Chip key={id} label={`${p.name} (${getPlayerAverage(id)})`} avatar={<Avatar>{p.name?.[0] || '?'}</Avatar>} /> : null;
                      })}
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>קבוצות:</Typography>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                      {teamKeys.map(team => (
                        <Box key={team} sx={{ flex: 1, bgcolor: 'background.default', borderRadius: 3, p: 2, boxShadow: 1, mb: { xs: 2, md: 0 } }}>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>{teamNames[team]}</Typography>
                          <Typography variant="caption" color={teams[team].length === 7 ? 'success.main' : 'text.secondary'} sx={{ mb: 1, display: 'block' }}>
                            {teams[team].length} / 7
                          </Typography>
                          <Typography variant="body2" fontWeight={700} color="secondary" sx={{ mb: 1 }}>
                            ממוצע דירוג: {getTeamAverage(teams[team])}
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {teams[team].map((id, idx) => {
                              const p = getPlayer(id);
                              if (!p) return null;
                              return (
                                <Box key={id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Chip
                                    label={`${p.name} (${getPlayerAverage(id)})`}
                                    avatar={<Avatar>{p.name?.[0] || '?'}</Avatar>}
                                    color={idx === 0 ? 'primary' : 'default'}
                                    sx={{ fontWeight: 600 }}
                                  />
                                  {idx === 0 && (
                                    <Chip label="C" size="small" color="secondary" sx={{ fontWeight: 700, ml: 0.5 }} />
                                  )}
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                  {/* Warnings */}
                  {(teams.A.length !== 7 || teams.B.length !== 7 || teams.C.length !== 7) && (
                    <Typography color="warning.main" sx={{ mb: 2 }}>
                      ⚠️ לא כל הקבוצות מלאות. יש לוודא שכל קבוצה כוללת 7 שחקנים.
                    </Typography>
                  )}
                  {/* Action Buttons */}
                  {/* Cancel Confirmation Dialog */}
                  <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
                    <DialogTitle>בטל טיוטה</DialogTitle>
                    <DialogContent>
                      <Typography>האם אתה בטוח שברצונך לבטל את טיוטת ערב המשחק? פעולה זו תמחק את כל הנתונים שנשמרו עד כה.</Typography>
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setCancelDialogOpen(false)} color="primary">חזור</Button>
                      <Button
                        onClick={async () => {
                          setCancelDialogOpen(false);
                          if (!gameNightId) return;
                          setLoading(true);
                          try {
                            await firestore.deleteDoc(`gameDays/${gameNightId}`);
                            setActiveStep(0);
                            setGameNightId(null);
                            setSelectedPlayers([]);
                            setTeams({ A: [], B: [], C: [] });
                            setDate(null);
                            setCompleted(false);
                            setFromSubscription(false); // Reset fromSubscription on discard
                            if (showToast) showToast('הטיוטה בוטלה', 'success');
                          } catch (error) {
                            if (showToast) showToast('שגיאה בביטול הערב', 'error');
                            else alert('שגיאה בביטול הערב');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        color="error"
                        variant="contained"
                      >
                        כן, בטל טיוטה
                      </Button>
                    </DialogActions>
                  </Dialog>
                </Box>
              )}
            </>
          )}
            {!completed && (isEditMode ? <EditModeButtons /> : <CreateModeButtons />)}

        </Paper>
        {/* Discard Confirmation Dialog */}
        <Dialog open={discardDialogOpen} onClose={() => setDiscardDialogOpen(false)}>
          <DialogTitle>בטל שינויים</DialogTitle>
          <DialogContent>
            <Typography>האם אתה בטוח שברצונך לבטל את כל השינויים? פעולה זו לא תשמור את השינויים שביצעת.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDiscardDialogOpen(false)} color="primary">חזור</Button>
            <Button onClick={confirmDiscard} color="error" variant="contained">כן, בטל שינויים</Button>
          </DialogActions>
        </Dialog>
        {/* Subscription Dialog */}
        <Dialog open={subscriptionDialogOpen} onClose={handleSkipSubscription}>
          <DialogTitle>שימוש במנויים</DialogTitle>
          <DialogContent>
            <Typography>האם ברצונך להשתמש במנויים של יום זה?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleSkipSubscription}>לא</Button>
            <Button color="primary" variant="contained" onClick={handleUseSubscription}>כן</Button>
          </DialogActions>
        </Dialog>
        {/* Abort Game Creation Dialog */}
        <Dialog open={abortDialogOpen} onClose={handleAbortNo}>
          <DialogTitle>בטל יצירת ערב משחק</DialogTitle>
          <DialogContent>
            <Typography>האם אתה בטוח שברצונך לבטל את יצירת ערב המשחק? פעולה זו תמחק את כל הנתונים שנשמרו עד כה.</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              אפשרויות:
              <br />
              כן - בטל ומחק את כל הנתונים.
              <br />
              לא - נשאר בטיוטה הנוכחית.
              <br />
              שמור כטיוטה - שמור את הנתונים שנשמרו עד כה כטיוטה.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleAbortNo} color="primary">לא</Button>
            <Button onClick={handleAbortYes} color="error" variant="contained">כן</Button>
            <Button onClick={handleAbortSaveAsDraft} color="warning" variant="outlined">שמור כטיוטה</Button>
          </DialogActions>
        </Dialog>
        {/* Date Conflict Dialog */}
        <Dialog open={dateConflictDialogOpen} onClose={handleDateConflictClose}>
          <DialogTitle>תאריך זה כבר בשימוש</DialogTitle>
          <DialogContent>
            <Typography>התאריך {conflictingDate} כבר בשימוש. בחר תאריך אחר לערב המשחק.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDateConflictClose} color="primary">סגור</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminGuard>
  );
} 