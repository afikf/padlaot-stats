// Import Firebase functions
import { collection, getDocs, doc, setDoc, writeBatch, increment, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

// Mock data generation script
console.log('🎮 Starting mock data generation...');

// Hebrew names for players (common Israeli names)
const hebrewNames = [
    'אבי', 'בן', 'גיל', 'דני', 'הדר', 'ועד', 'זיו', 'חן', 'טל', 'יוסי',
    'כפיר', 'לירן', 'מתן', 'נתן', 'סער', 'עומר', 'פלג', 'צחי', 'קובי', 'רון',
    'שחר', 'תמיר', 'אלון', 'ברק', 'גלעד', 'דור', 'הילל', 'ויקטור', 'זהר', 'חיים',
    'טוב', 'יובל', 'כרמל', 'לבנון', 'מור', 'נדב', 'סמי', 'עדי', 'פז', 'צבי',
    'קיסר', 'רועי', 'שלמה', 'תום', 'אסף', 'בועז', 'גבי', 'דודו', 'החלל', 'ולד'
];

// Generate random date within a month
function getRandomDateInMonth(year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const randomDay = Math.floor(Math.random() * daysInMonth) + 1;
    return new Date(year, month - 1, randomDay).toISOString().split('T')[0];
}

// Only allow results: 0-0, 1-0, 1-1, 2-1
function generateMiniGames(numGames) {
    const possibleMatchups = [
        { teamA: 'A', teamB: 'B' },
        { teamA: 'B', teamB: 'C' },
        { teamA: 'A', teamB: 'C' }
    ];
    const possibleScores = [
        { scoreA: 0, scoreB: 0 },
        { scoreA: 1, scoreB: 0 },
        { scoreA: 1, scoreB: 1 },
        { scoreA: 2, scoreB: 1 },
        { scoreA: 1, scoreB: 2 }
    ];
    const miniGames = [];
    for (let i = 0; i < numGames; i++) {
        const matchup = possibleMatchups[Math.floor(Math.random() * possibleMatchups.length)];
        const score = possibleScores[Math.floor(Math.random() * possibleScores.length)];
        miniGames.push({
            id: `game-${i + 1}`,
            teamA: matchup.teamA,
            teamB: matchup.teamB,
            scoreA: score.scoreA,
            scoreB: score.scoreB,
            winner: score.scoreA > score.scoreB ? matchup.teamA : (score.scoreB > score.scoreA ? matchup.teamB : null),
            scorers: []
        });
    }
    return miniGames;
}

// For each team, assign goals according to the rules
function assignGoalsAndAssists(teamPlayers, goals) {
    const result = [];
    if (goals === 0) return result;
    if (goals === 1) {
        // One scorer
        const scorerIdx = Math.floor(Math.random() * teamPlayers.length);
        const scorerId = teamPlayers[scorerIdx];
        result.push({ playerId: scorerId, goals: 1, assists: 0 });
        // 50% chance for assist (not self)
        if (Math.random() > 0.5 && teamPlayers.length > 1) {
            let assisterIdx;
            do { assisterIdx = Math.floor(Math.random() * teamPlayers.length); } while (assisterIdx === scorerIdx);
            const assisterId = teamPlayers[assisterIdx];
            result.push({ playerId: assisterId, goals: 0, assists: 1 });
        }
    } else if (goals === 2) {
        // Randomly: one player with 2, or two players with 1 each
        if (Math.random() > 0.5) {
            // One player scores both
            const scorerIdx = Math.floor(Math.random() * teamPlayers.length);
            const scorerId = teamPlayers[scorerIdx];
            result.push({ playerId: scorerId, goals: 2, assists: 0 });
            // Up to 2 assists, not self
            const possibleAssisters = teamPlayers.filter(pid => pid !== scorerId);
            if (possibleAssisters.length > 0) {
                // First goal assist
                if (Math.random() > 0.5) {
                    const assister1 = possibleAssisters[Math.floor(Math.random() * possibleAssisters.length)];
                    result.push({ playerId: assister1, goals: 0, assists: 1 });
                }
                // Second goal assist
                if (Math.random() > 0.5) {
                    const assister2 = possibleAssisters[Math.floor(Math.random() * possibleAssisters.length)];
                    result.push({ playerId: assister2, goals: 0, assists: 1 });
                }
            }
        } else {
            // Two different scorers
            let [scorerIdx1, scorerIdx2] = [0, 0];
            while (scorerIdx1 === scorerIdx2) {
                scorerIdx1 = Math.floor(Math.random() * teamPlayers.length);
                scorerIdx2 = Math.floor(Math.random() * teamPlayers.length);
            }
            const scorerId1 = teamPlayers[scorerIdx1];
            const scorerId2 = teamPlayers[scorerIdx2];
            result.push({ playerId: scorerId1, goals: 1, assists: 0 });
            result.push({ playerId: scorerId2, goals: 1, assists: 0 });
            // For each goal, 50% chance for assist (not self)
            if (Math.random() > 0.5 && teamPlayers.length > 2) {
                let assisterIdx1;
                do { assisterIdx1 = Math.floor(Math.random() * teamPlayers.length); } while (assisterIdx1 === scorerIdx1);
                const assisterId1 = teamPlayers[assisterIdx1];
                result.push({ playerId: assisterId1, goals: 0, assists: 1 });
            }
            if (Math.random() > 0.5 && teamPlayers.length > 2) {
                let assisterIdx2;
                do { assisterIdx2 = Math.floor(Math.random() * teamPlayers.length); } while (assisterIdx2 === scorerIdx2);
                const assisterId2 = teamPlayers[assisterIdx2];
                result.push({ playerId: assisterId2, goals: 0, assists: 1 });
            }
        }
    }
    return result;
}

function generateScorers(miniGame, teams) {
    // For each team, assign goals and assists
    const teamAPlayers = teams[miniGame.teamA];
    const teamBPlayers = teams[miniGame.teamB];
    const all = [...assignGoalsAndAssists(teamAPlayers, miniGame.scoreA), ...assignGoalsAndAssists(teamBPlayers, miniGame.scoreB)];
    // Merge so each player appears only once with summed goals/assists
    const scorerMap = {};
    all.forEach(entry => {
        if (!scorerMap[entry.playerId]) scorerMap[entry.playerId] = { playerId: entry.playerId, goals: 0, assists: 0 };
        scorerMap[entry.playerId].goals += entry.goals;
        scorerMap[entry.playerId].assists += entry.assists;
    });
    return Object.values(scorerMap);
}

function calculatePlayerStats(miniGames, teams) {
    const playerStats = {};
    Object.values(teams).flat().forEach(playerId => {
        playerStats[playerId] = { goals: 0, assists: 0, wins: 0 };
    });
    miniGames.forEach(miniGame => {
        miniGame.scorers.forEach(scorer => {
            if (!playerStats[scorer.playerId]) playerStats[scorer.playerId] = { goals: 0, assists: 0, wins: 0 };
            playerStats[scorer.playerId].goals += scorer.goals;
            playerStats[scorer.playerId].assists += scorer.assists;
        });
        if (miniGame.winner) {
            const winningTeamPlayers = teams[miniGame.winner];
            winningTeamPlayers.forEach(playerId => {
                playerStats[playerId].wins += 1;
            });
        }
    });
    return playerStats;
}

// Clean DB: delete all gameDays and reset player stats
async function cleanDatabase() {
    // Delete all gameDays
    const gameDaysSnap = await getDocs(collection(db, 'gameDays'));
    const deleteBatch = writeBatch(db);
    gameDaysSnap.forEach(docSnap => {
        deleteBatch.delete(doc(db, 'gameDays', docSnap.id));
    });
    await deleteBatch.commit();
    console.log('🧹 All gameDays deleted');
    // Reset all player stats
    const playersSnap = await getDocs(collection(db, 'players'));
    const resetBatch = writeBatch(db);
    playersSnap.forEach(docSnap => {
        resetBatch.update(doc(db, 'players', docSnap.id), {
            totalGoals: 0,
            totalAssists: 0,
            totalWins: 0
        });
    });
    await resetBatch.commit();
    console.log('🧹 All player stats reset');
}

function getStatusForDate(gameDate) {
    const today = new Date();
    const gameDateObj = new Date(gameDate);
    if (
        gameDateObj.getFullYear() === today.getFullYear() &&
        gameDateObj.getMonth() === today.getMonth() &&
        gameDateObj.getDate() === today.getDate()
    ) return 2; // live
    if (gameDateObj > today) return 1; // upcoming
    return 3; // completed
}

// Main function to create mock data
async function createMockData() {
    try {
        await cleanDatabase();
        console.log('📊 Loading existing players...');
        
        // Load existing players
        const playersSnapshot = await getDocs(collection(db, 'players'));
        const existingPlayers = [];
        
        playersSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.name) {
                existingPlayers.push({
                    id: doc.id,
                    name: data.name
                });
            }
        });
        
        console.log(`Found ${existingPlayers.length} existing players`);
        
        // If we don't have enough players, create some
        if (existingPlayers.length < 25) {
            console.log('🔄 Creating additional players...');
            const batch = writeBatch(db);
            
            for (let i = existingPlayers.length; i < 25; i++) {
                const playerRef = doc(collection(db, 'players'));
                const playerName = hebrewNames[i % hebrewNames.length] + (i > hebrewNames.length - 1 ? ` ${Math.floor(i / hebrewNames.length) + 1}` : '');
                
                batch.set(playerRef, {
                    name: playerName,
                    totalGoals: 0,
                    totalAssists: 0,
                    totalWins: 0,
                    isActive: true,
                    createdAt: new Date().toISOString()
                });
                
                existingPlayers.push({
                    id: playerRef.id,
                    name: playerName
                });
            }
            
            await batch.commit();
            console.log(`✅ Created ${25 - playersSnapshot.size} additional players`);
        }
        
        // Generate 10 game nights (2 per month from February to June 2024)
        const months = [
            { year: 2024, month: 2, name: 'פברואר' },
            { year: 2024, month: 3, name: 'מרץ' },
            { year: 2024, month: 4, name: 'אפריל' },
            { year: 2024, month: 5, name: 'מאי' },
            { year: 2024, month: 6, name: 'יוני' }
        ];
        
        console.log('🎯 Creating 10 game nights...');
        
        const allGameDays = [];
        const playerTotalStats = {};
        
        // Initialize player totals
        existingPlayers.forEach(player => {
            playerTotalStats[player.id] = { goals: 0, assists: 0, wins: 0 };
        });
        
        for (const monthData of months) {
            // Create 2 game nights per month
            for (let gameInMonth = 0; gameInMonth < 2; gameInMonth++) {
                const gameDate = getRandomDateInMonth(monthData.year, monthData.month);
                
                // Select 21 random players
                const shuffledPlayers = [...existingPlayers].sort(() => 0.5 - Math.random());
                const selectedPlayers = shuffledPlayers.slice(0, 21);
                
                // Divide into teams (7, 7, 7)
                const teams = {
                    A: selectedPlayers.slice(0, 7).map(p => p.id),
                    B: selectedPlayers.slice(7, 14).map(p => p.id),
                    C: selectedPlayers.slice(14, 21).map(p => p.id)
                };
                
                // Generate 5-8 mini games
                const numGames = Math.floor(Math.random() * 4) + 5; // 5-8 games
                const miniGames = generateMiniGames(numGames);
                
                // Generate scorers for each mini game
                miniGames.forEach(miniGame => {
                    miniGame.scorers = generateScorers(miniGame, teams);
                });
                
                // Calculate player stats for this game day
                const playerStats = calculatePlayerStats(miniGames, teams);
                
                // Add to total stats
                Object.keys(playerStats).forEach(playerId => {
                    playerTotalStats[playerId].goals += playerStats[playerId].goals;
                    playerTotalStats[playerId].assists += playerStats[playerId].assists;
                    playerTotalStats[playerId].wins += playerStats[playerId].wins;
                });
                
                // Create game day object
                const gameDay = {
                    date: gameDate,
                    participants: selectedPlayers.map(p => p.id),
                    teams: teams,
                    miniGames: miniGames,
                    playerStats: playerStats,
                    status: getStatusForDate(gameDate),
                    createdAt: new Date().toISOString(),
                    endedAt: new Date(gameDate + 'T22:00:00').toISOString()
                };
                
                allGameDays.push({ id: gameDate, data: gameDay });
                
                console.log(`📅 Generated game for ${gameDate} (${monthData.name}) with ${numGames} mini-games`);
            }
        }
        
        // Save all game days to Firestore
        console.log('💾 Saving game days to Firestore...');
        for (const gameDay of allGameDays) {
            await setDoc(doc(db, 'gameDays', gameDay.id), gameDay.data);
        }
        
        // Update player career stats
        console.log('📈 Updating player career stats...');
        const playerBatch = writeBatch(db);
        
        Object.keys(playerTotalStats).forEach(playerId => {
            const stats = playerTotalStats[playerId];
            if (stats.goals > 0 || stats.assists > 0 || stats.wins > 0) {
                const playerRef = doc(db, 'players', playerId);
                playerBatch.update(playerRef, {
                    totalGoals: increment(stats.goals),
                    totalAssists: increment(stats.assists),
                    totalWins: increment(stats.wins)
                });
            }
        });
        
        await playerBatch.commit();
        
        console.log('🎉 Mock data creation completed successfully!');
        console.log(`✅ Created ${allGameDays.length} game days`);
        console.log(`✅ Updated stats for ${Object.keys(playerTotalStats).length} players`);
        
        // Show summary
        const totalGames = allGameDays.reduce((sum, gd) => sum + gd.data.miniGames.length, 0);
        const totalGoals = allGameDays.reduce((sum, gd) => {
            return sum + gd.data.miniGames.reduce((gameSum, mg) => gameSum + mg.scoreA + mg.scoreB, 0);
        }, 0);
        
        console.log(`📊 Summary: ${totalGames} mini-games played, ${totalGoals} total goals scored`);
        
    } catch (error) {
        console.error('❌ Error creating mock data:', error);
    }
}

// Run the mock data creation
createMockData(); 