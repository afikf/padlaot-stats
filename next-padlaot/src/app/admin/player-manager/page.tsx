'use client';
import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, TextField, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Autocomplete, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Switch } from '@mui/material';
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

export default function PlayerManagerPage() {
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

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', py: 4 }}>
      <Typography variant="h4" fontWeight={900} color="primary" align="center" gutterBottom>
        ניהול שחקנים
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SubscriptionsIcon color={showOnlySubscriptions ? 'primary' : 'disabled'} />
              <Switch
                checked={showOnlySubscriptions}
                onChange={e => setShowOnlySubscriptions(e.target.checked)}
                color="primary"
                inputProps={{ 'aria-label': 'הצג רק מנויים' }}
              />
              <Typography variant="body2">הצג רק מנויים</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon color={showOnlyLinkedUsers ? 'primary' : 'disabled'} />
              <Switch
                checked={showOnlyLinkedUsers}
                onChange={e => setShowOnlyLinkedUsers(e.target.checked)}
                color="primary"
                inputProps={{ 'aria-label': 'הצג רק שחקנים עם משתמש מקושר' }}
              />
              <Typography variant="body2">הצג רק שחקנים עם משתמש מקושר</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StarIcon color={showOnlyActivePlayers ? 'primary' : 'disabled'} />
              <Switch
                checked={showOnlyActivePlayers}
                onChange={e => setShowOnlyActivePlayers(e.target.checked)}
                color="primary"
                inputProps={{ 'aria-label': 'הצג שחקנים פעילים' }}
              />
              <Typography variant="body2">הצג שחקנים פעילים</Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            <TextField
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חפש שחקן"
              variant="outlined"
              size="small"
              sx={{ minWidth: 200 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={() => setAddDialogOpen(true)}
              startIcon={<AddIcon sx={{ ml: 1 }} />}
              sx={{ direction: 'rtl', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              הוסף שחקן
            </Button>
            {isSuperAdmin && (
              <Button variant="contained" color="primary" onClick={() => setAssignDialogOpen(true)}>
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
    </Box>
  );
} 