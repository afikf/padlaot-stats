import React from 'react';
import { AppBar, Toolbar, Box, Typography, Button, Avatar, Stack } from '@mui/material';

interface HeaderProps {
  title: string;
  logoSrc?: string;
  navButtonLabel?: string;
  onNavButtonClick?: () => void;
  userEmail: string;
  userName?: string;
  userAvatarUrl?: string;
  onLogout: () => void;
  tabs?: React.ReactNode;
  children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  title,
  logoSrc,
  navButtonLabel,
  onNavButtonClick,
  userEmail,
  userName,
  userAvatarUrl,
  onLogout,
  tabs,
  children,
}) => (
  <AppBar position="static" color="transparent" elevation={0} sx={{ borderRadius: 3, mt: 2, mb: 2 }}>
    <Toolbar sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
      {/* Left: Navigation Button */}
      {navButtonLabel && onNavButtonClick && (
        <Button
          variant="outlined"
          color="primary"
          onClick={onNavButtonClick}
          sx={{ minWidth: 120, fontWeight: 700, borderRadius: 3, ml: 2 }}
        >
          {navButtonLabel}
        </Button>
      )}

      {/* Center: Logo & Title */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ flexGrow: 1, justifyContent: 'center' }}>
        {logoSrc && (
          <Box component="img" src={logoSrc} alt="logo" sx={{ height: 40, borderRadius: 2 }} />
        )}
        <Typography variant="h4" fontWeight={900} color="primary" sx={{ letterSpacing: 1 }}>
          {title}
        </Typography>
      </Stack>

      {/* Right: User Info & Logout */}
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography variant="body1" color="primary" fontWeight={700}>
          {userName && <span>({userName}) </span>}{userEmail}
        </Typography>
        <Avatar src={userAvatarUrl} sx={{ border: '2px solid #B388FF', bgcolor: 'white' }} />
        <Button
          variant="contained"
          color="primary"
          onClick={onLogout}
          sx={{ minWidth: 100, fontWeight: 700, borderRadius: 3, mr: 2 }}
        >
          התנתק
        </Button>
      </Stack>
    </Toolbar>
    {/* Tabs or extra content below header */}
    {tabs && (
      <Box sx={{ px: 3, pt: 1 }}>
        {tabs}
      </Box>
    )}
    {children}
  </AppBar>
);

export default Header; 