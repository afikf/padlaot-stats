import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  runTransaction,
  type QueryConstraint,
  type DocumentData,
  arrayUnion
} from 'firebase/firestore';
import { db } from './config';

// Tournament group stage and knockout functions
import { 
  Tournament, 
  TournamentGroup, 
  GroupStanding, 
  KnockoutBracket, 
  KnockoutMatch,
  TournamentMiniGame,
  TournamentTeam,
  QualifierDistributionOption
} from '@/types/tournament';
import { calculateValidQualifierDistributions } from '../utils';

export const firestore = {
  // Collection operations
  getCollection: (path: string) => collection(db, path),
  
  // Document operations
  getDoc: async (path: string) => {
    const docRef = doc(db, path);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  addDoc: async (path: string, data: DocumentData) => {
    console.log('firestore.addDoc called with path:', path, 'data:', data);
    const collectionRef = collection(db, path);
    const docRef = await addDoc(collectionRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    console.log('Document created with ID:', docRef.id);
    return docRef.id;
  },

  setDoc: async (path: string, data: DocumentData) => {
    const docRef = doc(db, path);
    await setDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  },

  updateDoc: async (path: string, data: Partial<DocumentData>) => {
    const docRef = doc(db, path);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  },

  deleteDoc: async (path: string) => {
    const docRef = doc(db, path);
    await deleteDoc(docRef);
  },

  // Query operations
  query: (path: string, ...queryConstraints: QueryConstraint[]) => {
    return query(collection(db, path), ...queryConstraints);
  },

  // Batch operations
  createBatch: () => writeBatch(db),

  // Transaction operations
  runTransaction: (updateFunction: any) => runTransaction(db, updateFunction),

  // Realtime listeners
  onSnapshot: (path: string, callback: (data: any) => void) => {
    const docRef = doc(db, path);
    return onSnapshot(docRef, (doc) => {
      callback(doc.exists() ? { id: doc.id, ...doc.data() } : null);
    });
  },

  // Helper functions
  serverTimestamp: () => serverTimestamp(),
  timestamp: Timestamp,
  where,
  orderBy,
  limit
}; 

// Group stage functions
export async function assignTeamsToGroups(
  tournamentId: string,
  teams: Record<string, TournamentTeam>,
  numberOfGroups: number
): Promise<Record<string, TournamentGroup>> {
  const teamKeys = Object.keys(teams);
  const teamsPerGroup = Math.ceil(teamKeys.length / numberOfGroups);
  
  const groups: Record<string, TournamentGroup> = {};
  
  // Create groups
  for (let i = 0; i < numberOfGroups; i++) {
    const groupId = String.fromCharCode(65 + i); // A, B, C, etc.
    groups[groupId] = {
      id: groupId,
      teams: [],
      standings: []
    };
  }
  
  // Distribute teams evenly across groups
  teamKeys.forEach((teamKey, index) => {
    const groupIndex = index % numberOfGroups;
    const groupId = String.fromCharCode(65 + groupIndex);
    groups[groupId].teams.push(teamKey);
  });
  
  // Update tournament with groups
  await updateDoc(doc(db, 'tournaments', tournamentId), {
    groups,
    'settings.numberOfGroups': numberOfGroups
  });
  
  return groups;
}

export function calculateGroupStandings(
  group: TournamentGroup,
  miniGames: TournamentMiniGame[]
): GroupStanding[] {
  const groupGames = miniGames.filter(game => 
    game.group === group.id && game.status === 'complete'
  );
  
  const standings: Record<string, GroupStanding> = {};
  
  // Initialize standings for all teams in group
  group.teams.forEach(teamKey => {
    standings[teamKey] = {
      teamKey,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      position: 0
    };
  });
  
  // Calculate standings from completed games
  groupGames.forEach(game => {
    const teamA = standings[game.teamA];
    const teamB = standings[game.teamB];
    
    if (teamA && teamB) {
      // Update games played
      teamA.played++;
      teamB.played++;
      
      // Update goals
      teamA.goalsFor += game.scoreA;
      teamA.goalsAgainst += game.scoreB;
      teamB.goalsFor += game.scoreB;
      teamB.goalsAgainst += game.scoreA;
      
      // Update results
      if (game.scoreA > game.scoreB) {
        teamA.won++;
        teamB.lost++;
        teamA.points += 3;
      } else if (game.scoreA < game.scoreB) {
        teamB.won++;
        teamA.lost++;
        teamB.points += 3;
      } else {
        teamA.drawn++;
        teamB.drawn++;
        teamA.points += 1;
        teamB.points += 1;
      }
    }
  });
  
  // Calculate goal differences
  Object.values(standings).forEach(standing => {
    standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
  });
  
  // Sort standings by points, goal difference, goals scored
  const sortedStandings = Object.values(standings).sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
  
  // Assign positions
  sortedStandings.forEach((standing, index) => {
    standing.position = index + 1;
  });
  
  return sortedStandings;
}

export function getQualifiersFromGroups(
  tournament: Tournament,
  qualifierDistribution: number[]
): string[] {
  const qualifiers: string[] = [];
  const groupIds = Object.keys(tournament.groups);
  
  // Get qualifiers from each group based on distribution
  groupIds.forEach((groupId, index) => {
    const group = tournament.groups[groupId];
    const qualifiersFromGroup = qualifierDistribution[index] || 0;
    
    // Calculate standings for this group first
    const groupStandings = calculateGroupStandings(group, tournament.miniGames);
    
    // Get top N teams from group standings
    const topTeams = groupStandings
      .slice(0, qualifiersFromGroup)
      .map(standing => standing.teamKey);
    
    qualifiers.push(...topTeams);
  });
  
  // Handle "best remaining" qualifiers (last element in distribution)
  const bestRemainingCount = qualifierDistribution[qualifierDistribution.length - 1] || 0;
  if (bestRemainingCount > 0) {
    // Get all teams that didn't qualify directly
    const qualifiedTeams = new Set(qualifiers);
    const allTeams = Object.keys(tournament.teams);
    const remainingTeams = allTeams.filter(team => !qualifiedTeams.has(team));
    
    // Calculate standings for remaining teams across all groups
    const remainingStandings = calculateCrossGroupStandings(tournament, remainingTeams);
    
    // Get best N remaining teams
    const bestRemaining = remainingStandings
      .slice(0, bestRemainingCount)
      .map(standing => standing.teamKey);
    
    qualifiers.push(...bestRemaining);
  }
  
  return qualifiers;
}

function calculateCrossGroupStandings(
  tournament: Tournament,
  teamKeys: string[]
): GroupStanding[] {
  // Calculate standings for teams across all groups
  const standings: Record<string, GroupStanding> = {};
  
  // Initialize standings
  teamKeys.forEach(teamKey => {
    standings[teamKey] = {
      teamKey,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      position: 0
    };
  });
  
  // Calculate from all group games
  const groupGames = tournament.miniGames.filter(game => 
    game.isGroupGame && game.status === 'complete'
  );
  
  groupGames.forEach(game => {
    const teamA = standings[game.teamA];
    const teamB = standings[game.teamB];
    
    if (teamA && teamB) {
      teamA.played++;
      teamB.played++;
      
      teamA.goalsFor += game.scoreA;
      teamA.goalsAgainst += game.scoreB;
      teamB.goalsFor += game.scoreB;
      teamB.goalsAgainst += game.scoreA;
      
      if (game.scoreA > game.scoreB) {
        teamA.won++;
        teamB.lost++;
        teamA.points += 3;
      } else if (game.scoreA < game.scoreB) {
        teamB.won++;
        teamA.lost++;
        teamB.points += 3;
      } else {
        teamA.drawn++;
        teamB.drawn++;
        teamA.points += 1;
        teamB.points += 1;
      }
    }
  });
  
  // Calculate goal differences and sort
  Object.values(standings).forEach(standing => {
    standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
  });
  
  return Object.values(standings).sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}

// Knockout stage functions
export function generateKnockoutBracket(qualifiers: string[]): KnockoutBracket {
  // For 4 teams: 2 semi-finals, 1 final, 1 third place
  if (qualifiers.length === 4) {
    const semiFinals: KnockoutMatch[] = [
      {
        id: 'semi-1',
        round: 1,
        matchNumber: 1,
        teamA: qualifiers[0],
        teamB: qualifiers[1],
        status: 'pending',
        goals: []
      },
      {
        id: 'semi-2',
        round: 1,
        matchNumber: 2,
        teamA: qualifiers[2],
        teamB: qualifiers[3],
        status: 'pending',
        goals: []
      }
    ];
    
    const final: KnockoutMatch[] = [
      {
        id: 'final',
        round: 2,
        matchNumber: 1,
        status: 'pending',
        goals: []
      }
    ];
    
    const thirdPlace: KnockoutMatch[] = [
      {
        id: 'third-place',
        round: 3,
        matchNumber: 1,
        status: 'pending',
        goals: []
      }
    ];
    
    return {
      rounds: [semiFinals, final, thirdPlace],
      totalRounds: 3
    };
  }
  
  // For other numbers, use the original logic
  const totalRounds = Math.ceil(Math.log2(qualifiers.length));
  const totalMatches = Math.pow(2, totalRounds);
  
  // Create first round matches
  const firstRound: KnockoutMatch[] = [];
  for (let i = 0; i < totalMatches / 2; i++) {
    const teamA = qualifiers[i * 2] || null;
    const teamB = qualifiers[i * 2 + 1] || null;
    
    firstRound.push({
      id: `round-1-match-${i + 1}`,
      round: 1,
      matchNumber: i + 1,
      teamA: teamA || undefined,
      teamB: teamB || undefined,
      status: teamA && teamB ? 'pending' : 'bye',
      goals: []
    });
  }
  
  // Create subsequent rounds
  const rounds: KnockoutMatch[][] = [firstRound];
  
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    const roundMatches: KnockoutMatch[] = [];
    
    for (let match = 1; match <= matchesInRound; match++) {
      roundMatches.push({
        id: `round-${round}-match-${match}`,
        round,
        matchNumber: match,
        status: 'pending',
        goals: []
      });
    }
    
    rounds.push(roundMatches);
  }
  
  return {
    rounds,
    totalRounds
  };
}

// Convert knockout bracket to Firestore-compatible format
export function convertKnockoutBracketForFirestore(bracket: KnockoutBracket): any {
  // Convert nested arrays to flat structure with round keys
  const firestoreBracket: any = {
    totalRounds: bracket.totalRounds,
    rounds: {}
  };
  
  bracket.rounds.forEach((round, roundIndex) => {
    firestoreBracket.rounds[`round${roundIndex + 1}`] = round;
  });
  
  return firestoreBracket;
}

// Convert Firestore format back to KnockoutBracket
export function convertFirestoreToKnockoutBracket(firestoreBracket: any): KnockoutBracket {
  const rounds: KnockoutMatch[][] = [];
  
  // Convert flat structure back to nested arrays
  for (let i = 1; i <= firestoreBracket.totalRounds; i++) {
    const roundKey = `round${i}`;
    if (firestoreBracket.rounds[roundKey]) {
      rounds.push(firestoreBracket.rounds[roundKey]);
    }
  }
  
  return {
    rounds,
    totalRounds: firestoreBracket.totalRounds
  };
}

export async function startKnockoutStage(tournamentId: string): Promise<void> {
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const tournamentSnap = await getDoc(tournamentRef);
  
  if (!tournamentSnap.exists()) {
    throw new Error('Tournament not found');
  }
  
  const tournament = tournamentSnap.data() as Tournament;
  
  // Get qualifiers based on current standings
  const qualifiers = getQualifiersFromGroups(tournament, tournament.settings.qualifierDistribution);
  
  // Generate knockout bracket
  const knockoutBracket = generateKnockoutBracket(qualifiers);
  
  // Update tournament
  await updateDoc(tournamentRef, {
    knockoutBracket,
    'settings.knockoutStageStarted': true,
    'settings.groupStageComplete': true
  });
}

export function getValidQualifierOptions(
  numberOfTeams: number,
  numberOfGroups: number
): QualifierDistributionOption[] {
  return calculateValidQualifierDistributions(numberOfTeams, numberOfGroups);
}

// Mini-game creation with group/knockout support
export async function createTournamentMiniGame(
  tournamentId: string,
  teamA: string,
  teamB: string,
  pitchNumber: number,
  group?: string,
  knockoutMatchId?: string,
  knockoutRound?: number
): Promise<string> {
  const miniGame: TournamentMiniGame = {
    id: crypto.randomUUID(),
    teamA,
    teamB,
    scoreA: 0,
    scoreB: 0,
    goals: [],
    status: 'pending',
    pitchNumber,
    startTime: null,
    endTime: null,
    group,
    isGroupGame: !!group,
    knockoutMatchId,
    knockoutRound
  };
  
  await updateDoc(doc(db, 'tournaments', tournamentId), {
    miniGames: arrayUnion(miniGame)
  });
  
  return miniGame.id;
} 