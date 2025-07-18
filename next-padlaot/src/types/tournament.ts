// Tournament-related types for generic tournament feature

export interface TournamentSettings {
  numberOfTeams: number;
  playersPerTeam: number;
  numberOfPitches: number;
  // Group stage settings
  numberOfGroups: number;
  qualifierDistribution: number[]; // e.g., [2, 2, 2, 2] for 2 per group, or [1, 1, 1, 1] for 1 per group + best remaining
  groupStageComplete: boolean;
  knockoutStageStarted: boolean;
}

export interface TournamentTeam {
  key: string; // e.g., 'A', 'B', ...
  players: string[]; // array of player IDs
  captain: string; // player ID
  group?: string; // group assignment (e.g., 'A', 'B', 'C')
  eliminated?: boolean; // for knockout stage
}

export interface TournamentGroup {
  id: string; // e.g., 'A', 'B', 'C'
  teams: string[]; // team keys
  standings: GroupStanding[];
}

export interface GroupStanding {
  teamKey: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
}

export interface KnockoutMatch {
  id: string;
  round: number; // 1 = quarter-finals, 2 = semi-finals, 3 = final
  matchNumber: number; // within the round
  teamA?: string | null; // team key or null for bye
  teamB?: string | null; // team key or null for bye
  winner?: string | null; // team key
  scoreA?: number;
  scoreB?: number;
  goals: TournamentGoal[];
  status: 'pending' | 'live' | 'complete' | 'bye';
  pitchNumber?: number | null;
  startTime?: number | null;
  endTime?: number | null;
}

export interface KnockoutBracket {
  rounds: KnockoutMatch[][]; // array of rounds, each containing matches
  totalRounds: number;
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
  createdBy: string; // user ID who created this mini-game
  // Group stage specific
  group?: string; // group this game belongs to
  isGroupGame?: boolean;
  // Knockout specific
  knockoutMatchId?: string; // if this is a knockout game
  knockoutRound?: number;
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
  groups: Record<string, TournamentGroup>; // key: group id
  knockoutBracket?: KnockoutBracket;
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

// Helper types for UI
export interface QualifierDistributionOption {
  distribution: number[];
  totalQualifiers: number;
  description: string;
}

export interface TournamentStage {
  type: 'group' | 'knockout';
  name: string;
  description: string;
  isActive: boolean;
  isComplete: boolean;
} 