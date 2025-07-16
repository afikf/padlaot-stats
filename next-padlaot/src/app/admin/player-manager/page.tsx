'use client';
import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, TextField, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Autocomplete, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Switch, Tabs, Tab, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import { usePlayersCache } from '@/hooks/usePlayersCache';
import { getAllUsers, getUserData } from '@/lib/firebase/users';
import { collection, addDoc, deleteDoc, doc, updateDoc, setDoc, getDocs as getDocsFirestore, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useToast } from '@/contexts/ToastContext';
import { useUsersCache } from '@/hooks/useUsersCache';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionsCache } from '@/hooks/useSubscriptionsCache';
import SubscriptionsIcon from '@mui/icons-material/HowToReg';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

// --- MOCK DATA FOR ASSIGNMENTS TAB ---
const mockAssignments = [
  {
    id: 'A1',
    userId: 'user1',
    players: ['p1', 'p2', 'p3'],
    status: 'ממתין',
    assignedAt: '2024-06-01',
    completedAt: '',
    ratings: [
      { playerId: 'p1', rating: 8, comment: 'שחקן טוב' },
      { playerId: 'p2', rating: 7, comment: '' },
      { playerId: 'p3', rating: null, comment: '' },
    ],
  },
  {
    id: 'A2',
    userId: 'user2',
    players: ['p2', 'p4'],
    status: 'הושלם',
    assignedAt: '2024-05-28',
    completedAt: '2024-05-29',
    ratings: [
      { playerId: 'p2', rating: 9, comment: 'מעולה' },
      { playerId: 'p4', rating: 6, comment: 'צריך להשתפר' },
    ],
  },
];
const mockUsers = [
  { uid: 'user1', name: 'דני כהן' },
  { uid: 'user2', name: 'רוני לוי' },
];
const mockPlayers = [
  { id: 'p1', name: 'יוסי' },
  { id: 'p2', name: 'משה' },
  { id: 'p3', name: 'אבי' },
  { id: 'p4', name: 'גדי' },
];

export default function PlayerManagerPage() {
  // --- STATE FOR ASSIGNMENTS TAB (must be inside the component) ---
  const [activeTab, setActiveTab] = useState<'players' | 'assignments'>('players');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);

  const { players, loading, error } = usePlayersCache();
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<any>(null);
  const { showToast } = useToast ? useToast() : { showToast: () => {} };
  const [sortField, setSortField] = useState<'name' | 'user' | 'rating'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editGoals, setEditGoals] = useState(0);
  const [editAssists, setEditAssists] = useState(0);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const { users: allUsers, loading: loadingUsers } = useUsersCache();
  const [editLoading, setEditLoading] = useState(false);
  const { user, userData } = useAuth();
  const isSuperAdmin = userData?.role === 'super-admin';
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);
  const [playerAverages, setPlayerAverages] = useState<Record<string, number>>({});
  const [playerRatings, setPlayerRatings] = useState<Record<string, { userId: string, rating: number }[]>>({});
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [playerDialogData, setPlayerDialogData] = useState<any>(null);
  const [editPlayerMode, setEditPlayerMode] = useState(false);
  const [showOnlySubscriptions, setShowOnlySubscriptions] = useState(false);
  const [showOnlyLinkedUsers, setShowOnlyLinkedUsers] = useState(false);
  const [showOnlyActivePlayers, setShowOnlyActivePlayers] = useState(false);
  const { subscriptions: subsByDay, loading: loadingSubs } = useSubscriptionsCache();
  const dayMap: Record<string, string> = {
    Sunday: 'ראשון',
    Monday: 'שני',
    Tuesday: 'שלישי',
    Wednesday: 'רביעי',
    Thursday: 'חמישי',
  };
  const playerSubscriptions: Record<string, string> = {};
  Object.entries(subsByDay).forEach(([day, players]) => {
    players.forEach((p: any) => {
      playerSubscriptions[p.id] = dayMap[day] || day;
    });
  });

  // --- STATE FOR ASSIGNMENTS TAB (inside component) ---
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [ratingsCache, setRatingsCache] = useState<Record<string, any[]>>({}); // assignmentId -> [{playerId, rating}]

  // --- HELPERS FOR REAL DATA (must be after allUsers and players are defined) ---
  const getUserName = (userId: string) => allUsers.find((u: any) => u.uid === userId)?.name || allUsers.find((u: any) => u.uid === userId)?.email || userId;
  const getPlayerName = (playerId: string) => players.find((p: any) => p.id === playerId)?.name || playerId;

  // --- Date formatting helper ---
  const formatDate = (ts: any) => {
    if (!ts) return '-';
    if (typeof ts === 'string') return ts.split('T')[0];
    if (ts.toDate) return ts.toDate().toLocaleDateString('he-IL');
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString('he-IL');
    return '-';
  };

  // Fetch all rankingTasks from Firestore
  useEffect(() => {
    async function fetchAssignments() {
      setLoadingAssignments(true);
      const snap = await getDocsFirestore(collection(db, 'rankingTasks'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssignments(data);
      setLoadingAssignments(false);
    }
    fetchAssignments();
  }, []);

  // On modal open, fetch ratings for assignment's user and players
  useEffect(() => {
    async function fetchRatingsForAssignment(assignment: any) {
      if (!assignment || !assignment.players || !assignment.userId) return;
      if (ratingsCache[assignment.id]) return; // already cached
      const results: any[] = [];
      for (const playerId of assignment.players) {
        const ratingDocRef = doc(db, `playerRatings/${playerId}/ratings/${assignment.userId}`);
        const ratingDoc = await getDocsFirestore(collection(db, `playerRatings/${playerId}/ratings`));
        const userRatingDoc = ratingDoc.docs.find(d => d.id === assignment.userId);
        if (userRatingDoc && userRatingDoc.exists()) {
          const data = userRatingDoc.data();
          results.push({ playerId, rating: data.rating ?? 'לא דורג' });
        } else {
          results.push({ playerId, rating: 'לא דורג' });
        }
      }
      setRatingsCache(prev => ({ ...prev, [assignment.id]: results }));
    }
    if (selectedAssignment) {
      fetchRatingsForAssignment(selectedAssignment);
    }
  }, [selectedAssignment, ratingsCache, players, allUsers]);

  // Filtering and sorting for assignments (use real data)
  const filteredAssignments = assignments
    .filter(a =>
      (assignmentStatusFilter === 'all' ||
        (assignmentStatusFilter === 'completed' && a.completed) ||
        (assignmentStatusFilter === 'pending' && !a.completed)) &&
      (getUserName(a.userId).includes(assignmentSearch) ||
        a.id.includes(assignmentSearch) ||
        (Array.isArray(a.players) && a.players.some((p: string) => getPlayerName(p).includes(assignmentSearch)))
      )
    );

  // Move handleSort here so it's in scope for the JSX
  const handleSort = (field: 'name' | 'user' | 'rating') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Batch fetch user emails for all players with userID - OPTIMIZED
  useEffect(() => {
    if (!players || players.length === 0) return;
    
    // Only fetch emails if we don't have them already
    const playersWithUserIds = players.filter((p: any) => p.userId && !userEmails[p.userId]);
    if (playersWithUserIds.length === 0) return;
    
    async function fetchEmails() {
      const ids = playersWithUserIds
        .map((p: any) => p.userId)
        .filter((id: string | undefined) => !!id);
      
      if (ids.length === 0) return;
      
      try {
        const entries = await Promise.all(
          ids.map(async (id: string) => {
            try {
              const user = await getUserData(id);
              return [id, user?.email || null];
            } catch (err) {
              console.error('Error fetching user for id', id, err);
              return [id, null];
            }
          })
        );
        setUserEmails(prev => ({ ...prev, ...Object.fromEntries(entries) }));
      } catch (error) {
        console.error('Error in batch email fetch:', error);
      }
    }
    
    fetchEmails();
  }, [players, userEmails]);

  // Fetch subscriptions for all players
  useEffect(() => {
    async function fetchSubs() {
      const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'];
      const subs: Record<string, string> = {};
      for (const day of days) {
        const snap = await getDocsFirestore(collection(db, 'subscriptions'));
        snap.docs.forEach(doc => {
          if (doc.id === day) {
            (doc.data().players || []).forEach((p: any) => {
              subs[p.id] = day;
            });
          }
        });
      }
      // This useEffect is now redundant as playerSubscriptions is managed by useSubscriptionsCache
      // setSubscriptions(subs);
    }
    fetchSubs();
  }, []);

  // Open edit dialog and populate fields
  const handleOpenEdit = (player: any) => {
    setPlayerToEdit(player);
    setEditName(player.name || '');
    setEditGoals(player.totalGoals ?? 0);
    setEditAssists(player.totalAssists ?? 0);
    setEditUserId(player.userId || null);
    setEditDialogOpen(true);
  };

  // Save changes
  const handleSaveEdit = async () => {
    if (!playerToEdit) return;
    setEditLoading(true);
    try {
      // Update player doc
      await updateDoc(doc(db, 'players', playerToEdit.id), {
        name: editName,
        totalGoals: Number(editGoals),
        totalAssists: Number(editAssists),
        userId: editUserId || undefined
      });
      // Handle user linkage
      const prevUserId = playerToEdit.userId;
      if (prevUserId && prevUserId !== editUserId) {
        // Unlink previous user
        await updateDoc(doc(db, 'users', prevUserId), {
          playerId: undefined,
          playerName: undefined
        });
      }
      if (editUserId) {
        // Link new user
        const userDocRef = doc(db, 'users', editUserId);
        const userDoc = await getUserData(editUserId);
        await setDoc(userDocRef, {
          ...userDoc,
          playerId: playerToEdit.id,
          playerName: editName
        }, { merge: true });
      }
      showToast && showToast('שחקן עודכן בהצלחה', 'success');
      setEditDialogOpen(false);
      setPlayerToEdit(null);
    } catch (err) {
      showToast && showToast('שגיאה בעדכון שחקן', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Unlink user
  const handleUnlinkUser = () => {
    setEditUserId(null);
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;
    setAdding(true);
    try {
      await addDoc(collection(db, 'players'), {
        name: newPlayerName.trim(),
        totalWins: 0,
        totalMiniGames: 0,
        totalGoals: 0,
        totalGameNights: 0,
        totalAssists: 0,
        isActive: true
      });
      setAddDialogOpen(false);
      setNewPlayerName('');
      showToast && showToast('שחקן נוסף בהצלחה', 'success');
    } catch (err) {
      showToast && showToast('שגיאה בהוספת שחקן', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (!playerToDelete) return;
    setAdding(true);
    try {
      // 1. Remove player doc
      await deleteDoc(doc(db, 'players', playerToDelete.id));
      // 2. If player has userId, update user doc
      if (playerToDelete.userId) {
        await updateDoc(doc(db, 'users', playerToDelete.userId), {
          playerId: undefined,
          playerName: undefined
        });
      }
      showToast && showToast('שחקן נמחק בהצלחה', 'success');
    } catch (err) {
      showToast && showToast('שגיאה במחיקת שחקן', 'error');
    } finally {
      setAdding(false);
      setDeleteDialogOpen(false);
      setPlayerToDelete(null);
      setSearch(''); // Clear search filter after delete
    }
  };

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let result = players;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p: any) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.userId && userEmails[p.userId] && userEmails[p.userId].toLowerCase().includes(q))
      );
    }
    // Sorting
    return result.slice().sort((a: any, b: any) => {
      let aValue = '';
      let bValue = '';
      if (sortField === 'name') {
        aValue = a.name || '';
        bValue = b.name || '';
        if (sortDirection === 'asc') return aValue.localeCompare(bValue, 'he');
        else return bValue.localeCompare(aValue, 'he');
      } else if (sortField === 'user') {
        aValue = a.userId ? userEmails[a.userId] || '' : '';
        bValue = b.userId ? userEmails[b.userId] || '' : '';
        if (sortDirection === 'asc') return aValue.localeCompare(bValue, 'he');
        else return bValue.localeCompare(aValue, 'he');
      } else if (sortField === 'rating') {
        const aRating = playerAverages[a.id] ?? -Infinity;
        const bRating = playerAverages[b.id] ?? -Infinity;
        if (sortDirection === 'asc') return aRating - bRating;
        else return bRating - aRating;
      }
      return 0;
    });
  }, [players, search, userEmails, sortField, sortDirection]);

  // Fetch player averages for super-admin
  useEffect(() => {
    if (!isSuperAdmin) return;
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
  }, [isSuperAdmin]);
  // Fetch all ratings for all players for super-admin - OPTIMIZED
  useEffect(() => {
    if (!isSuperAdmin || players.length === 0) return;
    
    // Only fetch ratings if we're actually viewing them (e.g., when a specific player is selected)
    // This reduces the number of simultaneous listeners
    const unsubscribes: (() => void)[] = [];
    
    // Limit to first 20 players to prevent too many listeners
    const playersToMonitor = players.slice(0, 20);
    
    playersToMonitor.forEach(player => {
      const qRef = collection(db, `playerRatings/${player.id}/ratings`);
      const unsub = onSnapshot(qRef, (snap) => {
        setPlayerRatings(prev => ({
          ...prev,
          [player.id]: snap.docs.map(d => ({ userId: d.id, rating: d.data().rating ?? 0 }))
        }));
      }, (error) => {
        console.error(`Error listening to ratings for player ${player.id}:`, error);
      });
      unsubscribes.push(unsub);
    });
    
    return () => { 
      unsubscribes.forEach(unsub => unsub()); 
    };
  }, [players, isSuperAdmin]);
  // Assign ranking task logic
  const handleAssignTask = async () => {
    if (!selectedUser) return;
    setAssigning(true);
    setAssignMessage(null);
    try {
      // Use a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Assignment timeout')), 10000)
      );
      
      const assignmentPromise = setDoc(doc(db, 'rankingTasks', selectedUser), {
        userId: selectedUser,
        assignedAt: new Date().toISOString(),
        completed: false,
      });
      
      await Promise.race([assignmentPromise, timeoutPromise]);
      
      setAssignMessage('המשימה הוקצתה בהצלחה!');
      showToast && showToast('המשימה הוקצתה בהצלחה!', 'success');
      setSelectedUser('');
      setAssignDialogOpen(false);
    } catch (err: any) {
      console.error('Assignment error:', err);
      const errorMessage = err.message === 'Assignment timeout' 
        ? 'הקצאת המשימה ארכה זמן רב מדי. אנא נסה שוב.'
        : 'שגיאה בהקצאת המשימה';
      setAssignMessage(errorMessage);
      showToast && showToast(errorMessage, 'error');
    } finally {
      setAssigning(false);
    }
  };

  // Calculate the filtered players for display count
  const displayedPlayers = filteredPlayers.filter(player =>
    (!showOnlySubscriptions || playerSubscriptions[player.id]) &&
    (!showOnlyLinkedUsers || !!player.userId) &&
    (!showOnlyActivePlayers || (player.totalGameNights && player.totalGameNights > 0))
  );

  // In the player dialog, under the player name, show the role in Hebrew if the player is linked to a user
  const getUserRoleLabel = (role: string | undefined) => {
    if (role === 'super-admin') return 'סופר אדמין';
    if (role === 'admin') return 'אדמין';
    if (role === 'user') return 'משתמש';
    return '';
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // In the assignment details modal logic:
  // Determine which players to show: assignment.players if exists, otherwise all players rated by userId
  const [modalPlayers, setModalPlayers] = useState<string[]>([]);

  useEffect(() => {
    async function fetchModalPlayersAndRatings(assignment: any) {
      if (!assignment || !assignment.userId) return;
      let playerIds: string[] = [];
      if (Array.isArray(assignment.players) && assignment.players.length > 0) {
        playerIds = assignment.players;
      } else {
        // Find all players that have a rating by this user
        const allPlayerSnaps = await getDocsFirestore(collection(db, 'playerRatings'));
        const found: string[] = [];
        for (const playerDoc of allPlayerSnaps.docs) {
          const ratingsSnap = await getDocsFirestore(collection(db, `playerRatings/${playerDoc.id}/ratings`));
          if (ratingsSnap.docs.some(d => d.id === assignment.userId)) {
            found.push(playerDoc.id);
          }
        }
        playerIds = found;
      }
      setModalPlayers(playerIds);
      // Fetch ratings for these players
      const results: any[] = [];
      for (const playerId of playerIds) {
        const ratingSnap = await getDocsFirestore(collection(db, `playerRatings/${playerId}/ratings`));
        const userRatingDoc = ratingSnap.docs.find(d => d.id === assignment.userId);
        if (userRatingDoc && userRatingDoc.exists()) {
          const data = userRatingDoc.data();
          results.push({ playerId, rating: data.rating ?? 'לא דורג' });
        } else {
          results.push({ playerId, rating: 'לא דורג' });
        }
      }
      setRatingsCache(prev => ({ ...prev, [assignment.id]: results }));
    }
    if (selectedAssignment) {
      fetchModalPlayersAndRatings(selectedAssignment);
    } else {
      setModalPlayers([]);
    }
  }, [selectedAssignment, players, allUsers]);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', py: 4 }}>
      <Typography variant="h4" fontWeight={900} color="primary" align="center" gutterBottom>
        ניהול שחקנים
      </Typography>
      {/* Tabs navigation */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        textColor="primary"
        centered
        sx={{ mb: 3 }}
      >
        <Tab label="ניהול שחקנים" value="players" />
        <Tab label="משימות דירוג" value="assignments" />
      </Tabs>
      {/* Tab content - only one parent element */}
      {activeTab === 'players' ? (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Paper
                sx={{
                  p: 2,
                  mb: 2,
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'center',
                  gap: isMobile ? 2 : 3,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: isMobile ? '100%' : 'auto' }}>
                  <SubscriptionsIcon color={showOnlySubscriptions ? 'primary' : 'disabled'} />
                  <Switch
                    checked={showOnlySubscriptions}
                    onChange={e => setShowOnlySubscriptions(e.target.checked)}
                    color="primary"
                    inputProps={{ 'aria-label': 'הצג רק מנויים' }}
                  />
                  <Typography variant="body2">הצג רק מנויים</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: isMobile ? '100%' : 'auto' }}>
                  <PersonIcon color={showOnlyLinkedUsers ? 'primary' : 'disabled'} />
                  <Switch
                    checked={showOnlyLinkedUsers}
                    onChange={e => setShowOnlyLinkedUsers(e.target.checked)}
                    color="primary"
                    inputProps={{ 'aria-label': 'הצג רק שחקנים עם משתמש מקושר' }}
                  />
                  <Typography variant="body2">הצג רק שחקנים עם משתמש מקושר</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: isMobile ? '100%' : 'auto' }}>
                  <StarIcon color={showOnlyActivePlayers ? 'primary' : 'disabled'} />
                  <Switch
                    checked={showOnlyActivePlayers}
                    onChange={e => setShowOnlyActivePlayers(e.target.checked)}
                    color="primary"
                    inputProps={{ 'aria-label': 'הצג שחקנים פעילים' }}
                  />
                  <Typography variant="body2">הצג שחקנים פעילים</Typography>
                </Box>
                <Box sx={{ flex: isMobile ? 'none' : 1, height: isMobile ? 0 : 'auto' }} />
                <TextField
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="חפש שחקן"
                  variant="outlined"
                  size="small"
                  sx={{ minWidth: isMobile ? '100%' : 200, width: isMobile ? '100%' : 'auto' }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setAddDialogOpen(true)}
                  startIcon={<AddIcon sx={{ ml: 1 }} />}
                  sx={{
                    direction: 'rtl',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: isMobile ? '100%' : 'auto',
                    mt: isMobile ? 1 : 0,
                  }}
                >
                  הוסף שחקן
                </Button>
                {isSuperAdmin && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setAssignDialogOpen(true)}
                    sx={{ width: isMobile ? '100%' : 'auto', mt: isMobile ? 1 : 0 }}
                  >
                    הקצה משימת דירוג
                  </Button>
                )}
              </Paper>
            </CardContent>
          </Card>
          <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
            <DialogTitle>הוסף שחקן חדש</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="שם שחקן"
                fullWidth
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                disabled={adding}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAddDialogOpen(false)} disabled={adding}>ביטול</Button>
              <Button onClick={handleAddPlayer} variant="contained" disabled={!newPlayerName.trim() || adding}>שמור</Button>
            </DialogActions>
          </Dialog>
          <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
            <DialogTitle>מחיקת שחקן</DialogTitle>
            <DialogContent>
              האם אתה בטוח שברצונך למחוק את השחקן "{playerToDelete?.name}"? פעולה זו אינה הפיכה.
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)} disabled={adding}>ביטול</Button>
              <Button onClick={handleDeletePlayer} color="error" variant="contained" disabled={adding}>מחק</Button>
            </DialogActions>
          </Dialog>
          <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
            <DialogTitle>עריכת שחקן</DialogTitle>
            <DialogContent>
              <TextField
                label="שם"
                fullWidth
                margin="dense"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                disabled={editLoading}
              />
              <TextField
                label={'סה"כ שערים'}
                type="number"
                fullWidth
                margin="dense"
                value={editGoals}
                onChange={e => setEditGoals(Number(e.target.value))}
                disabled={editLoading}
              />
              <TextField
                label={'סה"כ בישולים'}
                type="number"
                fullWidth
                margin="dense"
                value={editAssists}
                onChange={e => setEditAssists(Number(e.target.value))}
                disabled={editLoading}
              />
              {editUserId ? (
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    label="משתמש מקושר"
                    value={allUsers.find(u => u.uid === editUserId)?.email || ''}
                    fullWidth
                    disabled
                  />
                  <Button onClick={handleUnlinkUser} color="warning" disabled={editLoading}>הסר קישור</Button>
                </Box>
              ) : (
                <Autocomplete
                  options={allUsers}
                  getOptionLabel={option => option.email || ''}
                  value={allUsers.find(u => u.uid === editUserId) || null}
                  onChange={(_, v) => setEditUserId(v ? v.uid : null)}
                  renderInput={params => (
                    <TextField {...params} label="קשר משתמש (אופציונלי)" margin="dense" fullWidth disabled={editLoading || loadingUsers} />
                  )}
                  isOptionEqualToValue={(option, value) => option.uid === value?.uid}
                  getOptionDisabled={option => option.playerId && option.playerId !== playerToEdit?.id}
                  renderOption={(props, option) => (
                    <li {...props} style={option.playerId && option.playerId !== playerToEdit?.id ? { color: '#888' } : {}}>
                      {option.email + (option.playerId && option.playerId !== playerToEdit?.id ? ' (כבר מקושר)' : '')}
                    </li>
                  )}
                />
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditDialogOpen(false)} disabled={editLoading}>ביטול</Button>
              <Button onClick={handleSaveEdit} variant="contained" disabled={editLoading || !editName.trim()}>שמור</Button>
            </DialogActions>
          </Dialog>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
          ) : error ? (
            <Typography color="error">שגיאה בטעינת השחקנים: {error}</Typography>
          ) : (
            <Box>
              {/* Assign Task Dialog */}
              <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)}>
                <DialogTitle>הקצה משימת דירוג</DialogTitle>
                <DialogContent>
                  <Autocomplete
                    options={allUsers}
                    getOptionLabel={option => option.email || option.name || option.uid || option.id || ''}
                    value={allUsers.find(u => (u.uid || u.id) === selectedUser) || null}
                    onChange={(_, v) => setSelectedUser(v?.uid || v?.id || '')}
                    renderInput={params => <TextField {...params} label="בחר משתמש" variant="outlined" />}
                    sx={{ width: 300, mb: 2 }}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setAssignDialogOpen(false)}>ביטול</Button>
                  <Button onClick={handleAssignTask} disabled={!selectedUser || assigning} variant="contained" color="primary">
                    {assigning ? 'מעדכן...' : 'הקצה'}
                  </Button>
                </DialogActions>
                {assignMessage && <Typography color={assignMessage.startsWith('שגיאה') ? 'error' : 'primary'} sx={{ m: 2 }}>{assignMessage}</Typography>}
              </Dialog>
              {/* Player Details Dialog */}
              <Dialog open={playerDialogOpen} onClose={() => { setPlayerDialogOpen(false); setEditPlayerMode(false); }} maxWidth="xs" fullWidth>
                <DialogTitle>פרטי שחקן</DialogTitle>
                <DialogContent>
                  {playerDialogData && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="h6">{playerDialogData.name}</Typography>
                        {!editPlayerMode && (
                          <Button variant="outlined" color="primary" size="small" onClick={() => {
                            setEditGoals(playerDialogData.totalGoals ?? 0);
                            setEditAssists(playerDialogData.totalAssists ?? 0);
                            setEditPlayerMode(true);
                          }}>ערוך</Button>
                        )}
                      </Box>
                      {/* Show user role under name if linked */}
                      {playerDialogData.userId && (
                        <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                          {getUserRoleLabel(allUsers.find(u => (u.uid || u.id) === playerDialogData.userId)?.role)}
                        </Typography>
                      )}
                      <Typography>משחקי ערב: {playerDialogData.totalGameNights ?? '-'}</Typography>
                      <Typography>מיני-משחקים: {playerDialogData.totalMiniGames ?? '-'}</Typography>
                      <Typography>ניצחונות: {playerDialogData.totalWins ?? '-'}</Typography>
                      {editPlayerMode ? (
                        <>
                          <TextField
                            label="שערים"
                            type="number"
                            value={editGoals}
                            onChange={e => setEditGoals(Number(e.target.value))}
                            fullWidth
                            sx={{ my: 1 }}
                          />
                          <TextField
                            label="בישולים"
                            type="number"
                            value={editAssists}
                            onChange={e => setEditAssists(Number(e.target.value))}
                            fullWidth
                            sx={{ my: 1 }}
                          />
                        </>
                      ) : (
                        <>
                          <Typography>שערים: {playerDialogData.totalGoals ?? '-'}</Typography>
                          <Typography>בישולים: {playerDialogData.totalAssists ?? '-'}</Typography>
                        </>
                      )}
                      {isSuperAdmin && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle1" fontWeight={700}>דירוגים לפי משתמש:</Typography>
                          {playerRatings[playerDialogData.id]?.length > 0 ? (
                            playerRatings[playerDialogData.id].map(r => {
                              const user = allUsers.find(u => (u.uid || u.id) === r.userId);
                              return (
                                <Box key={r.userId} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography>{user ? (user.email || user.name || user.uid || user.id) : r.userId}</Typography>
                                  <Typography fontWeight={700}>{r.rating}</Typography>
                                </Box>
                              );
                            })
                          ) : (
                            <Typography color="text.secondary">אין דירוגים לשחקן זה.</Typography>
                          )}
                        </Box>
                      )}
                      {editPlayerMode && (
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            color="primary"
                            disabled={editLoading}
                            onClick={async () => {
                              setEditLoading(true);
                              try {
                                await updateDoc(doc(db, 'players', playerDialogData.id), {
                                  totalGoals: editGoals,
                                  totalAssists: editAssists,
                                });
                                setPlayerDialogData({ ...playerDialogData, totalGoals: editGoals, totalAssists: editAssists });
                                setEditPlayerMode(false);
                                showToast && showToast('השחקן עודכן בהצלחה', 'success');
                              } catch (err) {
                                showToast && showToast('שגיאה בעדכון שחקן', 'error');
                              } finally {
                                setEditLoading(false);
                              }
                            }}
                          >שמור</Button>
                          <Button variant="outlined" color="secondary" onClick={() => setEditPlayerMode(false)}>ביטול</Button>
                        </Box>
                      )}
                      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                        <Button variant="outlined" color="primary" onClick={() => { setPlayerDialogOpen(false); setEditPlayerMode(false); }}>סגור</Button>
                      </Box>
                    </Box>
                  )}
                </DialogContent>
              </Dialog>
              {/* Above the table, show the count */}
              <Typography variant="subtitle2" sx={{ mb: 1, textAlign: 'right' }}>
                מספר שחקנים מוצגים: {displayedPlayers.length}
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                        שם שחקן
                        {sortField === 'name' && (sortDirection === 'asc' ? <ArrowDropUpIcon fontSize="small" /> : <ArrowDropDownIcon fontSize="small" />)}
                      </TableCell>
                      <TableCell onClick={() => handleSort('user')} style={{ cursor: 'pointer' }}>
                        משתמש
                        {sortField === 'user' && (sortDirection === 'asc' ? <ArrowDropUpIcon fontSize="small" /> : <ArrowDropDownIcon fontSize="small" />)}
                      </TableCell>
                      <TableCell>מנוי</TableCell>
                      {isSuperAdmin && (
                        <TableCell onClick={() => handleSort('rating')} style={{ cursor: 'pointer' }}>
                          ממוצע דירוג
                          {sortField === 'rating' && (sortDirection === 'asc' ? <ArrowDropUpIcon fontSize="small" /> : <ArrowDropDownIcon fontSize="small" />)}
                        </TableCell>
                      )}
                      <TableCell>מחיקה</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedPlayers.map((player: any) => (
                        <TableRow key={player.id} hover style={{ cursor: 'pointer' }} onClick={() => { setPlayerDialogData(player); setPlayerDialogOpen(true); }}>
                          <TableCell>{player.name}</TableCell>
                          <TableCell>{player.userId ? userEmails[player.userId] : ''}</TableCell>
                          <TableCell>{playerSubscriptions[player.id] ? `מנוי ${playerSubscriptions[player.id]}` : ''}</TableCell>
                          {isSuperAdmin && <TableCell>{playerAverages[player.id] !== undefined ? playerAverages[player.id].toFixed(2) : '-'}</TableCell>}
                          <TableCell>
                            <IconButton onClick={e => { e.stopPropagation(); setPlayerToDelete(player); setDeleteDialogOpen(true); }}><DeleteIcon /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </>
      ) : (
        // --- Assignments Tab UI ---
        <Box>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
            <TextField
              value={assignmentSearch}
              onChange={e => setAssignmentSearch(e.target.value)}
              placeholder="חפש לפי משתמש, מזהה משימה, שחקן, סטטוס..."
              variant="outlined"
              size="small"
              sx={{ minWidth: 220, flex: 1 }}
              fullWidth
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="assignment-status-filter-label">סנן לפי סטטוס</InputLabel>
              <Select
                labelId="assignment-status-filter-label"
                value={assignmentStatusFilter}
                label="סנן לפי סטטוס"
                onChange={e => setAssignmentStatusFilter(e.target.value as any)}
              >
                <MenuItem value="all">הכל</MenuItem>
                <MenuItem value="completed">הושלם בלבד</MenuItem>
                <MenuItem value="pending">ממתין בלבד</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>משתמש</TableCell>
                  <TableCell>מזהה משימה</TableCell>
                  <TableCell>שחקנים לדירוג</TableCell>
                  <TableCell>סטטוס</TableCell>
                  <TableCell>תאריך הקצאה</TableCell>
                  <TableCell>תאריך סיום</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAssignments.map(a => (
                  <TableRow key={a.id} hover style={{ cursor: 'pointer' }} onClick={() => { setSelectedAssignment(a); setAssignmentDialogOpen(true); }}>
                    <TableCell>{getUserName(a.userId)}</TableCell>
                    <TableCell>{a.id}</TableCell>
                    <TableCell>{Array.isArray(a.players) ? a.players.map(getPlayerName).join(', ') : ''}</TableCell>
                    <TableCell>{a.status}</TableCell>
                    <TableCell>{formatDate(a.assignedAt)}</TableCell>
                    <TableCell>{formatDate(a.completedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {/* Assignment Details Dialog */}
          <Dialog open={assignmentDialogOpen} onClose={() => setAssignmentDialogOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle>פרטי משימת דירוג</DialogTitle>
            <DialogContent>
              {selectedAssignment && (
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>משתמש: {getUserName(selectedAssignment.userId)}</Typography>
                  <Typography variant="body2">סטטוס: {selectedAssignment.status}</Typography>
                  <Typography variant="body2">תאריך הקצאה: {formatDate(selectedAssignment.assignedAt)}</Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>תאריך סיום: {formatDate(selectedAssignment.completedAt)}</Typography>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>שחקנים לדירוג:</Typography>
                  <ul style={{ margin: 0, paddingInlineStart: 20 }}>
                    {(Array.isArray(selectedAssignment.players) ? selectedAssignment.players : []).map((p: string) => (
                      <li key={p}>{getPlayerName(p)}</li>
                    ))}
                  </ul>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>דירוגים:</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>שחקן</TableCell>
                          <TableCell>דירוג</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {modalPlayers.map((playerId: string) => {
                          const rows = Array.isArray(ratingsCache?.[selectedAssignment.id]) ? ratingsCache[selectedAssignment.id] : [];
                          const ratingRow = rows.find((r: any) => r.playerId === playerId);
                          return (
                            <TableRow key={playerId}>
                              <TableCell>{getPlayerName(playerId)}</TableCell>
                              <TableCell>{ratingRow ? ratingRow.rating : 'לא דורג'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAssignmentDialogOpen(false)}>סגור</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
} 