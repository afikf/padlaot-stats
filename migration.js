// Import Firebase modules
import { 
    db, 
    collection, 
    getDocs, 
    doc, 
    updateDoc, 
    writeBatch,
    setDoc
} from './firebase-config.js';

// Global variables
let allPlayers = [];
let allGameDays = [];
let migrationResults = {
    totalPlayers: 0,
    playersUpdated: 0,
    totalGameNights: 0,
    totalMiniGames: 0,
    errors: []
};

// DOM elements
const startMigrationBtn = document.getElementById('start-migration-btn');
const dryRunBtn = document.getElementById('dry-run-btn');
const backToAdminBtn = document.getElementById('back-to-admin-btn');
const progressBar = document.getElementById('progress-bar');
const statusLog = document.getElementById('status-log');
const resultsSection = document.getElementById('results-section');
const resultsGrid = document.getElementById('results-grid');

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    startMigrationBtn.addEventListener('click', () => startMigration(false));
    dryRunBtn.addEventListener('click', () => startMigration(true));
});

// Logging functions
function addLogEntry(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `${new Date().toLocaleTimeString('he-IL')} - ${message}`;
    statusLog.appendChild(logEntry);
    statusLog.scrollTop = statusLog.scrollHeight;
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function updateProgress(percentage) {
    progressBar.style.width = `${percentage}%`;
}

function disableButtons() {
    startMigrationBtn.disabled = true;
    dryRunBtn.disabled = true;
}

function enableButtons() {
    startMigrationBtn.disabled = false;
    dryRunBtn.disabled = false;
}

function showResults() {
    resultsSection.classList.add('show');
    backToAdminBtn.style.display = 'inline-flex';
    
    resultsGrid.innerHTML = `
        <div class="result-card">
            <div class="result-number">${migrationResults.totalPlayers}</div>
            <div class="result-label">סה"כ שחקנים</div>
        </div>
        <div class="result-card">
            <div class="result-number">${migrationResults.playersUpdated}</div>
            <div class="result-label">שחקנים עודכנו</div>
        </div>
        <div class="result-card">
            <div class="result-number">${migrationResults.totalGameNights}</div>
            <div class="result-label">ערבי משחק</div>
        </div>
        <div class="result-card">
            <div class="result-number">${migrationResults.totalMiniGames}</div>
            <div class="result-label">משחקים קטנים</div>
        </div>
        <div class="result-card">
            <div class="result-number">${migrationResults.errors.length}</div>
            <div class="result-label">שגיאות</div>
        </div>
    `;
}

// Main migration function
async function startMigration(isDryRun = false) {
    try {
        disableButtons();
        updateProgress(0);
        
        const modeText = isDryRun ? 'בדיקה יבשה' : 'מעבר נתונים';
        addLogEntry(`🚀 מתחיל ${modeText}...`, 'info');
        
        // Reset results
        migrationResults = {
            totalPlayers: 0,
            playersUpdated: 0,
            totalGameNights: 0,
            totalMiniGames: 0,
            errors: []
        };
        
        // Step 1: Load all players
        addLogEntry('📥 טוען רשימת שחקנים...', 'info');
        await loadAllPlayers();
        updateProgress(20);
        
        // Step 2: Load all game days
        addLogEntry('📥 טוען היסטוריית משחקים...', 'info');
        await loadAllGameDays();
        updateProgress(40);
        
        // Step 3: Calculate player statistics
        addLogEntry('🧮 מחשב סטטיסטיקות שחקנים...', 'info');
        const playerStats = calculatePlayerStatistics();
        updateProgress(60);
        
        // Step 4: Update database (or simulate for dry run)
        addLogEntry(`💾 ${isDryRun ? 'מדמה עדכון' : 'מעדכן'} נתונים במאגר...`, 'info');
        await updatePlayerDatabase(playerStats, isDryRun);
        updateProgress(100);
        
        // Show results
        const successMessage = isDryRun ? 
            '✅ בדיקה יבשה הושלמה בהצלחה!' : 
            '✅ מעבר הנתונים הושלם בהצלחה!';
        addLogEntry(successMessage, 'success');
        
        showResults();
        
    } catch (error) {
        addLogEntry(`❌ שגיאה: ${error.message}`, 'error');
        migrationResults.errors.push(error.message);
    } finally {
        enableButtons();
    }
}

// Load all players from Firestore
async function loadAllPlayers() {
    try {
        const playersSnapshot = await getDocs(collection(db, 'players'));
        allPlayers = [];
        
        playersSnapshot.forEach((doc) => {
            const playerData = doc.data();
            if (playerData.name) {
                allPlayers.push({
                    id: doc.id,
                    name: playerData.name,
                    goals: playerData.goals || playerData.totalGoals || 0,
                    assists: playerData.assists || playerData.totalAssists || 0,
                    wins: playerData.wins || playerData.totalWins || 0,
                    totalGameNights: playerData.totalGameNights || 0,
                    totalMiniGames: playerData.totalMiniGames || 0
                });
            }
        });
        
        migrationResults.totalPlayers = allPlayers.length;
        addLogEntry(`✅ נטענו ${allPlayers.length} שחקנים`, 'success');
        
    } catch (error) {
        throw new Error(`שגיאה בטעינת שחקנים: ${error.message}`);
    }
}

// Load all game days from Firestore
async function loadAllGameDays() {
    try {
        const gameDaysSnapshot = await getDocs(collection(db, 'gameDays'));
        allGameDays = [];
        
        gameDaysSnapshot.forEach((doc) => {
            const gameData = doc.data();
            
            // Only include completed games with participants
            if (gameData.status === 3 || gameData.status === 'completed') {
                if (gameData.participants && gameData.participants.length > 0) {
                    allGameDays.push({
                        id: doc.id,
                        date: gameData.date,
                        participants: gameData.participants || [],
                        miniGames: gameData.miniGames || [],
                        teams: gameData.teams || {}
                    });
                }
            }
        });
        
        migrationResults.totalGameNights = allGameDays.length;
        migrationResults.totalMiniGames = allGameDays.reduce((sum, gameDay) => 
            sum + (gameDay.miniGames ? gameDay.miniGames.length : 0), 0);
        
        addLogEntry(`✅ נטענו ${allGameDays.length} ערבי משחק עם ${migrationResults.totalMiniGames} משחקים קטנים`, 'success');
        
    } catch (error) {
        throw new Error(`שגיאה בטעינת ערבי משחק: ${error.message}`);
    }
}

// Calculate player statistics based on game history
function calculatePlayerStatistics() {
    const playerStats = {};
    
    // Initialize all players with zero stats
    allPlayers.forEach(player => {
        playerStats[player.id] = {
            name: player.name,
            totalGameNights: 0,
            totalMiniGames: 0,
            calculatedFromHistory: true
        };
    });
    
    // Process each game day
    allGameDays.forEach(gameDay => {
        addLogEntry(`📊 מעבד ערב משחק: ${gameDay.date}`, 'info');
        
        // Track which players participated in this game night
        const participatingPlayers = new Set(gameDay.participants);
        
        // Add game night participation for all participants
        participatingPlayers.forEach(playerId => {
            if (playerStats[playerId]) {
                playerStats[playerId].totalGameNights += 1;
            }
        });
        
        // Calculate mini games participation
        if (gameDay.miniGames && gameDay.miniGames.length > 0) {
            gameDay.miniGames.forEach(miniGame => {
                // Get players from both teams of this mini game
                const teamAPlayers = gameDay.teams[miniGame.teamA] || [];
                const teamBPlayers = gameDay.teams[miniGame.teamB] || [];
                const miniGamePlayers = [...teamAPlayers, ...teamBPlayers];
                
                // Add mini game participation
                miniGamePlayers.forEach(playerId => {
                    if (playerStats[playerId]) {
                        playerStats[playerId].totalMiniGames += 1;
                    }
                });
            });
        }
    });
    
    // Log summary
    const playersWithStats = Object.values(playerStats).filter(p => 
        p.totalGameNights > 0 || p.totalMiniGames > 0);
    
    addLogEntry(`📈 ${playersWithStats.length} שחקנים עם פעילות, ${allPlayers.length - playersWithStats.length} ללא פעילות`, 'info');
    
    return playerStats;
}

// Update player database with calculated statistics
async function updatePlayerDatabase(playerStats, isDryRun = false) {
    try {
        const batch = writeBatch(db);
        let updateCount = 0;
        let batchCount = 0;
        const BATCH_SIZE = 500; // Firestore batch limit
        
        for (const [playerId, stats] of Object.entries(playerStats)) {
            const playerRef = doc(db, 'players', playerId);
            
            const updateData = {
                totalGameNights: stats.totalGameNights,
                totalMiniGames: stats.totalMiniGames
            };
            
            if (!isDryRun) {
                batch.update(playerRef, updateData);
                batchCount++;
                
                // Commit batch if we reach the limit
                if (batchCount >= BATCH_SIZE) {
                    await batch.commit();
                    addLogEntry(`💾 עודכנו ${batchCount} שחקנים (batch)`, 'success');
                    batchCount = 0;
                }
            }
            
            updateCount++;
            
            // Log individual player updates for verification
            if (stats.totalGameNights > 0 || stats.totalMiniGames > 0) {
                addLogEntry(
                    `${isDryRun ? '🔍' : '✅'} ${stats.name}: ${stats.totalGameNights} ערבים, ${stats.totalMiniGames} משחקים`, 
                    isDryRun ? 'info' : 'success'
                );
            }
        }
        
        // Commit remaining updates
        if (!isDryRun && batchCount > 0) {
            await batch.commit();
            addLogEntry(`💾 עודכנו ${batchCount} שחקנים אחרונים`, 'success');
        }
        
        migrationResults.playersUpdated = updateCount;
        
        const actionText = isDryRun ? 'נבדקו' : 'עודכנו';
        addLogEntry(`✅ ${actionText} ${updateCount} שחקנים בסך הכל`, 'success');
        
    } catch (error) {
        throw new Error(`שגיאה בעדכון מאגר הנתונים: ${error.message}`);
    }
}

// Utility function to normalize status
function normalizeStatus(status) {
    if (typeof status === 'number') {
        return status;
    }
    
    const statusMap = {
        'draft': 1,
        'upcoming': 2, 
        'live': 2,
        'completed': 3
    };
    
    return statusMap[status] || 1;
}

// Export functions for testing
window.migrationTool = {
    startMigration,
    loadAllPlayers,
    loadAllGameDays,
    calculatePlayerStatistics,
    updatePlayerDatabase
}; 