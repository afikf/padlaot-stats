// Import Firebase functions - Updated to include onSnapshot for real-time listeners
import { collection, doc, getDoc, updateDoc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loader = document.getElementById('loader');
    const gameNightsContainer = document.getElementById('game-nights-container');
    const lastUpdated = document.getElementById('last-updated');
    const searchInput = document.getElementById('search-input');
    const monthFilter = document.getElementById('month-filter');
    const statusFilter = document.getElementById('status-filter');
    const refreshBtn = document.getElementById('refresh-btn');

    let allGameDays = [];
    let allPlayers = [];
    let filteredGameDays = [];

    // Real-time listener unsubscribe functions
    let unsubscribePlayers = null;
    let unsubscribeGameDays = null;
    
    // Track if initial data has been loaded
    let initialDataLoaded = false;
    let playersLoaded = false;
    let gameDaysLoaded = false;

    // Status codes
    const STATUS = {
        0: 'טיוטה',
        1: 'עתידי',
        2: 'חי',
        3: 'הושלם',
        4: 'לא הושלם'
    };
    const STATUS_LABEL = {
        0: '',
        1: '<span class="status-label upcoming">UPCOMING</span>',
        2: '<span class="status-label live">LIVE</span>',
        3: '',
        4: ''
    };
    const STATUS_CLASS = {
        0: 'draft',
        1: 'upcoming',
        2: 'live',
        3: 'completed',
        4: 'not-completed'
    };
    
    function normalizeStatus(status) {
        if (typeof status === 'number') return status;
        switch (status) {
            case 'draft': return 0;
            case 'upcoming':
            case 'ready': return 1;
            case 'live': return 2;
            case 'completed': return 3;
            case 'not-completed': return 4;
            default: return 0;
        }
    }

    // Initialize the page with real-time listeners
    initializeRealtimeApp();

    // Event listeners for filters
    searchInput.addEventListener('input', applyFilters);
    monthFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    
    // Event listener for refresh button (now just re-processes existing data)
    refreshBtn.addEventListener('click', refreshDisplay);
    
    // Event listeners for view switching
    const timelineBtn = document.getElementById('timeline-view-btn');
    const performanceBtn = document.getElementById('performance-view-btn');
    
    timelineBtn.addEventListener('click', () => switchView('timeline'));
    performanceBtn.addEventListener('click', () => switchView('performance'));
    
    // Variables to track current sort state
    let currentSortColumn = 'wins';
    let currentSortDirection = 'desc';

    // Add global variable to store search value
    let performanceSearchValue = '';

    /**
     * Initialize the app with real-time Firestore listeners
     * This replaces the old caching system with live data updates
     */
    function initializeRealtimeApp() {
        console.log('🚀 Initializing real-time StatsPad application...');
        
        // Show loader initially
        loader.style.display = 'block';
        gameNightsContainer.style.display = 'none';
        lastUpdated.textContent = 'מתחבר לנתונים בזמן אמת...';
        
        // Set up real-time listeners for both collections
        setupPlayersListener();
        setupGameDaysListener();
        
        // Update today's game status once on initialization
        updateTodayGameStatusOnce();
    }

    /**
     * Set up real-time listener for players collection
     * This listener will fire whenever players data changes in Firestore
     */
    function setupPlayersListener() {
        console.log('📡 Setting up real-time players listener...');
        
        const playersRef = collection(db, 'players');
        
        unsubscribePlayers = onSnapshot(playersRef, 
            (snapshot) => {
                console.log('👥 Players data updated - processing changes...');
                
                // Process players data
                allPlayers = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.name) {
                        allPlayers.push({
                            id: doc.id,
                            name: data.name
                        });
                    }
                });
                
                console.log(`✅ Loaded ${allPlayers.length} players in real-time`);
                playersLoaded = true;
                
                // Check if we can process all data
                checkAndProcessAllData();
            },
            (error) => {
                console.error('❌ Error in players real-time listener:', error);
                handleRealtimeError('שגיאה בטעינת נתוני שחקנים');
            }
        );
    }

    /**
     * Set up real-time listener for gameDays collection
     * This listener will fire whenever game days data changes in Firestore
     */
    function setupGameDaysListener() {
        console.log('📡 Setting up real-time game days listener...');
        
        const gameDaysRef = collection(db, 'gameDays');
        
        unsubscribeGameDays = onSnapshot(gameDaysRef, 
            (snapshot) => {
                console.log('🎮 Game days data updated - processing changes...');
                
                // Process game days data
                allGameDays = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    allGameDays.push({
                        id: doc.id,
                        date: data.date,
                        status: normalizeStatus(data.status),
                        participants: data.participants || [],
                        miniGames: data.miniGames || [],
                        playerStats: data.playerStats || {},
                        teams: data.teams || {},
                        createdAt: data.createdAt || data.date
                    });
                });
                
                console.log(`✅ Loaded ${allGameDays.length} game days in real-time`);
                gameDaysLoaded = true;
                
                // Check if we can process all data
                checkAndProcessAllData();
            },
            (error) => {
                console.error('❌ Error in game days real-time listener:', error);
                handleRealtimeError('שגיאה בטעינת נתוני ימי משחק');
            }
        );
    }

    /**
     * Check if both data sources are loaded and process the data
     */
    function checkAndProcessAllData() {
        if (playersLoaded && gameDaysLoaded) {
            if (!initialDataLoaded) {
                console.log('🎉 Initial real-time data loaded successfully!');
                initialDataLoaded = true;
            } else {
                console.log('🔄 Real-time data updated, refreshing UI...');
            }
            
            processAllData();
        }
    }

    /**
     * Handle real-time listener errors
     */
    function handleRealtimeError(message) {
        loader.style.display = 'none';
        lastUpdated.textContent = message;
        lastUpdated.style.color = 'red';
        
        // Try to use any cached data as fallback
        const cachedData = getCachedData(true);
        if (cachedData) {
            console.log('📦 Using cached data as fallback after real-time error');
            allPlayers = cachedData.players;
            allGameDays = cachedData.gameDays;
            processAllData();
        }
    }

    /**
     * Refresh display without fetching new data (data is already real-time)
     */
    function refreshDisplay() {
        console.log('🔄 Refreshing display with current real-time data...');
        
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '🔄 מרענן...';
        
        // Simply re-process current data
        processAllData();
        
        // Show success message briefly
        lastUpdated.style.color = 'green';
        const currentText = lastUpdated.textContent;
        lastUpdated.textContent = currentText + ' - רענון הושלם!';
        
        setTimeout(() => {
            lastUpdated.style.color = '';
            lastUpdated.textContent = currentText;
        }, 2000);
        
        // Reset button state
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '🔄 רענן תצוגה';
    }

    /**
     * Clean up real-time listeners when the page is unloaded
     */
    window.addEventListener('beforeunload', () => {
        console.log('🧹 Cleaning up real-time listeners...');
        if (unsubscribePlayers) {
            unsubscribePlayers();
        }
        if (unsubscribeGameDays) {
            unsubscribeGameDays();
        }
    });

    // Legacy cache functions (kept for fallback purposes only)
    function getCachedData(forceUse = false) {
        try {
            const playersCache = localStorage.getItem('padlaot_players_cache');
            const gameDaysCache = localStorage.getItem('padlaot_gamedays_cache');
            const lastFetch = localStorage.getItem('padlaot_last_fetch');
            
            if (!playersCache || !gameDaysCache || !lastFetch) return null;
            
            const cacheAge = Date.now() - parseInt(lastFetch);
            const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
            
            if (!forceUse && cacheAge > CACHE_DURATION) return null;
            
            return {
                players: JSON.parse(playersCache),
                gameDays: JSON.parse(gameDaysCache),
                lastFetch: parseInt(lastFetch)
            };
        } catch (error) {
            console.error('Error reading cache:', error);
            return null;
        }
    }

    function cacheData(players, gameDays) {
        try {
            localStorage.setItem('padlaot_players_cache', JSON.stringify(players));
            localStorage.setItem('padlaot_gamedays_cache', JSON.stringify(gameDays));
            localStorage.setItem('padlaot_last_fetch', Date.now().toString());
        } catch (error) {
            console.error('Error caching data:', error);
        }
    }

    function processAllData() {
        try {
            console.log('⚙️ Processing all data for display...');
            
            // Cache the real-time data for offline fallback
            cacheData(allPlayers, allGameDays);
            
            // Sort game days by date (newest first)
            allGameDays.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Update UI
            populateMonthFilter();
            applyFilters();
            displayQuickStats();
            
            // Hide loader and show content
            loader.style.display = 'none';
            gameNightsContainer.style.display = 'block';
            
            // Update last updated timestamp
            const now = new Date();
            const timeString = now.toLocaleTimeString('he-IL', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Jerusalem'
            });
            lastUpdated.textContent = `עודכן לאחרונה: ${timeString} (נתונים בזמן אמת)`;
            lastUpdated.style.color = '#28a745';
            
            console.log('✅ Data processing completed successfully');
            
        } catch (error) {
            console.error('❌ Error processing data:', error);
            loader.style.display = 'none';
            lastUpdated.textContent = 'שגיאה בעיבוד הנתונים';
            lastUpdated.style.color = 'red';
        }
    }

    function populateMonthFilter() {
        const months = new Set();
        allGameDays.forEach(gameDay => {
            const date = new Date(gameDay.date);
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.add(monthYear);
        });

        // Clear existing options except "all"
        monthFilter.innerHTML = '<option value="">כל החודשים</option>';
        
        // Add month options (sorted newest first)
        Array.from(months).sort().reverse().forEach(monthYear => {
            const [year, month] = monthYear.split('-');
            const date = new Date(year, month - 1);
            const monthName = date.toLocaleDateString('he-IL', { year: 'numeric', month: 'long' });
            
            const option = document.createElement('option');
            option.value = monthYear;
            option.textContent = monthName;
            monthFilter.appendChild(option);
        });
    }

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedMonth = monthFilter.value;
        const selectedStatus = statusFilter.value;

        filteredGameDays = allGameDays.filter(gameDay => {
            // Exclude drafts from timeline
            if (normalizeStatus(gameDay.status) === 0) return false;

            // Search filter
            if (searchTerm) {
                const gameDate = new Date(gameDay.date).toLocaleDateString('he-IL');
                const participantNames = gameDay.participants.map(id => {
                    const player = allPlayers.find(p => p.id === id);
                    return player ? player.name.toLowerCase() : '';
                }).join(' ');
                const searchMatch = gameDate.includes(searchTerm) || 
                                  participantNames.includes(searchTerm);
                if (!searchMatch) return false;
            }
            // Month filter
            if (selectedMonth) {
                const gameDate = new Date(gameDay.date);
                const gameMonth = `${gameDate.getFullYear()}-${String(gameDate.getMonth() + 1).padStart(2, '0')}`;
                if (gameMonth !== selectedMonth) return false;
            }
            // Status filter
            if (selectedStatus) {
                const selectedNum = parseInt(selectedStatus, 10);
                if (normalizeStatus(gameDay.status) !== selectedNum) return false;
            }
            return true;
        });
        renderGameNights();
    }

    function renderGameNights() {
        if (filteredGameDays.length === 0) {
            gameNightsContainer.innerHTML = '<p style="text-align: center; color: #6c757d; font-style: italic;">לא נמצאו משחקים</p>';
            return;
        }

        // Group by month
        const gamesByMonth = {};
        filteredGameDays.forEach(gameDay => {
            const date = new Date(gameDay.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!gamesByMonth[monthKey]) {
                gamesByMonth[monthKey] = [];
            }
            gamesByMonth[monthKey].push(gameDay);
        });

        // Render timeline
        gameNightsContainer.innerHTML = '';
        
        Object.keys(gamesByMonth).sort().reverse().forEach(monthKey => {
            const monthGroup = document.createElement('div');
            monthGroup.className = 'month-group';

            const [year, month] = monthKey.split('-');
            const monthDate = new Date(year, month - 1);
            const monthName = monthDate.toLocaleDateString('he-IL', { year: 'numeric', month: 'long' });

            const monthHeader = document.createElement('div');
            monthHeader.className = 'month-header';
            monthHeader.textContent = `📅 ${monthName}`;
            monthGroup.appendChild(monthHeader);

            gamesByMonth[monthKey].forEach(gameDay => {
                const gameCard = createGameNightCard(gameDay);
                monthGroup.appendChild(gameCard);
            });

            gameNightsContainer.appendChild(monthGroup);
        });
    }

    function createGameNightCard(gameDay) {
        const card = document.createElement('div');
        card.className = 'game-night-card';
        card.dataset.gameId = gameDay.id;

        const gameDate = new Date(gameDay.date);
        const formattedDate = gameDate.toLocaleDateString('he-IL', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        // Add status label for live/upcoming
        const statusNum = normalizeStatus(gameDay.status);
        const statusText = STATUS[statusNum];
        const statusClass = STATUS_CLASS[statusNum];
        const statusLabel = STATUS_LABEL[statusNum];

        const totalGoals = calculateTotalGoals(gameDay);
        const participantCount = gameDay.participants.length;
        const miniGameCount = gameDay.miniGames?.length || 0;

        card.innerHTML = `
            <div class="game-night-header" onclick="toggleGameNight('${gameDay.id}')">
                <div class="game-night-title">
                    <h3>
                        ⚽ ערב משחק - ${formattedDate}
                    </h3>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                        ${statusLabel}
                        <span class="expand-icon">▼</span>
                    </div>
                </div>
                <div class="game-night-info">
                    <div class="info-item">
                        <span>👥</span>
                        <span>${participantCount} שחקנים</span>
                    </div>
                    <div class="info-item">
                        <span>🎯</span>
                        <span>${miniGameCount} משחקים</span>
                    </div>
                    <div class="info-item">
                        <span>🥅</span>
                        <span>${totalGoals} גולים</span>
                    </div>
                </div>
            </div>
            <div class="game-night-content">
                <div class="game-night-tabs">
                    <button class="game-night-tab active" onclick="switchTab('${gameDay.id}', 'games')">
                        משחקים
                    </button>
                    <button class="game-night-tab" onclick="switchTab('${gameDay.id}', 'summary')">
                        סיכום ערב
                    </button>
                </div>
                
                <div id="games-${gameDay.id}" class="tab-content active">
                    <div class="mini-games-list">
                        <h4>משחקים</h4>
                        ${renderMiniGamesList(gameDay)}
                    </div>
                </div>
                
                <div id="summary-${gameDay.id}" class="tab-content">
                    ${renderGameNightSummary(gameDay)}
                </div>
            </div>
        `;

        return card;
    }

    function renderMiniGamesList(gameDay) {
        if (!gameDay.miniGames || gameDay.miniGames.length === 0) {
            return '<p style="color: #6c757d; font-style: italic;">לא נוספו משחקים עדיין</p>';
        }

        return gameDay.miniGames.map((miniGame, index) => {
            const teamAScore = miniGame.scoreA || 0;
            const teamBScore = miniGame.scoreB || 0;
            
            // Get team names with captain names
            const teamAName = getTeamDisplayName(gameDay, miniGame.teamA) || miniGame.teamA || 'קבוצה א';
            const teamBName = getTeamDisplayName(gameDay, miniGame.teamB) || miniGame.teamB || 'קבוצה ב';
            
            // Get scorers info
            const scorersInfo = getScorersInfo(miniGame);
            
            // Get team rosters
            const teamRosterInfo = getTeamRosterInfo(gameDay, miniGame);
            
            return `
                <div class="mini-game-item" data-mini-game-id="${gameDay.id}-${index}">
                    <div class="mini-game-header" onclick="toggleMiniGame('${gameDay.id}', ${index})">
                        <div class="mini-game-main">
                            <div class="game-number">משחק ${index + 1}</div>
                            <div class="game-teams">
                                ${teamAName} vs ${teamBName}
                                ${teamAScore > teamBScore ? '' : teamBScore > teamAScore ? '' : '🤝'}
                            </div>
                            ${scorersInfo ? `<div class="game-scorers">${scorersInfo}</div>` : ''}
                        </div>
                        <div class="mini-game-controls">
                            <div class="game-score">
                                ${teamAScore} - ${teamBScore}
                            </div>
                            <span class="mini-expand-icon">▼</span>
                        </div>
                    </div>
                    <div class="mini-game-details">
                        ${teamRosterInfo}
                    </div>
                </div>
            `;
        }).join('');
    }

    function getTeamDisplayName(gameDay, teamLetter) {
        if (!gameDay.teams || !gameDay.teams[teamLetter] || gameDay.teams[teamLetter].length === 0) {
            return null;
        }
        
        // First player in team array is the captain
        const captainId = gameDay.teams[teamLetter][0];
        const captain = allPlayers.find(p => p.id === captainId);
        
        if (captain) {
            return captain.name;
        }
        
        return `קבוצה ${teamLetter}`;
    }

    function getScorersInfo(miniGame) {
        if (!miniGame.scorers || miniGame.scorers.length === 0) return '';
        
        const scorers = [];
        const assisters = [];
        
        miniGame.scorers.forEach(scorer => {
            const player = allPlayers.find(p => p.id === scorer.playerId);
            if (player) {
                if (scorer.goals > 0) {
                    scorers.push(`${player.name} (${scorer.goals})`);
                }
                if (scorer.assists > 0) {
                    assisters.push(`${player.name} (${scorer.assists})`);
                }
            }
        });
        
        let result = '';
        if (scorers.length > 0) {
            result += `מביקיעים: ${scorers.join(', ')}`;
        }
        if (assisters.length > 0) {
            if (result) result += ' | ';
            result += `מבשלים: ${assisters.join(', ')}`;
        }
        
        return result;
    }

    function getTeamRosterInfo(gameDay, miniGame) {
        if (!gameDay.teams || !miniGame.teamA || !miniGame.teamB) {
            return '<p class="no-roster-info">מידע על הקבוצות לא זמין</p>';
        }
        
        const teamAPlayers = gameDay.teams[miniGame.teamA] || [];
        const teamBPlayers = gameDay.teams[miniGame.teamB] || [];
        
        if (teamAPlayers.length === 0 && teamBPlayers.length === 0) {
            return '<p class="no-roster-info">מידע על השחקנים לא זמין</p>';
        }
        
        const teamAName = getTeamDisplayName(gameDay, miniGame.teamA) || `קבוצה ${miniGame.teamA}`;
        const teamBName = getTeamDisplayName(gameDay, miniGame.teamB) || `קבוצה ${miniGame.teamB}`;
        
        const teamAList = teamAPlayers.map((playerId, index) => {
            const player = allPlayers.find(p => p.id === playerId);
            const playerName = player ? player.name : 'שחקן לא ידוע';
            const playerStats = getPlayerStatsForMiniGame(miniGame, playerId);
            const statsEmojis = getPlayerStatsEmojis(playerStats);
            const captainPrefix = index === 0 ? '👑 ' : '• ';
            const captainSuffix = index === 0 ? ' (קפטן)' : '';
            return `${captainPrefix}${playerName}${captainSuffix}${statsEmojis}`;
        }).join('<br>');
        
        const teamBList = teamBPlayers.map((playerId, index) => {
            const player = allPlayers.find(p => p.id === playerId);
            const playerName = player ? player.name : 'שחקן לא ידוע';
            const playerStats = getPlayerStatsForMiniGame(miniGame, playerId);
            const statsEmojis = getPlayerStatsEmojis(playerStats);
            const captainPrefix = index === 0 ? '👑 ' : '• ';
            const captainSuffix = index === 0 ? ' (קפטן)' : '';
            return `${captainPrefix}${playerName}${captainSuffix}${statsEmojis}`;
        }).join('<br>');
        
        return `
            <div class="team-rosters">
                <div class="team-roster">
                    <h6 class="roster-title">📋 ${teamAName} (${teamAPlayers.length}):</h6>
                    <div class="roster-list">${teamAList}</div>
                </div>
                <div class="team-roster">
                    <h6 class="roster-title">📋 ${teamBName} (${teamBPlayers.length}):</h6>
                    <div class="roster-list">${teamBList}</div>
                </div>
            </div>
        `;
    }

    function getPlayerStatsForMiniGame(miniGame, playerId) {
        if (!miniGame.scorers || miniGame.scorers.length === 0) {
            return { goals: 0, assists: 0 };
        }
        
        const playerScorer = miniGame.scorers.find(scorer => scorer.playerId === playerId);
        if (playerScorer) {
            return {
                goals: playerScorer.goals || 0,
                assists: playerScorer.assists || 0
            };
        }
        
        return { goals: 0, assists: 0 };
    }

    function getPlayerStatsEmojis(stats) {
        let emojis = '';
        
        // Add football emojis for goals
        if (stats.goals > 0) {
            emojis += ' ' + '⚽'.repeat(stats.goals);
        }
        
        // Add chef emojis for assists
        if (stats.assists > 0) {
            emojis += ' ' + '👨‍🍳'.repeat(stats.assists);
        }
        
        return emojis;
    }

    function calculateTotalGoals(gameDay) {
        if (!gameDay.miniGames) return 0;
        
        return gameDay.miniGames.reduce((total, miniGame) => {
            return total + (miniGame.scoreA || 0) + (miniGame.scoreB || 0);
        }, 0);
    }

    function displayQuickStats() {
        const quickStatsGrid = document.getElementById('quick-stats-grid');
        if (!quickStatsGrid) return;

        const stats = calculateQuickStats();
        
        quickStatsGrid.innerHTML = `
            <div class="quick-stat-card">
                <span class="quick-stat-icon">🏆</span>
                <span class="quick-stat-number">${stats.totalGameNights}</span>
                <span class="quick-stat-label">לילות משחק</span>
            </div>
            <div class="quick-stat-card">
                <span class="quick-stat-icon">🎮</span>
                <span class="quick-stat-number">${stats.totalMiniGames}</span>
                <span class="quick-stat-label">סה"כ משחקים</span>
            </div>
            <div class="quick-stat-card">
                <span class="quick-stat-icon">⚽</span>
                <span class="quick-stat-number">${stats.avgGoalsPerGame}</span>
                <span class="quick-stat-label">ממוצע גולים למשחק</span>
            </div>
            <div class="quick-stat-card">
                <span class="quick-stat-icon">🥅</span>
                <span class="quick-stat-number">${stats.totalGoals}</span>
                <span class="quick-stat-label">סה"כ גולים</span>
            </div>
            <div class="quick-stat-card highlight">
                <span class="quick-stat-icon">👑</span>
                <span class="quick-stat-number">${stats.topScorer.goals}</span>
                <span class="quick-stat-label">מלך השערים<br/>${stats.topScorer.name}</span>
            </div>
            <div class="quick-stat-card highlight">
                <span class="quick-stat-icon">👨‍🍳</span>
                <span class="quick-stat-number">${stats.topAssister.assists}</span>
                <span class="quick-stat-label">מלך הבישולים<br/>${stats.topAssister.name}</span>
            </div>
        `;
    }

    function calculateQuickStats() {
        const completedGames = allGameDays.filter(g => g.status === 3);
        const totalMiniGames = allGameDays.reduce((sum, g) => sum + (g.miniGames?.length || 0), 0);
        const totalGoals = allGameDays.reduce((sum, g) => sum + calculateTotalGoals(g), 0);
        const totalPlayers = allGameDays.reduce((sum, g) => sum + (g.participants?.length || 0), 0);

        // Calculate player statistics across all games
        const playerStats = {};
        allGameDays.forEach(gameDay => {
            if (gameDay.miniGames) {
                gameDay.miniGames.forEach(miniGame => {
                    if (miniGame.scorers) {
                        miniGame.scorers.forEach(scorer => {
                            if (!playerStats[scorer.playerId]) {
                                const player = allPlayers.find(p => p.id === scorer.playerId);
                                playerStats[scorer.playerId] = {
                                    name: player ? player.name : 'שחקן לא ידוע',
                                    goals: 0,
                                    assists: 0
                                };
                            }
                            playerStats[scorer.playerId].goals += scorer.goals || 0;
                            playerStats[scorer.playerId].assists += scorer.assists || 0;
                        });
                    }
                });
            }
        });

        // Find top scorer and top assister
        const players = Object.values(playerStats);
        const topScorer = players.reduce((max, player) => 
            player.goals > (max.goals || 0) ? player : max, { name: 'אין נתונים', goals: 0 });
        const topAssister = players.reduce((max, player) => 
            player.assists > (max.assists || 0) ? player : max, { name: 'אין נתונים', assists: 0 });

        return {
            totalGameNights: allGameDays.length,
            totalMiniGames: totalMiniGames,
            totalGoals: totalGoals,
            avgGoalsPerGame: totalMiniGames > 0 ? (totalGoals / totalMiniGames).toFixed(1) : '0.0',
            topScorer: topScorer,
            topAssister: topAssister
        };
    }

    function getStatusText(status) {
        return STATUS[normalizeStatus(status)] || '';
    }

    // Global function for toggling game nights
    window.toggleGameNight = function(gameId) {
        const card = document.querySelector(`[data-game-id="${gameId}"]`);
        if (card) {
            card.classList.toggle('expanded');
        }
    };

    // Global function for toggling mini-games
    window.toggleMiniGame = function(gameId, miniGameIndex) {
        const miniGameId = `${gameId}-${miniGameIndex}`;
        const miniGameItem = document.querySelector(`[data-mini-game-id="${miniGameId}"]`);
        if (miniGameItem) {
            miniGameItem.classList.toggle('expanded');
        }
    };

    function renderGameNightSummary(gameDay) {
        const playerStats = calculateGameNightPlayerStats(gameDay);
        const teamStats = calculateGameNightTeamStats(gameDay);
        
        return `
            <div class="game-summary">
                <div class="summary-section">
                    <div class="summary-title">
                        <span>⚽</span>
                        <span>מלכי השערים</span>
                    </div>
                    <div class="player-stats-list">
                        ${playerStats.topScorers.length > 0 ? 
                            playerStats.topScorers.map(player => `
                                <div class="player-stat-item">
                                    <span class="player-stat-name">${player.name}</span>
                                    <span class="player-stat-value">${player.goals} ${player.goals === 1 ? 'גול' : 'גולים'}</span>
                                </div>
                            `).join('') : 
                            '<div class="no-stats">אין נתוני שערים</div>'
                        }
                    </div>
                </div>
                
                <div class="summary-section">
                    <div class="summary-title">
                        <span>👨‍🍳</span>
                        <span>מלכי הבישולים</span>
                    </div>
                    <div class="player-stats-list">
                        ${playerStats.topAssisters.length > 0 ? 
                            playerStats.topAssisters.map(player => `
                                <div class="player-stat-item">
                                    <span class="player-stat-name">${player.name}</span>
                                    <span class="player-stat-value">${player.assists} ${player.assists === 1 ? 'בישול' : 'בישולים'}</span>
                                </div>
                            `).join('') : 
                            '<div class="no-stats">אין נתוני בישולים</div>'
                        }
                    </div>
                </div>
                
                <div class="summary-section">
                    <div class="summary-title">
                        <span>🏆</span>
                        <span>סטטיסטיקות קבוצות</span>
                    </div>
                    <div class="team-stats-list">
                        ${teamStats.length > 0 ? 
                            teamStats.map(team => `
                                <div class="team-stat-item">
                                    <span class="team-stat-name">קבוצה ${team.teamLetter} (${team.captainName})</span>
                                    <span class="team-stat-value">${team.gamesPlayed} משחקים | ${team.wins} ניצחונות</span>
                                </div>
                            `).join('') : 
                            '<div class="no-stats">אין נתוני קבוצות</div>'
                        }
                    </div>
                </div>
            </div>
        `;
    }

    function calculateGameNightPlayerStats(gameDay) {
        const playerStats = {};
        
        if (gameDay.miniGames) {
            gameDay.miniGames.forEach(miniGame => {
                if (miniGame.scorers) {
                    miniGame.scorers.forEach(scorer => {
                        if (!playerStats[scorer.playerId]) {
                            const player = allPlayers.find(p => p.id === scorer.playerId);
                            playerStats[scorer.playerId] = {
                                name: player ? player.name : 'שחקן לא ידוע',
                                goals: 0,
                                assists: 0
                            };
                        }
                        playerStats[scorer.playerId].goals += scorer.goals || 0;
                        playerStats[scorer.playerId].assists += scorer.assists || 0;
                    });
                }
            });
        }

        const players = Object.values(playerStats);
        
        // Get top scorers (players with goals > 0, sorted by goals desc)
        const topScorers = players
            .filter(p => p.goals > 0)
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 5); // Top 5 scorers

        // Get top assisters (players with assists > 0, sorted by assists desc)
        const topAssisters = players
            .filter(p => p.assists > 0)
            .sort((a, b) => b.assists - a.assists)
            .slice(0, 5); // Top 5 assisters

        return {
            topScorers,
            topAssisters
        };
    }

    function calculateGameNightTeamStats(gameDay) {
        const teamStats = {};
        
        // Initialize team stats for all teams that exist
        if (gameDay.teams) {
            Object.keys(gameDay.teams).forEach(teamLetter => {
                if (gameDay.teams[teamLetter] && gameDay.teams[teamLetter].length > 0) {
                    const captainId = gameDay.teams[teamLetter][0];
                    const captain = allPlayers.find(p => p.id === captainId);
                    
                    teamStats[teamLetter] = {
                        teamLetter: teamLetter,
                        captainName: captain ? captain.name : `קפטן ${teamLetter}`,
                        gamesPlayed: 0,
                        wins: 0
                    };
                }
            });
        }
        
        // Count games played and wins for each team
        if (gameDay.miniGames) {
            gameDay.miniGames.forEach(miniGame => {
                const teamA = miniGame.teamA;
                const teamB = miniGame.teamB;
                const scoreA = miniGame.scoreA || 0;
                const scoreB = miniGame.scoreB || 0;
                
                // Count games played
                if (teamStats[teamA]) {
                    teamStats[teamA].gamesPlayed++;
                }
                if (teamStats[teamB]) {
                    teamStats[teamB].gamesPlayed++;
                }
                
                // Count wins (only if there's a clear winner, no draws)
                if (scoreA > scoreB && teamStats[teamA]) {
                    teamStats[teamA].wins++;
                } else if (scoreB > scoreA && teamStats[teamB]) {
                    teamStats[teamB].wins++;
                }
            });
        }
        
        // Convert to array and sort by wins descending, then by games played
        return Object.values(teamStats)
            .sort((a, b) => {
                if (b.wins !== a.wins) {
                    return b.wins - a.wins; // Sort by wins descending
                }
                return b.gamesPlayed - a.gamesPlayed; // Then by games played descending
            });
    }

    // Global function for tab switching
    window.switchTab = function(gameId, tabType) {
        // Remove active class from all tabs for this game
        const tabButtons = document.querySelectorAll(`[onclick*="${gameId}"]`);
        tabButtons.forEach(btn => btn.classList.remove('active'));
        
        // Hide all tab contents for this game
        const tabContents = document.querySelectorAll(`#summary-${gameId}, #games-${gameId}`);
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Activate clicked tab and show its content
        event.target.classList.add('active');
        document.getElementById(`${tabType}-${gameId}`).classList.add('active');
    };

    function initializePlayerPerformance() {
        // Only render if performance view is active, otherwise it will be rendered when switching views
        const performanceBtn = document.getElementById('performance-view-btn');
        if (performanceBtn && performanceBtn.classList.contains('active')) {
            renderPlayerPerformance();
        }
    }

    function renderPlayerPerformance() {
        const performanceContent = document.getElementById('performance-content');
        if (!performanceContent) return;

        // Save search input state (value, focus, selection)
        let prevInput = document.getElementById('performance-search');
        let prevValue = performanceSearchValue;
        let prevSelectionStart = null, prevSelectionEnd = null, wasFocused = false;
        if (prevInput) {
            prevValue = prevInput.value;
            prevSelectionStart = prevInput.selectionStart;
            prevSelectionEnd = prevInput.selectionEnd;
            wasFocused = document.activeElement === prevInput;
        }

        const playerStats = calculateAllPlayerStats();
        let filteredStats = playerStats;
        if (performanceSearchValue.trim() !== '') {
            const search = performanceSearchValue.trim().toLowerCase();
            filteredStats = playerStats.filter(p => p.name.toLowerCase().includes(search));
        }
        const content = renderCombinedView(filteredStats);
        performanceContent.innerHTML = `
            <div class="performance-controls" style="justify-content: flex-start; gap: 20px;">
                <input id="performance-search" type="text" placeholder="חפש שחקן..." value="${performanceSearchValue.replace(/"/g, '&quot;')}">
            </div>
            ${content}
        `;
        updateSortArrows(performanceContent);
        const sortableHeaders = performanceContent.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-sort');
                if (currentSortColumn === column) {
                    currentSortDirection = currentSortDirection === 'desc' ? 'asc' : 'desc';
                } else {
                    currentSortColumn = column;
                    currentSortDirection = column === 'name' ? 'asc' : 'desc';
                }
                renderPlayerPerformance();
            });
        });
        // Add search event listener
        const searchInput = document.getElementById('performance-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                performanceSearchValue = e.target.value;
                renderPlayerPerformance();
            });
            // Restore focus and selection
            if (wasFocused) {
                searchInput.focus();
                if (prevSelectionStart !== null && prevSelectionEnd !== null) {
                    searchInput.setSelectionRange(prevSelectionStart, prevSelectionEnd);
                }
            }
        }
    }
    
    function updateSortArrows(container) {
        // Reset all arrows to empty
        const allArrows = container.querySelectorAll('.sort-arrow');
        allArrows.forEach(arrow => {
            arrow.textContent = '';
            arrow.classList.remove('active');
        });
        
        // Update the active column arrow
        const activeHeader = container.querySelector(`[data-sort="${currentSortColumn}"]`);
        if (activeHeader) {
            const arrow = activeHeader.querySelector('.sort-arrow');
            if (arrow) {
                arrow.textContent = currentSortDirection === 'desc' ? '↓' : '↑';
                arrow.classList.add('active');
            }
        }
    }

    function calculateAllPlayerStats() {
        const playerStats = {};
        
        allGameDays.forEach(gameDay => {
            if (gameDay.miniGames) {
                gameDay.miniGames.forEach(miniGame => {
                    // Track all players who participated in this mini game
                    const participatingPlayers = new Set();
                    
                    // Add players who scored/assisted
                    if (miniGame.scorers) {
                        miniGame.scorers.forEach(scorer => {
                            participatingPlayers.add(scorer.playerId);
                            
                            if (!playerStats[scorer.playerId]) {
                                const player = allPlayers.find(p => p.id === scorer.playerId);
                                playerStats[scorer.playerId] = {
                                    name: player ? player.name : 'שחקן לא ידוע',
                                    playerId: scorer.playerId,
                                    goals: 0,
                                    assists: 0,
                                    miniGamesPlayed: 0,
                                    gameNightsPlayed: new Set(),
                                    miniGameIds: new Set()
                                };
                            }
                            
                            playerStats[scorer.playerId].goals += scorer.goals || 0;
                            playerStats[scorer.playerId].assists += scorer.assists || 0;
                            playerStats[scorer.playerId].gameNightsPlayed.add(gameDay.id);
                            playerStats[scorer.playerId].miniGameIds.add(`${gameDay.id}-${miniGame.id || Math.random()}`);
                        });
                    }
                    
                    // Add all players from team rosters (even if they didn't score/assist)
                    if (gameDay.teams) {
                        // Add players from team A
                        if (gameDay.teams[miniGame.teamA]) {
                            gameDay.teams[miniGame.teamA].forEach(playerId => {
                                participatingPlayers.add(playerId);
                                
                                if (!playerStats[playerId]) {
                                    const player = allPlayers.find(p => p.id === playerId);
                                    playerStats[playerId] = {
                                        name: player ? player.name : 'שחקן לא ידוע',
                                        playerId: playerId,
                                        goals: 0,
                                        assists: 0,
                                        miniGamesPlayed: 0,
                                        gameNightsPlayed: new Set(),
                                        miniGameIds: new Set()
                                    };
                                }
                                
                                playerStats[playerId].gameNightsPlayed.add(gameDay.id);
                                playerStats[playerId].miniGameIds.add(`${gameDay.id}-${miniGame.id || Math.random()}`);
                            });
                        }
                        
                        // Add players from team B
                        if (gameDay.teams[miniGame.teamB]) {
                            gameDay.teams[miniGame.teamB].forEach(playerId => {
                                participatingPlayers.add(playerId);
                                
                                if (!playerStats[playerId]) {
                                    const player = allPlayers.find(p => p.id === playerId);
                                    playerStats[playerId] = {
                                        name: player ? player.name : 'שחקן לא ידוע',
                                        playerId: playerId,
                                        goals: 0,
                                        assists: 0,
                                        miniGamesPlayed: 0,
                                        gameNightsPlayed: new Set(),
                                        miniGameIds: new Set()
                                    };
                                }
                                
                                playerStats[playerId].gameNightsPlayed.add(gameDay.id);
                                playerStats[playerId].miniGameIds.add(`${gameDay.id}-${miniGame.id || Math.random()}`);
                            });
                        }
                    }
                });
            }
        });

        // Calculate mini games played, game nights played, wins, and derived stats
        Object.values(playerStats).forEach(player => {
            player.miniGamesPlayed = player.miniGameIds.size;
            player.gameNightsCount = player.gameNightsPlayed.size;
            player.wins = calculatePlayerWins(player.playerId);
            player.totalPoints = player.goals + player.assists;
            player.avgPerGame = player.miniGamesPlayed > 0 ? (player.totalPoints / player.miniGamesPlayed).toFixed(2) : '0.00';
            player.goalsPerGame = player.miniGamesPlayed > 0 ? (player.goals / player.miniGamesPlayed).toFixed(2) : '0.00';
            player.assistsPerGame = player.miniGamesPlayed > 0 ? (player.assists / player.miniGamesPlayed).toFixed(2) : '0.00';
        });

        return Object.values(playerStats);
    }

    function calculatePlayerWins(playerId) {
        let wins = 0;
        
        allGameDays.forEach(gameDay => {
            if (gameDay.miniGames) {
                gameDay.miniGames.forEach(miniGame => {
                    // Check if player participated in this mini game (check team rosters)
                    let playerParticipated = false;
                    let playerTeam = null;
                    
                    // Check team rosters first
                    if (gameDay.teams) {
                        if (gameDay.teams[miniGame.teamA] && 
                            gameDay.teams[miniGame.teamA].includes(playerId)) {
                            playerParticipated = true;
                            playerTeam = miniGame.teamA;
                        } else if (gameDay.teams[miniGame.teamB] && 
                            gameDay.teams[miniGame.teamB].includes(playerId)) {
                            playerParticipated = true;
                            playerTeam = miniGame.teamB;
                        }
                    }
                    
                    // If not found in rosters, check if player scored/assisted
                    if (!playerParticipated && miniGame.scorers) {
                        playerParticipated = miniGame.scorers.some(scorer => scorer.playerId === playerId);
                    }
                    
                    if (playerParticipated) {
                        // Get the scores
                        const scoreA = miniGame.scoreA || 0;
                        const scoreB = miniGame.scoreB || 0;
                        
                        // Skip ties
                        if (scoreA === scoreB) {
                            return;
                        }
                        
                        // If we found the player's team, check if they won
                        if (playerTeam) {
                            if ((playerTeam === miniGame.teamA && scoreA > scoreB) || 
                                (playerTeam === miniGame.teamB && scoreB > scoreA)) {
                                wins++;
                            }
                        }
                    }
                });
            }
        });
        
        return wins;
    }

    // Helper function to sort player statistics
    function sortPlayerStats(playerStats, column, direction) {
        const sortedStats = [...playerStats];
        
        sortedStats.sort((a, b) => {
            let aVal, bVal;
            
            switch (column) {
                case 'name':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'goals':
                    aVal = a.goals;
                    bVal = b.goals;
                    break;
                case 'assists':
                    aVal = a.assists;
                    bVal = b.assists;
                    break;
                case 'wins':
                    aVal = a.wins;
                    bVal = b.wins;
                    break;
                case 'games':
                    aVal = a.miniGamesPlayed;
                    bVal = b.miniGamesPlayed;
                    break;
                case 'gameNights':
                    aVal = a.gameNightsCount;
                    bVal = b.gameNightsCount;
                    break;
                case 'avg':
                    aVal = parseFloat(a.avgPerGame);
                    bVal = parseFloat(b.avgPerGame);
                    break;
                case 'goalsPerGame':
                    aVal = parseFloat(a.goalsPerGame);
                    bVal = parseFloat(b.goalsPerGame);
                    break;
                case 'assistsPerGame':
                    aVal = parseFloat(a.assistsPerGame);
                    bVal = parseFloat(b.assistsPerGame);
                    break;
                default:
                    aVal = a.wins;
                    bVal = b.wins;
            }
            
            if (column === 'name') {
                // For names, use string comparison
                if (direction === 'asc') {
                    return aVal.localeCompare(bVal, 'he');
                } else {
                    return bVal.localeCompare(aVal, 'he');
                }
            } else {
                // For numbers
                if (direction === 'asc') {
                    return aVal - bVal;
                } else {
                    return bVal - aVal;
                }
            }
        });
        
        return sortedStats;
    }

    function renderCombinedView(playerStats) {
        const totalGoals = playerStats.reduce((sum, p) => sum + p.goals, 0);
        const totalAssists = playerStats.reduce((sum, p) => sum + p.assists, 0);
        
        // Calculate total unique games played across all players
        const totalGames = allGameDays.reduce((sum, gameDay) => {
            return sum + (gameDay.miniGames ? gameDay.miniGames.length : 0);
        }, 0);
        
        const avgGoalsPerGame = totalGames > 0 ? (totalGoals / totalGames).toFixed(1) : '0.0';
        const avgAssistsPerPlayer = playerStats.length > 0 ? (totalAssists / playerStats.length).toFixed(1) : '0.0';

        // Sort players based on current sort state
        let sortedPlayers = [...playerStats];
        sortedPlayers = sortPlayerStats(sortedPlayers, currentSortColumn, currentSortDirection);

        return `
            <div class="performance-summary">
                <div class="summary-card">
                    <h4>סה"כ שחקנים פעילים</h4>
                    <div class="summary-value">${playerStats.length}</div>
                    <div class="summary-label">שחקנים</div>
                </div>
                <div class="summary-card">
                    <h4>סה"כ שערים</h4>
                    <div class="summary-value">${totalGoals}</div>
                    <div class="summary-label">שערים</div>
                </div>
                <div class="summary-card">
                    <h4>סה"כ בישולים</h4>
                    <div class="summary-value">${totalAssists}</div>
                    <div class="summary-label">בישולים</div>
                </div>
                <div class="summary-card">
                    <h4>ממוצע שערים למשחק</h4>
                    <div class="summary-value">${avgGoalsPerGame}</div>
                    <div class="summary-label">שערים</div>
                </div>
            </div>
            
            <table class="performance-table">
                <thead>
                    <tr>
                        <th>דירוג</th>
                        <th class="sortable" data-sort="name">שחקן <span class="sort-arrow"></span></th>
                        <th class="sortable" data-sort="goals">שערים <span class="sort-arrow"></span></th>
                        <th class="sortable" data-sort="assists">בישולים <span class="sort-arrow"></span></th>
                        <th class="sortable" data-sort="wins">ניצחונות <span class="sort-arrow"></span></th>
                        <th class="sortable" data-sort="games">משחקים <span class="sort-arrow"></span></th>
                        <th class="sortable" data-sort="gameNights">ערבי משחק <span class="sort-arrow"></span></th>
                        <th class="sortable" data-sort="avg">ממוצע למשחק <span class="sort-arrow"></span></th>
                        <th class="sortable" data-sort="goalsPerGame">שערים למשחק <span class="sort-arrow"></span></th>
                        <th class="sortable" data-sort="assistsPerGame">בישולים למשחק <span class="sort-arrow"></span></th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedPlayers.map((player, index) => `
                        <tr>
                            <td class="player-rank">${index + 1}</td>
                            <td class="player-name">${player.name}</td>
                            <td class="stat-value">${player.goals}</td>
                            <td class="stat-value">${player.assists}</td>
                            <td class="stat-value">${player.wins}</td>
                            <td class="stat-value">${player.miniGamesPlayed}</td>
                            <td class="stat-value">${player.gameNightsCount}</td>
                            <td class="stat-value">${player.avgPerGame}</td>
                            <td class="stat-value">${player.goalsPerGame}</td>
                            <td class="stat-value">${player.assistsPerGame}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // Global functions for view and performance tab switching
    window.switchView = function(viewType) {
        const timelineBtn = document.getElementById('timeline-view-btn');
        const performanceBtn = document.getElementById('performance-view-btn');
        const timelineContainer = document.getElementById('timeline-view-container');
        const performanceContainer = document.getElementById('performance-view-container');

        if (viewType === 'timeline') {
            timelineBtn.classList.add('active');
            performanceBtn.classList.remove('active');
            timelineContainer.classList.remove('hidden');
            performanceContainer.classList.add('hidden');
        } else if (viewType === 'performance') {
            timelineBtn.classList.remove('active');
            performanceBtn.classList.add('active');
            timelineContainer.classList.add('hidden');
            performanceContainer.classList.remove('hidden');
            
            // Initialize performance view with data if it's empty
            if (allGameDays.length > 0 && allPlayers.length > 0) {
                renderPlayerPerformance();
            }
        }
    };

    // Utility: get today's date in Israeli timezone
    function getTodayIsrael() {
        return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' });
    }
    
    // Auto-update today's games status (called only once per session)
    let todayStatusUpdated = false;
    async function updateTodayGameStatusOnce() {
        if (todayStatusUpdated) {
            console.log('Today\'s game status already updated this session');
            return;
        }
        
        try {
            const today = getTodayIsrael();
            console.log('Checking for today\'s games to update status:', today);
            
            // Get today's game
            const gameDayRef = doc(db, 'gameDays', today);
            const gameDaySnap = await getDoc(gameDayRef);
            
            if (gameDaySnap.exists()) {
                const gameData = gameDaySnap.data();
                const normalizedStatus = normalizeStatus(gameData.status);
                
                // If the game is "upcoming" (status 1), update it to "live" (status 2)
                if (normalizedStatus === 1) {
                    console.log('Found upcoming game for today, updating to live status');
                    await updateDoc(gameDayRef, { status: 2 });
                    console.log('Successfully updated today\'s game status to live');
                    
                    // Clear cache to force reload with updated status
                    globalCache = { players: null, gameDays: null, timestamp: 0, isLoading: false };
                    localStorage.removeItem('padlaot_gamedays_cache');
                } else {
                    console.log('Today\'s game status is already:', normalizedStatus);
                }
            } else {
                console.log('No game found for today');
            }
            
            todayStatusUpdated = true;
            
        } catch (error) {
            console.error('Error updating today\'s game status:', error);
            // Don't prevent other operations if this fails
        }
    }
});