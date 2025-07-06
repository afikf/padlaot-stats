// Import Firebase functions
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loader = document.getElementById('loader');
    const lastUpdated = document.getElementById('last-updated');
    const overallContainer = document.getElementById('overall-view-container');
    const byGameContainer = document.getElementById('by-game-view-container');
    const overallBtn = document.getElementById('overall-view-btn');
    const byGameBtn = document.getElementById('by-game-view-btn');

    let allPlayers = [];
    let allGameDays = [];
    let byGameViewRendered = false; // Flag to render by-game view only once

    // Cache keys
    const CACHE_KEYS = {
        PLAYERS: 'padlaot_players_cache',
        GAME_DAYS: 'padlaot_gamedays_cache',
        LAST_FETCH: 'padlaot_last_fetch'
    };

    // Cache duration (1 hour in milliseconds)
    const CACHE_DURATION = 60 * 60 * 1000;

    // Load data from Firebase with caching
    loadDataFromFirebase();

    async function loadDataFromFirebase() {
        try {
            console.log('Loading data from Firebase...');
            
            // Check if we have cached data that's still valid
            const cachedData = getCachedData();
            if (cachedData) {
                console.log('Using cached data');
                allPlayers = cachedData.players;
                allGameDays = cachedData.gameDays;
                loader.style.display = 'none';
                renderOverallView();
                lastUpdated.textContent = `עודכן לאחרונה: ${new Date(cachedData.lastFetch).toLocaleDateString('he-IL')} (מטמון)`;
                return;
            }

            // Load players and game days with timeout
            const [playersSnapshot, gameDaysSnapshot] = await Promise.all([
                Promise.race([
                    getDocs(collection(db, 'players')),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Players loading timeout')), 10000)
                    )
                ]),
                Promise.race([
                    getDocs(collection(db, 'gameDays')),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Game days loading timeout')), 10000)
                    )
                ])
            ]);

            loader.style.display = 'none';

            // Process players data
            allPlayers = [];
            playersSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.name) {
                    allPlayers.push({
                        id: doc.id,
                        name: data.name,
                        goals: data.totalGoals || 0,
                        assists: data.totalAssists || 0,
                        wins: data.totalWins || 0,
                        games: 0 // Will be calculated from game days
                    });
                }
            });

            // Process game days data to calculate games played
            allGameDays = [];
            gameDaysSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.status === 'completed' && data.participants) {
                    allGameDays.push({
                        id: doc.id,
                        date: data.date,
                        participants: data.participants,
                        miniGames: data.miniGames || [],
                        playerStats: data.playerStats || {}
                    });
                }
            });

            // Cache the data
            cacheData(allPlayers, allGameDays);

            // Calculate games played for each player
            calculateGamesPlayed();

            // Show all players, even those with zero stats
            if (allPlayers.length === 0) {
                overallContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">לא נמצאו שחקנים במסד הנתונים.</p>';
                lastUpdated.textContent = 'לא נמצאו שחקנים';
                return;
            }

            // Render the initial view
            renderOverallView();
            lastUpdated.textContent = `עודכן לאחרונה: ${new Date().toLocaleDateString('he-IL')}`;

        } catch (error) {
            console.error('Error loading data from Firebase:', error);
            loader.style.display = 'none';
            
            // Try to use cached data as fallback
            const cachedData = getCachedData(true); // Force use even if expired
            if (cachedData) {
                console.log('Using expired cached data as fallback');
                allPlayers = cachedData.players;
                allGameDays = cachedData.gameDays;
                calculateGamesPlayed();
                renderOverallView();
                lastUpdated.textContent = `נתונים מהמטמון (${new Date(cachedData.lastFetch).toLocaleDateString('he-IL')}) - שגיאה בטעינה`;
                lastUpdated.style.color = 'orange';
                return;
            }
            
            if (error.message.includes('timeout')) {
                lastUpdated.textContent = 'בעיית חיבור - לא ניתן לטעון את הנתונים';
            } else if (error.message.includes('quota')) {
                lastUpdated.textContent = 'הגעת למגבלת השימוש היומית - נסה שוב מחר או שדרג לתוכנית בתשלום';
            } else {
                lastUpdated.textContent = `שגיאה בטעינת הנתונים: ${error.message}`;
            }
            lastUpdated.style.color = 'red';
            
            // Show empty state
            overallContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">שגיאה בטעינת הנתונים. אנא נסה שוב מאוחר יותר.</p>';
        }
    }

    function getCachedData(forceUse = false) {
        try {
            const playersCache = localStorage.getItem(CACHE_KEYS.PLAYERS);
            const gameDaysCache = localStorage.getItem(CACHE_KEYS.GAME_DAYS);
            const lastFetch = localStorage.getItem(CACHE_KEYS.LAST_FETCH);

            if (!playersCache || !gameDaysCache || !lastFetch) {
                return null;
            }

            const lastFetchTime = parseInt(lastFetch);
            const now = Date.now();

            // Check if cache is still valid (or force use)
            if (!forceUse && (now - lastFetchTime) > CACHE_DURATION) {
                return null;
            }

            return {
                players: JSON.parse(playersCache),
                gameDays: JSON.parse(gameDaysCache),
                lastFetch: lastFetchTime
            };
        } catch (error) {
            console.error('Error reading cache:', error);
            return null;
        }
    }

    function cacheData(players, gameDays) {
        try {
            localStorage.setItem(CACHE_KEYS.PLAYERS, JSON.stringify(players));
            localStorage.setItem(CACHE_KEYS.GAME_DAYS, JSON.stringify(gameDays));
            localStorage.setItem(CACHE_KEYS.LAST_FETCH, Date.now().toString());
        } catch (error) {
            console.error('Error caching data:', error);
        }
    }

    // Add refresh button functionality
    function addRefreshButton() {
        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = '🔄 רענן נתונים';
        refreshBtn.className = 'refresh-btn';
        refreshBtn.onclick = () => {
            // Clear cache and reload
            localStorage.removeItem(CACHE_KEYS.PLAYERS);
            localStorage.removeItem(CACHE_KEYS.GAME_DAYS);
            localStorage.removeItem(CACHE_KEYS.LAST_FETCH);
            location.reload();
        };
        
        const header = document.querySelector('.header');
        if (header) {
            header.appendChild(refreshBtn);
        }
    }

    // Add refresh button after DOM is loaded
    setTimeout(addRefreshButton, 1000);

    function calculateGamesPlayed() {
        // Create a map to count games per player
        const gamesCount = new Map();
        
        allGameDays.forEach(gameDay => {
            gameDay.participants.forEach(playerId => {
                gamesCount.set(playerId, (gamesCount.get(playerId) || 0) + 1);
            });
        });

        // Update games count for each player
        allPlayers.forEach(player => {
            player.games = gamesCount.get(player.id) || 0;
        });
    }

    /** Renders the main overall stats table */
    function renderOverallView() {
        overallContainer.innerHTML = '';

        // Sort by goals (descending) by default
        const sortedPlayers = [...allPlayers].sort((a, b) => b.goals - a.goals);

        const headers = [
            { label: 'שם השחקן', key: 'name', sortable: true, isNumeric: false },
            { label: 'משחקים', key: 'games', sortable: true, isNumeric: true },
            { label: 'גולים', key: 'goals', sortable: true, isNumeric: true },
            { label: 'בישולים', key: 'assists', sortable: true, isNumeric: true },
            { label: 'ניצחונות', key: 'wins', sortable: true, isNumeric: true }
        ];
        
        const table = createTable(sortedPlayers, headers);
        overallContainer.appendChild(table);

        // Set initial sort indicator on 'goals' column
        setInitialSortIndicator(table, 'goals');
    }
    
    /** Renders by-game view, showing players for each game day */
    function renderByGameView() {
        byGameContainer.innerHTML = '';

        if (allGameDays.length === 0) {
            byGameContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">לא נמצאו נתוני משחקים להצגה.</p>';
            return;
        }

        const headers = [
            { label: 'שם השחקן', key: 'name', sortable: true, isNumeric: false },
            { label: 'גולים', key: 'goals', sortable: true, isNumeric: true },
            { label: 'בישולים', key: 'assists', sortable: true, isNumeric: true },
            { label: 'ניצחונות', key: 'wins', sortable: true, isNumeric: true }
        ];

        // Sort game days by date (newest first)
        const sortedGameDays = [...allGameDays].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedGameDays.forEach(gameDay => {
            // Get players who participated in this game day
            const participatingPlayers = allPlayers.filter(player => 
                gameDay.participants.includes(player.id)
            );

            // Calculate stats for this specific game day
            const gameStats = calculateGameDayStats(gameDay, participatingPlayers);

            // Sort by goals for this game
            gameStats.sort((a, b) => b.goals - a.goals);

            const title = document.createElement('h2');
            title.className = 'game-title';
            const dateObj = new Date(gameDay.date);
            title.textContent = `משחק מתאריך ${dateObj.toLocaleDateString('he-IL')}`;
            byGameContainer.appendChild(title);
            
            const tableContainer = document.createElement('div');
            tableContainer.className = 'table-container';
            const table = createTable(gameStats, headers);
            tableContainer.appendChild(table);
            byGameContainer.appendChild(tableContainer);

            // Set initial sort indicator on 'goals' column for this table
            setInitialSortIndicator(table, 'goals');
        });
    }

    function calculateGameDayStats(gameDay, participatingPlayers) {
        // Initialize stats for all participants
        const stats = participatingPlayers.map(player => ({
            name: player.name,
            goals: 0,
            assists: 0,
            wins: 0
        }));

        // Get stats directly from the game day's playerStats (not from individual mini-games)
        if (gameDay.playerStats) {
            Object.entries(gameDay.playerStats).forEach(([playerId, playerStats]) => {
                const player = participatingPlayers.find(p => p.id === playerId);
                if (player) {
                    const statEntry = stats.find(s => s.name === player.name);
                    if (statEntry) {
                        statEntry.goals = playerStats.goals || 0;
                        statEntry.assists = playerStats.assists || 0;
                        statEntry.wins = playerStats.wins || 0;
                    }
                }
            });
        }

        return stats;
    }

    function createTable(data, headers) {
        const table = document.createElement('table');
        const thead = table.createTHead();
        const tbody = table.createTBody();
        const headerRow = thead.insertRow();
        
        headers.forEach((header, index) => {
            const th = document.createElement('th');
            th.innerHTML = `<span class="sort-arrow"></span>${header.label}`;
            th.dataset.key = header.key;
            if (header.sortable) {
                th.classList.add('sortable');
                th.addEventListener('click', () => sortTable(table, index, header.isNumeric));
            }
            headerRow.appendChild(th);
        });
        
        data.forEach(item => {
            const row = tbody.insertRow();
            headers.forEach(header => {
                const cell = row.insertCell();
                const value = item[header.key];
                cell.textContent = value !== undefined ? value : 0;
            });
        });
        
        return table;
    }
    
    function setInitialSortIndicator(table, key) {
        const headerCell = table.querySelector(`th[data-key="${key}"]`);
        if (headerCell) {
            headerCell.classList.add('sort-desc');
        }
    }

    function sortTable(table, colIndex, isNumeric) {
        const tbody = table.tBodies[0];
        const rows = Array.from(tbody.rows);
        const header = table.tHead.rows[0].cells[colIndex];
        const currentOrder = header.classList.contains('sort-asc') ? 'asc' : 'desc';
        const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
        
        // Clear all sort indicators
        table.querySelectorAll('th').forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
        header.classList.add(newOrder === 'asc' ? 'sort-asc' : 'sort-desc');
        
        rows.sort((a, b) => {
            let valA = a.cells[colIndex].textContent.trim();
            let valB = b.cells[colIndex].textContent.trim();
            
            if (isNumeric) {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
            }
            
            if (valA < valB) return newOrder === 'asc' ? -1 : 1;
            if (valA > valB) return newOrder === 'asc' ? 1 : -1;
            return 0;
        });
        
        rows.forEach(row => tbody.appendChild(row));
    }

    // View Toggle Event Listeners
    overallBtn.addEventListener('click', () => {
        overallBtn.classList.add('active');
        byGameBtn.classList.remove('active');
        overallContainer.classList.remove('hidden');
        byGameContainer.classList.add('hidden');
    });

    byGameBtn.addEventListener('click', () => {
        byGameBtn.classList.add('active');
        overallBtn.classList.remove('active');
        byGameContainer.classList.remove('hidden');
        overallContainer.classList.add('hidden');
        
        if (!byGameViewRendered) {
            renderByGameView();
            byGameViewRendered = true; 
        }
    });
});