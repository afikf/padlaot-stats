// Dashboard Header: displays user info and logout button

import { Box, Typography, Button, Stack } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const { user, userData, logout } = useAuth();

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="subtitle1" color="text.secondary">
          {user?.email}
        </Typography>
        {userData?.playerName && (
          <Typography variant="subtitle1" color="primary" fontWeight={600}>
            ({userData.playerName})
          </Typography>
        )}
      </Stack>
      <Button variant="outlined" color="primary" onClick={logout}>
        התנתק
      </Button>
    </Box>
  );
} 