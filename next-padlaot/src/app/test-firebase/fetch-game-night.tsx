'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, limit } from 'firebase/firestore';
import { Box, Typography, Paper, Chip } from '@mui/material';

interface GameNight {
  id: string;
  date: string;
  status: number; // 0=draft, 1=upcoming, 2=live, 3=completed, 4=not completed
  teams?: {
    A?: { players: string[], captain: string };
    B?: { players: string[], captain: string };
    C?: { players: string[], captain: string };
  };
  participants?: string[];
  miniGames?: any[];
  [key: string]: any;
}

export default function FetchGameNight() {
  const [gameNight, setGameNight] = useState<GameNight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGameNight = async () => {
      try {
        setLoading(true);
        const gameDaysRef = collection(db, 'gameDays');
        const querySnapshot = await getDocs(gameDaysRef);
        
        if (!querySnapshot.empty) {
          const firstDoc = querySnapshot.docs[0];
          const data = { id: firstDoc.id, ...firstDoc.data() } as GameNight;
          setGameNight(data);
          console.log('Sample Game Night Data:', data);
        } else {
          setError('No game nights found in the collection');
        }
      } catch (err) {
        console.error('Error fetching game night:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchGameNight();
  }, []);

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0: return { label: 'Draft', color: 'default' as const };
      case 1: return { label: 'Upcoming', color: 'info' as const };
      case 2: return { label: 'Live', color: 'success' as const };
      case 3: return { label: 'Completed', color: 'primary' as const };
      case 4: return { label: 'Not Completed', color: 'error' as const };
      default: return { label: 'Unknown', color: 'default' as const };
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading game night data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  if (!gameNight) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No game night data found</Typography>
      </Box>
    );
  }

  const statusInfo = getStatusLabel(gameNight.status);

  return (
    <Box sx={{ p: 3, maxWidth: 800 }}>
      <Typography variant="h4" gutterBottom>
        Sample Game Night Data Structure
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Document ID: {gameNight.id}</Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">Basic Info:</Typography>
          <Typography>Date: {gameNight.date}</Typography>
          <Chip 
            label={statusInfo.label} 
            color={statusInfo.color} 
            sx={{ mt: 1 }}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">Participants ({gameNight.participants?.length || 0}):</Typography>
          <Typography variant="body2" color="text.secondary">
            {gameNight.participants?.join(', ') || 'No participants'}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">Teams Structure:</Typography>
          <pre style={{ fontSize: '12px', overflow: 'auto', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
            {JSON.stringify(gameNight.teams, null, 2)}
          </pre>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">Mini Games ({gameNight.miniGames?.length || 0}):</Typography>
          <pre style={{ fontSize: '12px', overflow: 'auto', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
            {JSON.stringify(gameNight.miniGames, null, 2)}
          </pre>
        </Box>

        <Box>
          <Typography variant="subtitle1" fontWeight="bold">All Fields:</Typography>
          <pre style={{ fontSize: '12px', overflow: 'auto', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
            {JSON.stringify(gameNight, null, 2)}
          </pre>
        </Box>
      </Paper>
    </Box>
  );
} 