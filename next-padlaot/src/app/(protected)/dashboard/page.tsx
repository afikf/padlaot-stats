'use client';

import { Box, Container, Typography, Paper, Button } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useAuth } from '@/contexts/AuthContext';

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
  },
  typography: {
    fontFamily: 'Assistant, sans-serif',
  },
});

export default function DashboardPage() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // Redirect handled in logout
  };

  return (
    <ThemeProvider theme={theme}>
      <Box 
        sx={{ 
          minHeight: '100vh',
          py: 8,
          background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f0f9ff 100%)',
        }}
      >
        {/* Logout button at the top right */}
        <Box sx={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}>
          <Button variant="outlined" color="primary" onClick={handleLogout}>
            התנתק
          </Button>
        </Box>
        <Container maxWidth="lg">
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px -4px rgba(37, 99, 235, 0.1)',
            }}
          >
            <Typography 
              variant="h1" 
              sx={{ 
                fontSize: '3rem',
                fontWeight: 700,
                background: 'linear-gradient(45deg, #2563eb, #3b82f6)',
                backgroundClip: 'text',
                color: 'transparent',
                mb: 3,
              }}
            >
              !בקרוב
            </Typography>
            <Typography 
              variant="h5"
              sx={{ 
                color: 'text.secondary',
                maxWidth: '600px',
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              אנחנו עובדים על יצירת חווית משתמש מדהימה עבורך. הדשבורד יהיה זמין בקרוב!
            </Typography>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
} 