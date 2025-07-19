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
  
  // Sort standings by points, goal difference, goals scored, number of wins
  const sortedStandings = Object.values(standings).sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
    if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
    return b.won - a.won;
  });
  
  // Assign positions
  sortedStandings.forEach((standing, index) => {
    standing.position = index + 1;
  });
  
  return sortedStandings;
}

// Function to detect ties in group standings
export function detectTiesInGroupStandings(
  group: TournamentGroup,
  miniGames: TournamentMiniGame[]
): { groupId: string; tiedTeams: string[]; position: number }[] {
  const standings = calculateGroupStandings(group, miniGames);
  const ties: { groupId: string; tiedTeams: string[]; position: number }[] = [];
  
  // Group teams by their stats to find ties
  const teamsByStats = new Map<string, string[]>();
  
  standings.forEach(standing => {
    const statsKey = `${standing.points}-${standing.goalDifference}-${standing.goalsFor}-${standing.won}`;
    if (!teamsByStats.has(statsKey)) {
      teamsByStats.set(statsKey, []);
    }
    teamsByStats.get(statsKey)!.push(standing.teamKey);
  });
  
  // Find groups with more than one team (ties)
  teamsByStats.forEach((teams, statsKey) => {
    if (teams.length > 1) {
      // Find the position of these tied teams
      const firstTiedTeam = standings.find(s => s.teamKey === teams[0]);
      if (firstTiedTeam) {
        ties.push({
          groupId: group.id,
          tiedTeams: teams,
          position: firstTiedTeam.position
        });
      }
    }
  });
  
  return ties;
}

// Function to detect ties across all groups
export function detectAllTies(
  tournament: Tournament
): { groupId: string; tiedTeams: string[]; position: number }[] {
  const allTies: { groupId: string; tiedTeams: string[]; position: number }[] = [];
  
  Object.values(tournament.groups).forEach(group => {
    const groupTies = detectTiesInGroupStandings(group, tournament.miniGames);
    allTies.push(...groupTies);
  });
  
  return allTies;
}

// Function to apply tie-breaking decisions to standings
export function applyTieBreaks(
  group: TournamentGroup,
  miniGames: TournamentMiniGame[],
  tieBreaks: { groupId: string; position: number; teamOrder: string[] }[]
): GroupStanding[] {
  const standings = calculateGroupStandings(group, miniGames);
  
  console.log('applyTieBreaks called for group', group.id, 'with tie breaks:', tieBreaks);
  console.log('Original standings:', standings);
  
  // Apply tie breaks for this group
  tieBreaks
    .filter(tieBreak => tieBreak.groupId === group.id)
    .forEach(tieBreak => {
      console.log('Processing tie break for position', tieBreak.position, 'with team order:', tieBreak.teamOrder);
      
      // Find the tied teams that should be reordered
      const tiedTeams = standings.filter(s => tieBreak.teamOrder.includes(s.teamKey));
      
      console.log('Found tied teams to reorder:', tiedTeams);
      
      if (tiedTeams.length > 1) {
        // Reorder the tied teams according to the tie break decision
        const teamOrderMap = new Map<string, number>();
        tieBreak.teamOrder.forEach((teamKey, index) => {
          teamOrderMap.set(teamKey, index);
        });
        
        // Sort the tied teams by the manual order
        tiedTeams.sort((a, b) => {
          const orderA = teamOrderMap.get(a.teamKey) ?? 0;
          const orderB = teamOrderMap.get(b.teamKey) ?? 0;
          return orderA - orderB;
        });
        
        // Update positions for the tied teams
        let currentPosition = tieBreak.position;
        tiedTeams.forEach(team => {
          team.position = currentPosition;
          currentPosition++;
        });
        
        console.log('Updated tied teams positions:', tiedTeams);
      }
    });
  
  // Re-sort by position
  const result = standings.sort((a, b) => a.position - b.position);
  console.log('Final standings after tie breaks:', result);
  return result;
}

export function getQualifiersFromGroups(
  tournament: Tournament,
  qualifierDistribution: number[],
  tieBreaks?: { groupId: string; position: number; teamOrder: string[] }[]
): string[] {
  const qualifiers: string[] = [];
  const groupIds = Object.keys(tournament.groups);
  
  // Get qualifiers from each group based on distribution
  groupIds.forEach((groupId, index) => {
    const group = tournament.groups[groupId];
    const qualifiersFromGroup = qualifierDistribution[index] || 0;
    
    // Calculate standings for this group, applying tie breaks if provided
    const groupStandings = tieBreaks 
      ? applyTieBreaks(group, tournament.miniGames, tieBreaks)
      : calculateGroupStandings(group, tournament.miniGames);
    
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
    if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
    return b.won - a.won;
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

// Generate cross-group knockout bracket
export function generateCrossGroupKnockoutBracket(
  tournament: Tournament,
  qualifierDistribution: number[]
): KnockoutBracket {
  const groupIds = Object.keys(tournament.groups);
  const qualifiersByGroup: Record<string, string[]> = {};
  
  console.log('Generating cross-group bracket with:', {
    groupIds,
    qualifierDistribution,
    tournamentGroups: tournament.groups
  });
  
  // Check if this is a "best remaining" distribution
  const hasBestRemaining = qualifierDistribution.length > groupIds.length;
  const bestRemainingCount = hasBestRemaining ? qualifierDistribution[qualifierDistribution.length - 1] : 0;
  
  console.log('Distribution analysis:', {
    hasBestRemaining,
    bestRemainingCount,
    groupQualifiers: qualifierDistribution.slice(0, groupIds.length)
  });
  
  // Get qualifiers from each group based on distribution
  groupIds.forEach((groupId, index) => {
    const group = tournament.groups[groupId];
    const qualifiersFromGroup = qualifierDistribution[index] || 0;
    
    console.log(`Processing group ${groupId}:`, {
      qualifiersFromGroup,
      groupTeams: group.teams
    });
    
    // Calculate standings for this group, applying tie breaks if available
    console.log(`Group ${groupId} - Checking for tie breaks:`, tournament.tieBreaks);
    const groupStandings = tournament.tieBreaks && tournament.tieBreaks.length > 0
      ? applyTieBreaks(group, tournament.miniGames, tournament.tieBreaks)
      : calculateGroupStandings(group, tournament.miniGames);
    
    console.log(`Group ${groupId} standings:`, groupStandings);
    
    // Get top N teams from group standings
    const topTeams = groupStandings
      .slice(0, qualifiersFromGroup)
      .map(standing => standing.teamKey);
    
    qualifiersByGroup[groupId] = topTeams;
    
    console.log(`Group ${groupId} qualifiers:`, topTeams);
  });
  
  // Handle "best remaining" qualifiers if needed
  if (hasBestRemaining && bestRemainingCount > 0) {
    console.log('Processing best remaining qualifiers...');
    
    // Get all teams that didn't qualify directly
    const qualifiedTeams = new Set(Object.values(qualifiersByGroup).flat());
    const allTeams = Object.keys(tournament.teams);
    const remainingTeams = allTeams.filter(team => !qualifiedTeams.has(team));
    
    console.log('Remaining teams for best remaining selection:', remainingTeams);
    
    // Calculate standings for remaining teams across all groups
    const remainingStandings = calculateCrossGroupStandings(tournament, remainingTeams);
    
    console.log('Remaining teams standings:', remainingStandings);
    
    // Get best N remaining teams
    const bestRemaining = remainingStandings
      .slice(0, bestRemainingCount)
      .map(standing => standing.teamKey);
    
    console.log('Best remaining qualifiers:', bestRemaining);
    
    // Distribute best remaining teams to groups for cross-group matching
    // For 2 groups, split them evenly
    if (groupIds.length === 2) {
      const half = Math.ceil(bestRemaining.length / 2);
      qualifiersByGroup[groupIds[0]].push(...bestRemaining.slice(0, half));
      qualifiersByGroup[groupIds[1]].push(...bestRemaining.slice(half));
    } else {
      // For more groups, distribute evenly
      bestRemaining.forEach((team, index) => {
        const groupIndex = index % groupIds.length;
        qualifiersByGroup[groupIds[groupIndex]].push(team);
      });
    }
    
    console.log('Updated qualifiers by group after best remaining:', qualifiersByGroup);
  }
  
  // Create cross-group matches
  const firstRound: KnockoutMatch[] = [];
  let matchNumber = 1;
  
  // For 2 groups, create proper cross-group seeding
  if (groupIds.length === 2) {
    const groupAId = groupIds[0];
    const groupBId = groupIds[1];
    const groupAQualifiers = qualifiersByGroup[groupAId];
    const groupBQualifiers = qualifiersByGroup[groupBId];
    
    console.log('Creating 2-group cross matches:', {
      groupAId,
      groupBId,
      groupAQualifiers,
      groupBQualifiers
    });
    
    // Create cross-group matches: 1st vs 2nd, 2nd vs 1st
    const maxQualifiers = Math.max(groupAQualifiers.length, groupBQualifiers.length);
    
    for (let i = 0; i < maxQualifiers; i++) {
      const teamA = groupAQualifiers[i];
      const teamB = groupBQualifiers[groupBQualifiers.length - 1 - i]; // Reverse order for cross-group
      
      console.log(`Creating match ${matchNumber}: ${teamA} vs ${teamB}`);
      
      if (teamA && teamB) {
        firstRound.push({
          id: `round-1-match-${matchNumber}`,
          round: 1,
          matchNumber: matchNumber,
          teamA: teamA,
          teamB: teamB,
          status: 'pending',
          goals: []
        });
        matchNumber++;
      }
    }
  } else {
    // For more than 2 groups, use a different approach
    // For now, just create matches between adjacent groups
    for (let i = 0; i < groupIds.length; i++) {
      const currentGroupId = groupIds[i];
      const currentGroupQualifiers = qualifiersByGroup[currentGroupId];
      
      // Find the next group to match against
      const nextGroupIndex = (i + 1) % groupIds.length;
      const nextGroupId = groupIds[nextGroupIndex];
      const nextGroupQualifiers = qualifiersByGroup[nextGroupId];
      
      // Create cross-group matches
      const maxQualifiers = Math.max(currentGroupQualifiers.length, nextGroupQualifiers.length);
      
      for (let j = 0; j < maxQualifiers; j++) {
        const teamA = currentGroupQualifiers[j];
        const teamB = nextGroupQualifiers[j];
        
        if (teamA && teamB) {
          firstRound.push({
            id: `round-1-match-${matchNumber}`,
            round: 1,
            matchNumber: matchNumber,
            teamA: teamA,
            teamB: teamB,
            status: 'pending',
            goals: []
          });
          matchNumber++;
        }
      }
    }
  }
  
  console.log('Final first round matches:', firstRound);
  
  // Create subsequent rounds (final, third place, etc.)
  const totalQualifiers = firstRound.length;
  const totalRounds = Math.ceil(Math.log2(totalQualifiers)) + 1; // +1 for final/third place
  const rounds: KnockoutMatch[][] = [firstRound];
  
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = Math.max(1, Math.pow(2, totalRounds - round));
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
    // Clean the round data to ensure no undefined values
    const cleanRound = round.map(match => ({
      ...match,
      teamA: match.teamA || null,
      teamB: match.teamB || null,
      winner: match.winner || null
    }));
    firestoreBracket.rounds[`round${roundIndex + 1}`] = cleanRound;
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
  
  // Generate cross-group knockout bracket
  const knockoutBracket = generateCrossGroupKnockoutBracket(tournament, tournament.settings.qualifierDistribution);
  
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
  createdBy: string,
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
    createdBy,
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