'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Box, Typography, TextField, Button, Card, CardContent, Alert, CircularProgress } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useAuth } from '@/contexts/AuthContext';
import { fetchPlayers, searchPlayers, type Player } from '@/lib/firebase/players';
import { connectUserToPlayer } from '@/lib/firebase/users';
import { useToast } from '@/contexts/ToastContext';

// Create RTL theme with enhanced styling
const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
      main: '#2563eb',
      light: '#3b82f6',
      dark: '#1d4ed8',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f0f9ff',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e3a8a',
      secondary: '#3b82f6',
    },
  },
  typography: {
    fontFamily: 'Assistant, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.5,
      color: '#3b82f6',
    },
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: '24px',
          paddingRight: '24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          transition: 'all 0.3s ease-in-out',
          border: '1px solid #e5e7eb',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 24px -10px rgba(37, 99, 235, 0.15)',
            borderColor: '#93c5fd',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px',
          '&:last-child': {
            paddingBottom: '24px',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
            },
            '&.Mui-focused': {
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 12px -2px rgba(37, 99, 235, 0.1)',
            },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          textTransform: 'none',
          fontSize: '1.125rem',
          fontWeight: 600,
          padding: '12px 24px',
          boxShadow: '0 4px 12px -2px rgba(37, 99, 235, 0.2)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 16px -4px rgba(37, 99, 235, 0.3)',
          },
        },
        contained: {
          background: 'linear-gradient(45deg, #2563eb 30%, #3b82f6 90%)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
        },
      },
    },
  },
});

export default function SelectPlayerPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const data = await fetchPlayers();
        setPlayers(data);
        setError(null);
      } catch (err) {
        setError('שגיאה בטעינת השחקנים. אנא נסה שוב.');
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, []);

  const filteredPlayers = searchPlayers(players, searchQuery);

  const handleSelectPlayer = async (player: Player) => {
    if (!user?.email || connecting) return;
    
    try {
      setConnecting(true);
      setError(null);
      await connectUserToPlayer(user.email, player.id, player.name);
      showToast('נבחר השחקן ' + player.name + ' בהצלחה!', 'success');
      router.push('/dashboard');
    } catch (err) {
      setError('שגיאה בחיבור השחקן. אנא נסה שוב.');
      setConnecting(false);
    }
  };

  // Add logout handler
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <Box 
          sx={{ 
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f0f9ff 100%)',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={48} sx={{ mb: 3 }} />
            <Typography variant="h5" color="primary">
              טוען שחקנים...
            </Typography>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', py: 6, background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f0f9ff 100%)' }}>
        {/* Logout button at the top right */}
        <Box sx={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}>
          <Button variant="outlined" color="primary" onClick={handleLogout}>
            התנתק
          </Button>
        </Box>
        <Container maxWidth="lg">
          <Box sx={{ maxWidth: 600, mx: 'auto', mb: 8, textAlign: 'center' }}>
            <Typography variant="h1" gutterBottom>
              בחירת שחקן
            </Typography>
            <Typography variant="h6" sx={{ mb: 6, opacity: 0.9 }}>
              בחר את השחקן שלך מהרשימה
            </Typography>

            <TextField
              fullWidth
              placeholder="חיפוש שחקן..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="outlined"
              sx={{ mb: 4 }}
            />

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 4,
                  boxShadow: '0 4px 12px -2px rgba(239, 68, 68, 0.1)',
                }}
              >
                {error}
              </Alert>
            )}
          </Box>

          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)'
              },
              gap: 3,
              mb: 10
            }}
          >
            {filteredPlayers.map((player) => (
              <Card
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                sx={{
                  cursor: 'pointer',
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  ...(selectedPlayer?.id === player.id && {
                    borderColor: 'primary.main',
                    borderWidth: 2,
                    boxShadow: '0 12px 24px -10px rgba(37, 99, 235, 0.2) !important',
                  }),
                }}
              >
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    {player.name}
                  </Typography>
                  {player.team && (
                    <Typography sx={{ mb: 1, color: 'text.secondary' }}>
                      <strong>קבוצה:</strong> {player.team}
                    </Typography>
                  )}
                  {player.number && (
                    <Typography sx={{ color: 'text.secondary' }}>
                      <strong>מספר:</strong> {player.number}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>

          {filteredPlayers.length === 0 && (
            <Box 
              sx={{ 
                textAlign: 'center',
                py: 6,
                bgcolor: 'background.paper',
                borderRadius: 3,
                border: 1,
                borderColor: 'divider',
                boxShadow: '0 4px 12px -2px rgba(37, 99, 235, 0.1)',
              }}
            >
              <Typography variant="h6" color="text.secondary">
                לא נמצאו שחקנים
              </Typography>
            </Box>
          )}
        </Container>

        {selectedPlayer && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              p: 3,
              bgcolor: 'background.paper',
              borderTop: 1,
              borderColor: 'divider',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 -4px 16px -4px rgba(37, 99, 235, 0.1)',
            }}
          >
            <Container maxWidth="sm">
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => handleSelectPlayer(selectedPlayer)}
                disabled={connecting}
                sx={{
                  height: 56,
                }}
              >
                {connecting ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress size={24} color="inherit" sx={{ mr: 2 }} />
                    מתחבר...
                  </Box>
                ) : (
                  `בחר את ${selectedPlayer.name}`
                )}
              </Button>
            </Container>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
} 