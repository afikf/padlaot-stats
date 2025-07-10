"use client";

import { useState } from "react";
import { Box, Container, Tabs, Tab, Switch, FormControlLabel, Paper } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import AuthGuard from "@/components/auth/AuthGuard";
import Header from "@/components/dashboard/Header";
import GameNightsAccordion from "@/components/dashboard/GameNightsAccordion";
import PlayerStatsTable from "@/components/dashboard/PlayerStatsTable";
import ShowMyStatsSwitch from "@/components/dashboard/ShowMyStatsSwitch";

const theme = createTheme({
  direction: "rtl",
  palette: {
    primary: {
      main: "#2563eb",
      light: "#3b82f6",
      dark: "#1d4ed8",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f0f9ff",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: "Assistant, sans-serif",
  },
});

export default function DashboardPage() {
  const [tab, setTab] = useState(0);
  const [showMyStatsOnly, setShowMyStatsOnly] = useState(false);

  return (
    <AuthGuard requireAuth requirePlayerLink>
      <ThemeProvider theme={theme}>
        <Box sx={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f0f9ff 100%)" }}>
          <Container maxWidth="lg" sx={{ pt: 4 }}>
            {/* Header */}
            <Header />

            {/* Show My Stats Only Toggle */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showMyStatsOnly}
                    onChange={e => setShowMyStatsOnly(e.target.checked)}
                    color="primary"
                  />
                }
                label="הצג רק את הסטטיסטיקה שלי"
                labelPlacement="start"
              />
            </Box>

            {/* Tabs */}
            <Paper elevation={1} sx={{ borderRadius: 3, p: 2 }}>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
                sx={{ mb: 2 }}
              >
                <Tab label="ערבי משחקים" />
                <Tab label="סטטיסטיקת שחקנים" />
              </Tabs>

              {/* Tab Panels */}
              <Box hidden={tab !== 0}>
                <GameNightsAccordion showMyStatsOnly={showMyStatsOnly} />
              </Box>
              <Box hidden={tab !== 1}>
                <PlayerStatsTable showMyStatsOnly={showMyStatsOnly} />
              </Box>
            </Paper>
          </Container>
        </Box>
      </ThemeProvider>
    </AuthGuard>
  );
} 