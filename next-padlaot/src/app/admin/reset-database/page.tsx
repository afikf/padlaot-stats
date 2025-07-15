'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Alert, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip
} from '@mui/material';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';

interface CollectionStats {
  name: string;
  count: number;
}

export default function ResetDatabasePage() {
  const { user, userData } = useAuth();
  const { isSuperAdmin } = useAdmin();
  const { showToast } = useToast();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<CollectionStats[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [finalConfirmDialogOpen, setFinalConfirmDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, collection: '' });

  // Collections to reset (in order of dependencies)
  const collectionsToReset = [
    'playerRatings',
    'rankingTasks', 
    'gameDays',
    'subscriptions',
    'players',
    'users'
  ];

  // Check if user is super admin
  if (!isSuperAdmin) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ maxWidth: 600, mx: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            גישה נדחתה
          </Typography>
          <Typography>
            רק מנהל ראשי יכול לגשת לעמוד זה.
          </Typography>
        </Alert>
      </Box>
    );
  }

  const fetchDatabaseStats = async () => {
    setLoading(true);
    try {
      const statsData: CollectionStats[] = [];
      
      for (const collectionName of collectionsToReset) {
        const snapshot = await getDocs(collection(db, collectionName));
        statsData.push({
          name: collectionName,
          count: snapshot.size
        });
      }
      
      setStats(statsData);
      showToast('סטטיסטיקות מסד הנתונים נטענו בהצלחה', 'success');
    } catch (error) {
      console.error('Error fetching database stats:', error);
      showToast('שגיאה בטעינת סטטיסטיקות מסד הנתונים', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetDatabase = async () => {
    if (confirmationText !== 'RESET') {
      showToast('יש להקליד RESET לאישור', 'error');
      return;
    }

    setLoading(true);
    setFinalConfirmDialogOpen(false);
    setConfirmDialogOpen(false);
    
    try {
      let totalDocuments = 0;
      let processedDocuments = 0;

      // Calculate total documents first
      for (const collectionName of collectionsToReset) {
        const snapshot = await getDocs(collection(db, collectionName));
        totalDocuments += snapshot.size;
      }

      setProgress({ current: 0, total: totalDocuments, collection: '' });

      // Reset collections in order (respecting dependencies)
      for (const collectionName of collectionsToReset) {
        setProgress(prev => ({ ...prev, collection: collectionName }));
        
        const snapshot = await getDocs(collection(db, collectionName));
        const batch = writeBatch(db);
        
        snapshot.docs.forEach((docSnapshot) => {
          batch.delete(docSnapshot.ref);
          processedDocuments++;
          setProgress({ current: processedDocuments, total: totalDocuments, collection: collectionName });
        });
        
        await batch.commit();
      }

      showToast('מסד הנתונים אופס בהצלחה!', 'success');
      setStats([]);
      setProgress({ current: 0, total: 0, collection: '' });
      
      // Redirect to admin page after successful reset
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
      
    } catch (error) {
      console.error('Error resetting database:', error);
      showToast('שגיאה באיפוס מסד הנתונים', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 4 }}>
      <Typography variant="h4" gutterBottom align="center" color="error">
        איפוס מסד הנתונים
      </Typography>
      
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          אזהרה!
        </Typography>
        <Typography>
          פעולה זו תמחק את כל הנתונים במסד הנתונים ללא אפשרות שחזור.
          <br />
          <strong>פעולה זו אינה הפיכה!</strong>
        </Typography>
      </Alert>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          סטטיסטיקות מסד הנתונים
        </Typography>
        
        {stats.length > 0 ? (
          <List>
            {stats.map((stat, index) => (
              <React.Fragment key={stat.name}>
                <ListItem>
                  <ListItemText 
                    primary={stat.name}
                    secondary={`${stat.count} מסמכים`}
                  />
                  <Chip 
                    label={stat.count} 
                    color={stat.count > 0 ? "error" : "success"}
                    size="small"
                  />
                </ListItem>
                {index < stats.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">
            לחץ על "טען סטטיסטיקות" כדי לראות את מצב מסד הנתונים
          </Typography>
        )}
        
        <Box sx={{ mt: 2 }}>
          <Button 
            variant="outlined" 
            onClick={fetchDatabaseStats}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            טען סטטיסטיקות
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, bgcolor: 'error.light' }}>
        <Typography variant="h6" gutterBottom color="error">
          פעולות מסוכנות
        </Typography>
        
        <Button 
          variant="contained" 
          color="error" 
          size="large"
          onClick={() => setConfirmDialogOpen(true)}
          disabled={loading}
          sx={{ fontWeight: 'bold' }}
        >
          איפוס מסד הנתונים
        </Button>
      </Paper>

      {/* Progress indicator */}
      {loading && progress.total > 0 && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            מתקדם באיפוס...
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            אוסף: {progress.collection}
          </Typography>
          <Typography variant="body2">
            {progress.current} מתוך {progress.total} מסמכים
          </Typography>
          <Box sx={{ mt: 2 }}>
            <CircularProgress 
              variant="determinate" 
              value={(progress.current / progress.total) * 100} 
              size={40}
            />
          </Box>
        </Paper>
      )}

      {/* First confirmation dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>אישור איפוס מסד הנתונים</DialogTitle>
        <DialogContent>
          <Typography>
            האם אתה בטוח שברצונך לאפס את כל מסד הנתונים?
            <br />
            <strong>פעולה זו אינה הפיכה!</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            ביטול
          </Button>
          <Button 
            color="error" 
            onClick={() => {
              setConfirmDialogOpen(false);
              setFinalConfirmDialogOpen(true);
            }}
          >
            המשך
          </Button>
        </DialogActions>
      </Dialog>

      {/* Final confirmation dialog */}
      <Dialog open={finalConfirmDialogOpen} onClose={() => setFinalConfirmDialogOpen(false)}>
        <DialogTitle>אישור סופי</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            כדי לאשר את האיפוס, הקלד <strong>RESET</strong> בתיבת הטקסט:
          </Typography>
          <TextField
            fullWidth
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="הקלד RESET"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFinalConfirmDialogOpen(false)}>
            ביטול
          </Button>
          <Button 
            color="error" 
            onClick={resetDatabase}
            disabled={confirmationText !== 'RESET'}
          >
            אפס מסד נתונים
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 