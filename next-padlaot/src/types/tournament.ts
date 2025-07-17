// Tournament-related types for generic tournament feature

export interface TournamentSettings {
  numberOfTeams: number;
  playersPerTeam: number;
  numberOfPitches: number;
}

export interface TournamentTeam {
  key: string; // e.g., 'A', 'B', ...
  players: string[]; // array of player IDs
  captain: string; // player ID
}

export interface TournamentMiniGame {
  id: string;
  teamA: string; // team key
  teamB: string; // team key
  scoreA: number;
  scoreB: number;
  goals: TournamentGoal[];
  status: 'pending' | 'live' | 'complete';
  pitchNumber: number;
  startTime: number | null; // timestamp (ms)
  endTime: number | null; // timestamp (ms)
}

export interface TournamentGoal {
  scorerId: string;
  assistId?: string | null;
  team: string; // team key
  timestamp: number; // ms
}

export interface Tournament {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  createdBy: string;
  status: number; // 0: draft, 1: upcoming, 2: completed, 3: not completed
  settings: TournamentSettings;
  participants: string[]; // player IDs
  teams: Record<string, TournamentTeam>; // key: team key
  miniGames: TournamentMiniGame[];
  createdAt: number;
  updatedAt: number;
}

export const TOURNAMENT_STATUS_MAP: Record<number, string> = {
  0: 'draft',
  1: 'upcoming',
  2: 'completed',
  3: 'not completed',
}; 