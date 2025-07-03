// Admin configuration
const ADMIN_PASSWORD = "padlaot2024"; // Change this to your desired password
const DEMO_MODE = false; // Set to true to test without Firebase

// Firebase variables (will be loaded conditionally)
let db = null;
let collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, increment, writeBatch, query, where;

// Load Firebase only if not in demo mode
async function initializeFirebase() {
    if (DEMO_MODE) {
        console.log('Demo mode: Skipping Firebase initialization');
        return;
    }
    
    try {
        console.log('Loading Firebase...');
        const firebaseConfig = await import("./firebase-config.js");
        db = firebaseConfig.db;
        
        const firestoreFunctions = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
        collection = firestoreFunctions.collection;
        doc = firestoreFunctions.doc;
        getDocs = firestoreFunctions.getDocs;
        getDoc = firestoreFunctions.getDoc;
        setDoc = firestoreFunctions.setDoc;
        updateDoc = firestoreFunctions.updateDoc;
        deleteDoc = firestoreFunctions.deleteDoc;
        increment = firestoreFunctions.increment;
        writeBatch = firestoreFunctions.writeBatch;
        query = firestoreFunctions.query;
        where = firestoreFunctions.where;
        
        console.log('Firebase loaded successfully');
    } catch (error) {
        console.error('Failed to load Firebase:', error);
        throw error;
    }
}

// Utility function to get today's date in Israeli timezone
function getTodayIsrael() {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' });
}

// Global state
let currentStep = 1; // Initialize current step
let currentGameDay = null;
let allPlayers = [];
let selectedPlayers = [];
let teams = { A: [], B: [], C: [] };
let miniGames = [];
let playerStats = {}; // This will track cumulative stats for the game day
let originalPlayerStats = {}; // Store original stats when editing to calculate difference
let navigationHistory = []; // Track navigation history for back button
let completedSteps = new Set(); // Track which steps have been completed
let isEditMode = false;
let isEditingUpcomingGame = false; // Track if we're in edit mode
let isViewOnlyMode = false; // Track if we're in view-only mode
let viewOnlySource = null; // Track where view-only mode was initiated from
let editModeSource = null; // Track where edit mode was initiated from

// DOM Elements
const authSection = document.getElementById('auth-section');
const adminMain = document.getElementById('admin-main');
const authForm = document.getElementById('auth-form');
const authError = document.getElementById('auth-error');
const loadingOverlay = document.getElementById('loading-overlay');

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, starting initialization...');
    
    // Immediately hide any loaders that might be showing
    const allLoaders = document.querySelectorAll('.loader, .loading-overlay, #loader');
    allLoaders.forEach(loader => {
        loader.style.display = 'none';
        loader.classList.add('hidden');
    });
    console.log('All loaders hidden immediately');
    
    try {
        // Initialize Firebase first (if not in demo mode)
        await initializeFirebase();
        
        // Then initialize the app
        initializeApp();
    } catch (error) {
        console.error('Critical error during app initialization:', error);
        // Show a user-friendly error message
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; font-family: Arial, sans-serif;">
                <h2 style="color: #e74c3c;">שגיאה בטעינת האפליקציה</h2>
                <p>אנא רענן את הדף או בדוק את החיבור לאינטרנט</p>
                <p style="font-size: 0.9em; color: #666;">שגיאה טכנית: ${error.message}</p>
                <button onclick="location.reload()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">רענן דף</button>
            </div>
        `;
    }
});

function initializeApp() {
    try {
        console.log('Starting admin app initialization...');
        console.log('Auth section:', authSection);
        console.log('Admin main:', adminMain);
        console.log('Loading overlay:', loadingOverlay);
        
        // FIRST: Make sure loading overlay is hidden
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            loadingOverlay.style.display = 'none'; // Force hide with inline style
            console.log('Loading overlay hidden');
        }
        
        setupEventListeners();
        setTodayAsDefault();
        
        // Make sure the auth section is visible and admin main is hidden
        if (authSection) {
            authSection.classList.remove('hidden');
            console.log('Auth section made visible');
        }
        if (adminMain) {
            adminMain.classList.add('hidden');
            console.log('Admin main hidden');
        }
        
        // Show demo indicator if in demo mode
        if (DEMO_MODE) {
            const demoIndicator = document.getElementById('demo-indicator');
            if (demoIndicator) {
                demoIndicator.style.display = 'block';
                console.log('Demo indicator shown');
            }
        }
        
        console.log('Admin app initialized successfully');
    } catch (error) {
        console.error('Error initializing admin app:', error);
        alert('שגיאה בטעינת האפליקציה: ' + error.message);
    }
}

function setupEventListeners() {
    try {
        // Check if critical DOM elements exist
        if (!authForm) {
            throw new Error('Auth form not found');
        }
        
        // Authentication
        authForm.addEventListener('submit', handleAuthentication);
        
        // Step 1: Create Game Day
        const createBtn = document.getElementById('create-gameday-btn');
        if (createBtn) {
            createBtn.addEventListener('click', createGameDay);
        }
        
        // Step 2: Player Selection
        const searchInput = document.getElementById('player-search');
        const confirmPlayersBtn = document.getElementById('confirm-players-btn');
        const skipToTeamsBtn = document.getElementById('skip-to-teams-btn');
        if (searchInput) searchInput.addEventListener('input', filterPlayers);
        if (confirmPlayersBtn) confirmPlayersBtn.addEventListener('click', confirmPlayerSelection);
        if (skipToTeamsBtn) skipToTeamsBtn.addEventListener('click', skipToTeamAssignment);
        
        // Step 3: Team Assignment
        const autoAssignBtn = document.getElementById('auto-assign-btn');
        const confirmTeamsBtn = document.getElementById('confirm-teams-btn');
        if (autoAssignBtn) autoAssignBtn.addEventListener('click', autoAssignTeams);
        if (confirmTeamsBtn) confirmTeamsBtn.addEventListener('click', confirmTeamAssignment);
        
        // Step 4: Mini-Games
        const addGameBtn = document.getElementById('add-mini-game-btn');
        const finalizeBtn = document.getElementById('finalize-gameday-btn');
        if (addGameBtn) addGameBtn.addEventListener('click', addMiniGame);
        if (finalizeBtn) finalizeBtn.addEventListener('click', finalizeGameDay);
        
        // Step 5: Completion
        const newGameBtn = document.getElementById('new-gameday-btn');
        if (newGameBtn) newGameBtn.addEventListener('click', startNewGameDay);
        
        // History navigation
        const viewHistoryBtn = document.getElementById('view-history-btn');
        const backToCreateBtn = document.getElementById('back-to-create-btn');
        if (viewHistoryBtn) viewHistoryBtn.addEventListener('click', showGameHistory);
        if (backToCreateBtn) backToCreateBtn.addEventListener('click', backToCreate);
        
        // Live games management
        const manageLiveGameBtn = document.getElementById('manage-live-game-btn');
        if (manageLiveGameBtn) manageLiveGameBtn.addEventListener('click', manageLiveGame);
        
        // Step navigation
        setupStepNavigation();
        
        console.log('Event listeners set up successfully');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        throw error;
    }
}

function setTodayAsDefault() {
    const today = getTodayIsrael();
    const gameDateInput = document.getElementById('game-date');
    gameDateInput.value = today;
    gameDateInput.min = today; // Prevent selecting past dates
}

// Authentication
async function handleAuthentication(e) {
    e.preventDefault();
    const password = document.getElementById('admin-password').value;
    
    if (password === ADMIN_PASSWORD) {
        // Completely hide auth section and show clean admin interface
        authSection.style.display = 'none';
        adminMain.style.display = 'block';
        adminMain.classList.remove('hidden');
        
        // Clean up the page background
        document.body.style.background = '#f8f9fa';
        
        // Clear navigation history when logging in
        clearNavigationHistory();
        
        // Start with step 1
        goToStep(1);
        
        // Check for live games
        await checkForLiveGames();
        
        authError.textContent = '';
        console.log('Admin authenticated - showing clean interface');
    } else {
        authError.textContent = 'סיסמה שגויה';
        authError.style.color = 'red';
        authError.style.display = 'block';
    }
}

// Step 1: Create Game Day
async function createGameDay() {
    const gameDate = document.getElementById('game-date').value;
    if (!gameDate) {
        alert('אנא בחר תאריך');
        return;
    }
    
    if (DEMO_MODE) {
        console.log('Demo mode: Creating game day without Firebase');
        
        // Initialize game day structure
        currentGameDay = {
            date: gameDate,
            participants: [],
            teams: { A: [], B: [], C: [] },
            miniGames: [],
            playerStats: {},
            status: 'draft'
        };
        
        // Mark step 1 as completed
        completedSteps.add(1);
        
        // Load demo players
        loadDemoPlayers();
        goToStep(2);
        return;
    }
    
    showLoadingWithTimeout(true, 15000); // 15 second timeout
    
    try {
        console.log('Creating game day for date:', gameDate);
        
        // Test Firebase connection first
        if (!db) {
            throw new Error('Firebase database not initialized');
        }
        
        // Initialize game day structure
        currentGameDay = {
            date: gameDate,
            participants: [],
            teams: { A: [], B: [], C: [] },
            miniGames: [],
            playerStats: {},
            status: 'draft'
        };
        
        console.log('Saving game day to Firestore...');
        // Save to Firestore with timeout
        const gameDayRef = doc(db, 'gameDays', gameDate);
        await Promise.race([
            setDoc(gameDayRef, currentGameDay),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Firebase timeout')), 10000)
            )
        ]);
        
        console.log('Game day saved, loading players...');
        // Load players for selection
        await loadPlayers();
        
        // Mark step 1 as completed
        completedSteps.add(1);
        
        console.log('Moving to step 2');
        // Move to next step
        goToStep(2);
        
    } catch (error) {
        console.error('Error creating game day:', error);
        if (error.message.includes('timeout') || error.message.includes('network')) {
            alert('בעיית חיבור לאינטרנט - אנא בדוק את החיבור ונסה שוב');
        } else {
            alert('שגיאה ביצירת ערב המשחק: ' + error.message);
        }
    } finally {
        showLoadingWithTimeout(false);
    }
}

// Demo players for testing
function loadDemoPlayers() {
    console.log('Loading demo players...');
    allPlayers = [];
    
    // Create 25 demo players
    for (let i = 1; i <= 25; i++) {
        allPlayers.push({
            id: `demo-player-${i}`,
            name: `שחקן ${i}`,
            totalGoals: Math.floor(Math.random() * 20),
            totalAssists: Math.floor(Math.random() * 15),
            totalWins: Math.floor(Math.random() * 10)
        });
    }
    
    console.log(`Loaded ${allPlayers.length} demo players`);
    renderPlayersGrid();
}

// Step 2: Player Selection
async function loadPlayers() {
    try {
        console.log('Loading players from Firestore...');
        
        // Load players with timeout
        const playersSnapshot = await Promise.race([
            getDocs(collection(db, 'players')),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Players loading timeout')), 10000)
            )
        ]);
        
        allPlayers = [];
        playersSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.name) { // Only include players with names
                allPlayers.push({
                    id: doc.id,
                    ...data
                });
            }
        });
        
        console.log(`Loaded ${allPlayers.length} players`);
        renderPlayersGrid();
        
    } catch (error) {
        console.error('Error loading players:', error);
        if (error.message.includes('timeout')) {
            alert('בעיית חיבור - לא ניתן לטעון את רשימת השחקנים');
        } else {
            alert('שגיאה בטעינת רשימת השחקנים: ' + error.message);
        }
        
        // Show empty players grid as fallback
        allPlayers = [];
        renderPlayersGrid();
    }
}

function renderPlayersGrid() {
    const playersGrid = document.getElementById('players-grid');
    playersGrid.innerHTML = '';
    
    allPlayers.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        
        // Check if this player is already selected (for editing existing game days)
        const isSelected = selectedPlayers.includes(player.id);
        
        playerCard.innerHTML = `
            <input type="checkbox" id="player-${player.id}" value="${player.id}" ${isSelected ? 'checked' : ''}>
            <label for="player-${player.id}">${player.name}</label>
        `;
        
        // If player is selected, add the selected class to the card
        if (isSelected) {
            playerCard.classList.add('selected');
        }
        
        const checkbox = playerCard.querySelector('input');
        checkbox.addEventListener('change', updatePlayerSelection);
        
        // Make the entire card clickable
        playerCard.addEventListener('click', (e) => {
            // If clicking directly on checkbox, let it handle itself
            if (e.target.type === 'checkbox') {
                return;
            }
            
            // For any other click on the card, toggle the checkbox
            e.preventDefault();
            checkbox.checked = !checkbox.checked;
            // Trigger change event to update selection
            checkbox.dispatchEvent(new Event('change'));
        });
        
        playersGrid.appendChild(playerCard);
    });
    
    // Update the selection count display
    updatePlayerSelection();
}

function filterPlayers() {
    const searchTerm = document.getElementById('player-search').value.toLowerCase();
    const playerCards = document.querySelectorAll('.player-card');
    
    playerCards.forEach(card => {
        const playerName = card.querySelector('label').textContent.toLowerCase();
        card.style.display = playerName.includes(searchTerm) ? 'block' : 'none';
    });
}

function updatePlayerSelection() {
    const checkedBoxes = document.querySelectorAll('#players-grid input:checked');
    selectedPlayers = Array.from(checkedBoxes).map(cb => cb.value);
    
    // Update visual state of player cards
    const allPlayerCards = document.querySelectorAll('.player-card');
    allPlayerCards.forEach(card => {
        const checkbox = card.querySelector('input');
        if (checkbox.checked) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    document.getElementById('selected-count').textContent = `נבחרו: ${selectedPlayers.length}/21`;
    
    const confirmBtn = document.getElementById('confirm-players-btn');
    confirmBtn.disabled = selectedPlayers.length !== 21;
    
    // Skip validation if we're in edit mode - dynamic player management allows more than 21 players
    if (!isEditMode && selectedPlayers.length > 21) {
        alert('ניתן לבחור עד 21 שחקנים בלבד');
        const lastChecked = Array.from(checkedBoxes)[checkedBoxes.length - 1];
        lastChecked.checked = false;
        updatePlayerSelection();
    }
}

function confirmPlayerSelection() {
    if (selectedPlayers.length === 21) {
        currentGameDay.participants = selectedPlayers;
        initializePlayerStats();
        
        // Mark step 2 as completed
        completedSteps.add(2);
        
        goToStep(3);
        renderTeamAssignment();
    }
}

function skipToTeamAssignment() {
    // Clear any previously selected players
    selectedPlayers = [];
    
    // Initialize empty player stats
    initializePlayerStats();
    
    // Mark step 2 as completed (even though skipped)
    completedSteps.add(2);
    
    // Move to team assignment with empty teams
    goToStep(3);
    renderTeamAssignment();
    
    console.log('Skipped to team assignment - players can be added directly to teams');
}

function initializePlayerStats() {
    playerStats = {};
    selectedPlayers.forEach(playerId => {
        playerStats[playerId] = {
            goals: 0,
            assists: 0,
            wins: 0
        };
    });
}

// Step 3: Team Assignment
function renderTeamAssignment() {
    teams = { A: [], B: [], C: [] };
    
    const selectedPlayerData = allPlayers.filter(p => selectedPlayers.includes(p.id));
    
    // Remove any existing unassigned container
    const existingUnassigned = document.querySelector('.unassigned-players');
    if (existingUnassigned) {
        existingUnassigned.remove();
    }
    
    const unassignedContainer = document.createElement('div');
    unassignedContainer.className = 'unassigned-players';
    unassignedContainer.innerHTML = '<h3>שחקנים ללא קבוצה</h3><div class="unassigned-players-grid"></div>';
    
    const playersGrid = unassignedContainer.querySelector('.unassigned-players-grid');
    selectedPlayerData.forEach(player => {
        const playerElement = createDraggablePlayer(player, false, false); // NO remove buttons for unassigned players
        playersGrid.appendChild(playerElement);
    });
    
    const teamsContainer = document.querySelector('.teams-container');
    teamsContainer.parentNode.insertBefore(unassignedContainer, teamsContainer);
    
    // Add "add player" buttons to each team
    Object.keys(teams).forEach(teamLetter => {
        const teamContainer = document.getElementById(`team-${teamLetter}`);
        if (teamContainer) {
            teamContainer.innerHTML = ''; // Clear existing content
            
            // Add "add player" button since teams start empty
            const addPlayerBtn = document.createElement('button');
            addPlayerBtn.className = 'add-player-btn';
            addPlayerBtn.innerHTML = '+ הוסף שחקן';
            addPlayerBtn.onclick = () => openPlayerSelectionModal(teamLetter);
            teamContainer.appendChild(addPlayerBtn);
        }
    });
    
    setupDragAndDrop();
}

function renderTeamAssignmentForEditing() {
    // Clear existing team containers
    Object.keys(teams).forEach(teamLetter => {
        const teamContainer = document.getElementById(`team-${teamLetter}`);
        if (teamContainer) {
            teamContainer.innerHTML = '';
        }
    });
    
    // Remove any existing unassigned container
    const existingUnassigned = document.querySelector('.unassigned-players');
    if (existingUnassigned) {
        existingUnassigned.remove();
    }
    
    // Create unassigned container
    const unassignedContainer = document.createElement('div');
    unassignedContainer.className = 'unassigned-players';
    unassignedContainer.innerHTML = '<h3>שחקנים ללא קבוצה</h3><div class="unassigned-players-grid"></div>';
    
    const teamsContainer = document.querySelector('.teams-container');
    teamsContainer.parentNode.insertBefore(unassignedContainer, teamsContainer);
    
    // Get all selected players
    const selectedPlayerData = allPlayers.filter(p => selectedPlayers.includes(p.id));
    
    // Render players in their assigned teams
    Object.keys(teams).forEach(teamLetter => {
        const teamContainer = document.getElementById(`team-${teamLetter}`);
        
        teams[teamLetter].forEach((playerId, index) => {
            const player = allPlayers.find(p => p.id === playerId);
            if (player) {
                const playerElement = createDraggablePlayer(player, index === 0, true); // First player is captain, show remove button
                teamContainer.appendChild(playerElement);
            }
        });
        
        // Add "add player" button if team has less than 7 players and we're in edit mode
        if (teams[teamLetter].length < 7 && isEditMode) {
            const addPlayerBtn = document.createElement('button');
            addPlayerBtn.className = 'add-player-btn';
            addPlayerBtn.innerHTML = '+ הוסף שחקן';
            addPlayerBtn.onclick = () => openPlayerSelectionModal(teamLetter);
            teamContainer.appendChild(addPlayerBtn);
        }
        
        // Update team header with captain name
        updateTeamHeader(teamLetter);
    });
    
    // Add any unassigned players to the unassigned container
    const assignedPlayerIds = [].concat(...Object.values(teams));
    const unassignedPlayers = selectedPlayerData.filter(p => !assignedPlayerIds.includes(p.id));
    
    const playersGrid = unassignedContainer.querySelector('.unassigned-players-grid');
    unassignedPlayers.forEach(player => {
        const playerElement = createDraggablePlayer(player, false, false); // NO remove buttons for unassigned players
        playersGrid.appendChild(playerElement);
    });
    
    // Update team counts
    updateTeamCounts();
    
    // Hide auto-assign button in edit mode
    const autoAssignBtn = document.getElementById('auto-assign-btn');
    if (autoAssignBtn) {
        autoAssignBtn.style.display = isEditMode ? 'none' : 'block';
    }
    
    // Setup drag and drop functionality
    setupDragAndDrop();
}

// Player management functions
function removePlayerFromTeam(playerId) {
    if (!confirm('האם אתה בטוח שברצונך להסיר את השחקן מהקבוצה?')) {
        return;
    }
    
    // Find which team the player is in and remove them
    Object.keys(teams).forEach(teamLetter => {
        const playerIndex = teams[teamLetter].indexOf(playerId);
        if (playerIndex !== -1) {
            teams[teamLetter].splice(playerIndex, 1);
            
            // Only remove from selectedPlayers if in edit mode
            // In new game creation, we want to keep them in the unassigned area
            if (isEditMode) {
                const selectedIndex = selectedPlayers.indexOf(playerId);
                if (selectedIndex !== -1) {
                    selectedPlayers.splice(selectedIndex, 1);
                    
                    // Remove player stats when completely removing from game
                    if (playerStats[playerId]) {
                        delete playerStats[playerId];
                        console.log(`Removed stats for player: ${playerId}`);
                    }
                }
            }
        }
    });
    
    // Update current game day participants
    if (currentGameDay) {
        currentGameDay.participants = selectedPlayers;
        currentGameDay.teams = teams;
    }
    
    // Re-render the team assignment based on current mode
    if (isEditMode) {
        renderTeamAssignmentForEditing();
    } else {
        renderTeamsAfterAssignment();
    }
    updateTeamCounts();
    
    // Update stats display to reflect the removal
    updateStatsDisplay();
    
    // Update all existing mini-games scorers sections to remove the player
    miniGames.forEach(miniGame => {
        if (miniGame.teamA && miniGame.teamB) {
            updateScorersSection(miniGame.id);
        }
    });
}

async function openPlayerSelectionModal(teamLetter) {
    // Load all players if not already loaded
    if (allPlayers.length === 0) {
        if (DEMO_MODE) {
            loadDemoPlayers();
        } else {
            await loadPlayers();
        }
    }
    
    // Get players that are not already assigned to any team
    const assignedPlayerIds = [].concat(...Object.values(teams));
    const availablePlayers = allPlayers.filter(player => !assignedPlayerIds.includes(player.id));
    
    if (availablePlayers.length === 0) {
        alert('אין שחקנים זמינים להוספה');
        return;
    }
    
    // Create modal HTML
    const modalHTML = `
        <div class="player-modal-overlay" id="player-modal-overlay">
            <div class="player-modal">
                <h3>בחר שחקן לקבוצה ${teamLetter}</h3>
                <input type="text" id="modal-search" class="modal-search" placeholder="חפש שחקן...">
                <div class="modal-players-list" id="modal-players-list">
                    ${availablePlayers.map(player => `
                        <div class="modal-player-item" data-player-id="${player.id}">
                            ${player.name}
                        </div>
                    `).join('')}
                </div>
                <div class="modal-actions">
                    <button class="modal-cancel-btn" onclick="closePlayerModal()">ביטול</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    setupPlayerModalEventListeners(teamLetter);
}

function setupPlayerModalEventListeners(teamLetter) {
    // Search functionality
    const searchInput = document.getElementById('modal-search');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const playerItems = document.querySelectorAll('.modal-player-item');
        playerItems.forEach(item => {
            const playerName = item.textContent.toLowerCase();
            item.style.display = playerName.includes(searchTerm) ? 'block' : 'none';
        });
    });
    
    // Player selection
    const playerItems = document.querySelectorAll('.modal-player-item');
    playerItems.forEach(item => {
        item.addEventListener('click', () => {
            const playerId = item.dataset.playerId;
            addPlayerToTeam(playerId, teamLetter);
            closePlayerModal();
        });
    });
    
    // Close modal when clicking overlay
    const overlay = document.getElementById('player-modal-overlay');
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closePlayerModal();
        }
    });
}

function addPlayerToTeam(playerId, teamLetter) {
    // Add player to team
    teams[teamLetter].push(playerId);
    
    // Add to selectedPlayers if not already there
    if (!selectedPlayers.includes(playerId)) {
        selectedPlayers.push(playerId);
    }
    
    // Initialize player stats if not already there
    if (!playerStats[playerId]) {
        playerStats[playerId] = {
            goals: 0,
            assists: 0,
            wins: 0
        };
        console.log(`Initialized stats for new player: ${playerId}`);
    }
    
    // Update current game day participants
    if (currentGameDay) {
        currentGameDay.participants = selectedPlayers;
        currentGameDay.teams = teams;
    }
    
    // Re-render the team assignment based on current mode
    if (isEditMode) {
        renderTeamAssignmentForEditing();
    } else {
        renderTeamsAfterAssignment();
    }
    updateTeamCounts();
    
    // Update stats display to show the new player
    updateStatsDisplay();
    
    // Update all existing mini-games scorers sections to include the new player
    miniGames.forEach(miniGame => {
        if (miniGame.teamA && miniGame.teamB) {
            updateScorersSection(miniGame.id);
        }
    });
}

function closePlayerModal() {
    const modal = document.getElementById('player-modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function showEditModeIndicator() {
    // Remove any existing indicator
    hideEditModeIndicator();
    
    // Create indicator
    const indicator = document.createElement('div');
    indicator.id = 'edit-mode-indicator';
    
    // Check if we're in a live game vs regular edit mode
    const isLiveGame = window.currentLiveGame && !isEditingUpcomingGame;
    
    if (isLiveGame) {
        // Live game indicator
        indicator.style.cssText = `
            background: #27ae60;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            margin-bottom: 15px;
            text-align: center;
            font-weight: bold;
            border: 2px solid #229954;
        `;
        indicator.innerHTML = '🔴 משחק חי - ניהול בזמן אמת';
    } else {
        // Regular edit mode indicator
        indicator.style.cssText = `
            background: #e67e22;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            margin-bottom: 15px;
            text-align: center;
            font-weight: bold;
            border: 2px solid #d35400;
        `;
        indicator.innerHTML = '✏️ מצב עריכה - ניתן לנהל שחקנים ומשחקים מכאן';
    }
    
    // Add to current step
    const currentStepElement = document.querySelector('.admin-step.active');
    if (currentStepElement) {
        const firstChild = currentStepElement.firstElementChild;
        currentStepElement.insertBefore(indicator, firstChild.nextSibling);
    }
}

function hideEditModeIndicator() {
    const indicator = document.getElementById('edit-mode-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function showViewOnlyIndicator() {
    // Remove any existing indicator
    hideEditModeIndicator();
    
    // Create view-only indicator
    const indicator = document.createElement('div');
    indicator.id = 'edit-mode-indicator'; // Reuse the same ID for consistency
    indicator.style.cssText = `
        background: #34495e;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        margin-bottom: 15px;
        text-align: center;
        font-weight: bold;
        border: 2px solid #2c3e50;
    `;
    indicator.innerHTML = '👁️ מצב צפייה - כל השדות מוגבלים לקריאה בלבד';
    
    // Add to current step
    const currentStepElement = document.querySelector('.admin-step.active');
    if (currentStepElement) {
        const firstChild = currentStepElement.firstElementChild;
        currentStepElement.insertBefore(indicator, firstChild.nextSibling);
    }
}

// Make functions globally available
window.removePlayerFromTeam = removePlayerFromTeam;
window.openPlayerSelectionModal = openPlayerSelectionModal;
window.closePlayerModal = closePlayerModal;

function createDraggablePlayer(player, isCaptain = false, showRemoveButton = false) {
    const playerElement = document.createElement('div');
    playerElement.className = 'draggable-player';
    if (isCaptain) {
        playerElement.classList.add('captain');
    }
    playerElement.draggable = true;
    playerElement.dataset.playerId = player.id;
    
    const playerNameSpan = document.createElement('span');
    playerNameSpan.className = 'player-name-text';
    playerNameSpan.textContent = isCaptain ? `👑 ${player.name}` : player.name;
    
    playerElement.appendChild(playerNameSpan);
    
    // Add remove button if requested
    if (showRemoveButton) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-player-btn';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'הסר שחקן';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removePlayerFromTeam(player.id);
        };
        playerElement.appendChild(removeBtn);
    }
    
    playerElement.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', player.id);
    });
    
    // Add right-click context menu for captain selection
    playerElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showCaptainContextMenu(e, player.id);
    });
    
    return playerElement;
}

// Context menu for captain selection
function showCaptainContextMenu(event, playerId) {
    // Remove any existing context menu
    const existingMenu = document.querySelector('.captain-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Check if player is already captain
    const player = allPlayers.find(p => p.id === playerId);
    const playerTeam = findPlayerTeam(playerId);
    
    if (!playerTeam) return; // Player not in any team
    
    const isCaptain = teams[playerTeam][0] === playerId;
    
    // Create context menu
    const contextMenu = document.createElement('div');
    contextMenu.className = 'captain-context-menu';
    contextMenu.style.cssText = `
        position: fixed;
        top: ${event.clientY}px;
        left: ${event.clientX}px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        min-width: 120px;
        padding: 8px 0;
        font-family: inherit;
    `;
    
    // Create menu option
    const menuOption = document.createElement('div');
    menuOption.className = 'context-menu-option';
    menuOption.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        color: ${isCaptain ? '#666' : '#333'};
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    
    if (isCaptain) {
        menuOption.innerHTML = `
            <span>👑</span>
            <span>${player.name} כבר קפטן</span>
        `;
        menuOption.style.cursor = 'default';
    } else {
        menuOption.innerHTML = `
            <span>👑</span>
            <span>עשה קפטן</span>
        `;
        
        menuOption.addEventListener('mouseenter', () => {
            menuOption.style.backgroundColor = '#f0f0f0';
        });
        
        menuOption.addEventListener('mouseleave', () => {
            menuOption.style.backgroundColor = 'transparent';
        });
        
        menuOption.addEventListener('click', () => {
            makeCaptain(playerId, playerTeam);
            contextMenu.remove();
        });
    }
    
    contextMenu.appendChild(menuOption);
    document.body.appendChild(contextMenu);
    
    // Close menu when clicking outside
    const closeMenu = (e) => {
        if (!contextMenu.contains(e.target)) {
            contextMenu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 10);
}

function findPlayerTeam(playerId) {
    for (const [teamLetter, playerIds] of Object.entries(teams)) {
        if (playerIds.includes(playerId)) {
            return teamLetter;
        }
    }
    return null;
}

function makeCaptain(playerId, teamLetter) {
    const teamPlayers = teams[teamLetter];
    const playerIndex = teamPlayers.indexOf(playerId);
    
    if (playerIndex === -1) return; // Player not in team
    
    // Remove player from current position and add to beginning
    teamPlayers.splice(playerIndex, 1);
    teamPlayers.unshift(playerId);
    
    // Update the visual representation
    const teamContainer = document.getElementById(`team-${teamLetter}`);
    const playerElements = Array.from(teamContainer.querySelectorAll('.draggable-player'));
    
    // Clear container
    teamContainer.innerHTML = '';
    
    // Re-add players with new captain first
    teamPlayers.forEach((pid, index) => {
        const player = allPlayers.find(p => p.id === pid);
        const playerElement = createDraggablePlayer(player, index === 0, true); // Always show remove buttons for team players
        teamContainer.appendChild(playerElement);
    });
    
    // Add "add player" button if team has less than 7 players
    if (teamPlayers.length < 7) {
        const addPlayerBtn = document.createElement('button');
        addPlayerBtn.className = 'add-player-btn';
        addPlayerBtn.innerHTML = '+ הוסף שחקן';
        addPlayerBtn.onclick = () => openPlayerSelectionModal(teamLetter);
        teamContainer.appendChild(addPlayerBtn);
    }
    
    // Update team header
    updateTeamHeader(teamLetter);
    
    console.log(`Made ${allPlayers.find(p => p.id === playerId).name} captain of team ${teamLetter}`);
}

function setupDragAndDrop() {
    const dropZones = document.querySelectorAll('.team-players, .unassigned-players, .unassigned-players-grid');
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            const playerId = e.dataTransfer.getData('text/plain');
            const playerElement = document.querySelector(`[data-player-id="${playerId}"]`);
            
            if (zone.classList.contains('team-players')) {
                const teamLetter = zone.id.split('-')[1];
                if (teams[teamLetter].length < 7) {
                    zone.appendChild(playerElement);
                    updateTeamAssignments();
                }
            } else if (zone.classList.contains('unassigned-players') || zone.classList.contains('unassigned-players-grid')) {
                // If dropping on unassigned-players container, find the grid or use the container
                const targetContainer = zone.classList.contains('unassigned-players-grid') ? zone : zone.querySelector('.unassigned-players-grid') || zone;
                targetContainer.appendChild(playerElement);
                updateTeamAssignments();
            }
        });
    });
}

function autoAssignTeams() {
    teams = { A: [], B: [], C: [] };
    
    const shuffledPlayers = [...selectedPlayers].sort(() => Math.random() - 0.5);
    
    shuffledPlayers.forEach((playerId, index) => {
        const teamLetter = ['A', 'B', 'C'][index % 3];
        teams[teamLetter].push(playerId);
    });
    
    renderTeamsAfterAssignment();
    updateTeamCounts();
}

function renderTeamsAfterAssignment() {
    Object.keys(teams).forEach(teamLetter => {
        const teamContainer = document.getElementById(`team-${teamLetter}`);
        teamContainer.innerHTML = '';
        
        teams[teamLetter].forEach((playerId, index) => {
            const player = allPlayers.find(p => p.id === playerId);
            const playerElement = createDraggablePlayer(player, index === 0, true); // First player is captain, enable remove buttons
            teamContainer.appendChild(playerElement);
        });
        
        // Add "add player" button if team has less than 7 players
        if (teams[teamLetter].length < 7) {
            const addPlayerBtn = document.createElement('button');
            addPlayerBtn.className = 'add-player-btn';
            addPlayerBtn.innerHTML = '+ הוסף שחקן';
            addPlayerBtn.onclick = () => openPlayerSelectionModal(teamLetter);
            teamContainer.appendChild(addPlayerBtn);
        }
        
        // Update team header with captain name
        updateTeamHeader(teamLetter);
    });
    
    // Update unassigned players WITHOUT remove buttons
    const unassignedContainer = document.querySelector('.unassigned-players');
    if (unassignedContainer) {
        // Get currently assigned player IDs
        const assignedPlayerIds = [].concat(...Object.values(teams));
        const unassignedPlayerIds = selectedPlayers.filter(id => !assignedPlayerIds.includes(id));
        
        // Clear and re-render unassigned players
        const playersToMove = unassignedContainer.querySelectorAll('.draggable-player');
        playersToMove.forEach(player => player.remove());
        
        const playersGrid = unassignedContainer.querySelector('.unassigned-players-grid') || unassignedContainer;
        unassignedPlayerIds.forEach(playerId => {
            const player = allPlayers.find(p => p.id === playerId);
            if (player) {
                const playerElement = createDraggablePlayer(player, false, false); // NO remove buttons for unassigned players
                playersGrid.appendChild(playerElement);
            }
        });
    }
}

function updateTeamHeader(teamLetter) {
    const teamHeader = document.querySelector(`[data-team="${teamLetter}"] h3`);
    if (teams[teamLetter].length > 0) {
        const captainId = teams[teamLetter][0];
        const captain = allPlayers.find(p => p.id === captainId);
        teamHeader.innerHTML = `קבוצת ${captain.name} <span class="captain-icon">👑</span>`;
    } else {
        teamHeader.innerHTML = `קבוצה ${teamLetter}`;
    }
}

function updateTeamAssignments() {
    teams = { A: [], B: [], C: [] };
    
    Object.keys(teams).forEach(teamLetter => {
        const teamContainer = document.getElementById(`team-${teamLetter}`);
        const playersInTeam = teamContainer.querySelectorAll('.draggable-player');
        teams[teamLetter] = Array.from(playersInTeam).map(p => p.dataset.playerId);
        
        // Update captain styling and team header
        playersInTeam.forEach((playerEl, index) => {
            const playerId = playerEl.dataset.playerId;
            const player = allPlayers.find(p => p.id === playerId);
            const playerNameSpan = playerEl.querySelector('.player-name-text');
            
            if (index === 0) {
                playerEl.classList.add('captain');
                if (playerNameSpan) {
                    playerNameSpan.textContent = `👑 ${player.name}`;
                }
            } else {
                playerEl.classList.remove('captain');
                if (playerNameSpan) {
                    playerNameSpan.textContent = player.name;
                }
            }
        });
        
        // Update team header
        updateTeamHeader(teamLetter);
    });
    
    // Update selectedPlayers to match current team assignments
    const currentGamePlayers = [].concat(...Object.values(teams));
    
    // Add any new players to selectedPlayers and initialize their stats
    currentGamePlayers.forEach(playerId => {
        if (!selectedPlayers.includes(playerId)) {
            selectedPlayers.push(playerId);
        }
        if (!playerStats[playerId]) {
            playerStats[playerId] = {
                goals: 0,
                assists: 0,
                wins: 0
            };
        }
    });
    
    // Update current game day participants
    if (currentGameDay) {
        currentGameDay.participants = selectedPlayers;
        currentGameDay.teams = teams;
    }
    
    updateTeamCounts();
    
    // Update stats display to reflect any changes
    updateStatsDisplay();
    
    // Update all existing mini-games scorers sections to include new players
    miniGames.forEach(miniGame => {
        if (miniGame.teamA && miniGame.teamB) {
            updateScorersSection(miniGame.id);
        }
    });
}

function updateTeamCounts() {
    Object.keys(teams).forEach(teamLetter => {
        const countElement = document.querySelector(`[data-team="${teamLetter}"] .team-count`);
        countElement.textContent = `${teams[teamLetter].length}/7`;
        
        // Update "add player" button visibility
        const teamContainer = document.getElementById(`team-${teamLetter}`);
        const addPlayerBtn = teamContainer.querySelector('.add-player-btn');
        
        if (teams[teamLetter].length >= 7) {
            // Hide add button if team is full
            if (addPlayerBtn) {
                addPlayerBtn.style.display = 'none';
            }
        } else {
            // Show add button if team is not full
            if (addPlayerBtn) {
                addPlayerBtn.style.display = 'block';
            } else {
                // Create add button if it doesn't exist
                const newAddPlayerBtn = document.createElement('button');
                newAddPlayerBtn.className = 'add-player-btn';
                newAddPlayerBtn.innerHTML = '+ הוסף שחקן';
                newAddPlayerBtn.onclick = () => openPlayerSelectionModal(teamLetter);
                teamContainer.appendChild(newAddPlayerBtn);
            }
        }
    });
    
    const allTeamsValid = Object.values(teams).every(team => team.length === 7);
    document.getElementById('confirm-teams-btn').disabled = !allTeamsValid;
}

async function confirmTeamAssignment() {
    if (teams.A.length === 0 || teams.B.length === 0 || teams.C.length === 0) {
        alert('יש להקצות שחקנים לכל הקבוצות');
        return;
    }
    
    // Complete the game day creation and save it
    await finalizeGameDayCreation();
}

// Complete game day creation after team assignment
async function finalizeGameDayCreation() {
    try {
        showLoadingWithTimeout(true, 15000);
        
        // Update game day with teams
        currentGameDay.teams = teams;
        currentGameDay.participants = selectedPlayers;
        currentGameDay.status = 'ready'; // Ready for live games
        
        if (DEMO_MODE) {
            console.log('Demo mode: Game day created successfully');
            alert('ערב המשחק נוצר בהצלחה! \nכעת תוכל לנהל את המשחקים בזמן אמת');
            goToStep(1); // Return to main admin page
            return;
        }
        
        // Save to Firestore
        const gameDayRef = doc(db, 'gameDays', currentGameDay.date);
        await setDoc(gameDayRef, currentGameDay);
        
        console.log('Game day created successfully');
        alert('ערב המשחק נוצר בהצלחה! \nכעת תוכל לנהל את המשחקים בזמן אמת');
        
        // Mark step 3 as completed
        completedSteps.add(3);
        
        // Return to main admin page
        goToStep(1);
        
        // Refresh the main page to show live games
        await checkForLiveGames();
        
    } catch (error) {
        console.error('Error creating game day:', error);
        alert('שגיאה ביצירת ערב המשחק: ' + error.message);
    } finally {
        showLoadingWithTimeout(false);
    }
}

// Helper function to generate team options with captain names
function generateTeamOptions(excludeTeam = null) {
    let options = '';
    Object.keys(teams).forEach(teamLetter => {
        if (teamLetter !== excludeTeam && teams[teamLetter].length > 0) {
            const captainId = teams[teamLetter][0];
            const captain = allPlayers.find(p => p.id === captainId);
            options += `<option value="${teamLetter}">קבוצת ${captain.name} 👑</option>`;
        } else if (teamLetter !== excludeTeam) {
            options += `<option value="${teamLetter}">קבוצה ${teamLetter}</option>`;
        }
    });
    return options;
}

// Helper function to get team display name with captain
function getTeamDisplayName(teamLetter) {
    if (teams[teamLetter] && teams[teamLetter].length > 0) {
        const captainId = teams[teamLetter][0];
        const captain = allPlayers.find(p => p.id === captainId);
        return `קבוצת ${captain.name} 👑`;
    }
    return `קבוצה ${teamLetter}`;
}

// Step 4: Mini-Games Management
function addMiniGame() {
    const miniGameId = `game-${Date.now()}`;
    
    // First, ensure existing games have their numbers assigned if they don't have them
    miniGames.forEach((game, index) => {
        if (!game.gameNumber) {
            game.gameNumber = index + 1;
        }
    });
    
    // Calculate the next game number (highest existing number + 1)
    const maxGameNumber = miniGames.length > 0 ? Math.max(...miniGames.map(g => g.gameNumber || 0)) : 0;
    const gameNumber = maxGameNumber + 1;
    
    const miniGame = {
        id: miniGameId,
        gameNumber: gameNumber, // Store the game number
        teamA: '',
        teamB: '',
        scoreA: 0,
        scoreB: 0,
        scorers: [],
        winner: null
    };
    
    // Add new game at the beginning of the array (top of the list)
    miniGames.unshift(miniGame);
    
    // Re-render all games to update numbering
    renderAllMiniGames();
    
    // Update stats display (even though game is empty, it ensures the display is ready)
    updateStatsDisplay();
}

function renderAllMiniGames() {
    const miniGamesList = document.getElementById('mini-games-list');
    miniGamesList.innerHTML = '';
    
    miniGames.forEach((miniGame) => {
        renderMiniGame(miniGame, miniGame.gameNumber);
    });
}

function renderMiniGame(miniGame, gameNumber = null) {
    const miniGamesList = document.getElementById('mini-games-list');
    
    // Use stored game number or calculate if not provided (for backward compatibility)
    if (gameNumber === null) {
        gameNumber = miniGame.gameNumber || (miniGames.findIndex(g => g.id === miniGame.id) + 1);
    }
    
    const miniGameElement = document.createElement('div');
    miniGameElement.className = 'mini-game';
    miniGameElement.dataset.gameId = miniGame.id;
    
    // Default state is expanded for all games
    const hasContent = miniGame.teamA && miniGame.teamB && (miniGame.scoreA > 0 || miniGame.scoreB > 0);
    const isCollapsed = false; // All games start expanded by default
    
    miniGameElement.innerHTML = `
        <div class="mini-game-header">
            <div class="game-header-left">
                <button class="collapse-btn" onclick="toggleGameCollapse('${miniGame.id}')" title="${isCollapsed ? 'הרחב משחק' : 'כווץ משחק'}">
                    <span class="collapse-icon">${isCollapsed ? '▼' : '▲'}</span>
                </button>
                <h4>משחק ${gameNumber}</h4>
                ${hasContent ? `<span class="game-summary">${getTeamDisplayName(miniGame.teamA)} ${miniGame.scoreA}-${miniGame.scoreB} ${getTeamDisplayName(miniGame.teamB)}</span>` : ''}
            </div>
            <button class="remove-game-btn" onclick="removeMiniGame('${miniGame.id}')">הסר</button>
        </div>
        
        <div class="game-content" ${isCollapsed ? 'style="display: none;"' : ''}>
            <div class="game-setup">
                <div class="team-selection">
                    <label>קבוצה 1:</label>
                    <select class="team-select" data-team="A">
                        <option value="">בחר קבוצה</option>
                        ${generateTeamOptions()}
                    </select>
                </div>
                
                <div class="vs">נגד</div>
                
                <div class="team-selection">
                    <label>קבוצה 2:</label>
                    <select class="team-select" data-team="B">
                        <option value="">בחר קבוצה</option>
                        ${generateTeamOptions()}
                    </select>
                </div>
            </div>
            
            <div class="score-section">
                <div class="score-input">
                    <label>תוצאה קבוצה 1:</label>
                    <input type="number" min="0" class="score-input-field" data-team="A" value="0">
                </div>
                
                <div class="score-input">
                    <label>תוצאה קבוצה 2:</label>
                    <input type="number" min="0" class="score-input-field" data-team="B" value="0">
                </div>
            </div>
            
            <div class="scorers-section">
                <h5>מבקיעים ומבשלים:</h5>
                <div class="scorers-grid" id="scorers-${miniGame.id}">
                    <!-- Scorers will be added here -->
                </div>
            </div>
        </div>
    `;
    
    miniGamesList.appendChild(miniGameElement);
    
    // Set existing values if this is an existing game
    if (miniGame.teamA) {
        const teamASelect = miniGameElement.querySelector('[data-team="A"]');
        teamASelect.value = miniGame.teamA;
    }
    if (miniGame.teamB) {
        const teamBSelect = miniGameElement.querySelector('[data-team="B"]');
        teamBSelect.value = miniGame.teamB;
        // Update second dropdown options after setting first team
        updateSecondTeamOptions(miniGame.id);
    }
    if (miniGame.scoreA !== undefined) {
        const scoreAInput = miniGameElement.querySelector('[data-team="A"].score-input-field');
        scoreAInput.value = miniGame.scoreA;
    }
    if (miniGame.scoreB !== undefined) {
        const scoreBInput = miniGameElement.querySelector('[data-team="B"].score-input-field');
        scoreBInput.value = miniGame.scoreB;
    }
    
    const teamSelects = miniGameElement.querySelectorAll('.team-select');
    teamSelects.forEach((select, index) => {
        if (index === 0) {
            // First dropdown - update both team selection and second dropdown options
            select.addEventListener('change', () => {
                updateTeamSelection(miniGame.id);
                updateSecondTeamOptions(miniGame.id);
            });
        } else {
            // Second dropdown - only update team selection
            select.addEventListener('change', () => updateTeamSelection(miniGame.id));
        }
    });
    
    const scoreInputs = miniGameElement.querySelectorAll('.score-input-field');
    scoreInputs.forEach(input => {
        input.addEventListener('input', () => updateScore(miniGame.id));
    });
    
    // Update scorers section if teams are already selected
    if (miniGame.teamA && miniGame.teamB) {
        updateScorersSection(miniGame.id);
        
        // Restore existing scorer data
        if (miniGame.scorers && miniGame.scorers.length > 0) {
            setTimeout(() => {
                miniGame.scorers.forEach(scorer => {
                    const goalsInput = miniGameElement.querySelector(`.goals-input[data-player-id="${scorer.playerId}"]`);
                    const assistsInput = miniGameElement.querySelector(`.assists-input[data-player-id="${scorer.playerId}"]`);
                    if (goalsInput) goalsInput.value = scorer.goals;
                    if (assistsInput) assistsInput.value = scorer.assists;
                });
            }, 100);
        }
    }
}

function updateTeamSelection(gameId) {
    try {
        const gameElement = document.querySelector(`[data-game-id="${gameId}"]`);
        if (!gameElement) {
            console.error('Game element not found for ID:', gameId);
            return;
        }
        
        const teamSelects = gameElement.querySelectorAll('.team-select');
        const miniGame = miniGames.find(g => g.id === gameId);
        
        if (!miniGame) {
            console.error('Mini game not found for ID:', gameId);
            return;
        }
        
        miniGame.teamA = teamSelects[0].value;
        miniGame.teamB = teamSelects[1].value;
        
        updateScorersSection(gameId);
        
    } catch (error) {
        console.error('Error updating team selection:', error);
    }
}

function updateSecondTeamOptions(gameId) {
    try {
        const gameElement = document.querySelector(`[data-game-id="${gameId}"]`);
        if (!gameElement) {
            console.error('Game element not found for ID:', gameId);
            return;
        }
        
        const teamSelects = gameElement.querySelectorAll('.team-select');
        if (teamSelects.length < 2) {
            console.error('Team select elements not found');
            return;
        }
        
        const firstTeamSelect = teamSelects[0];
        const secondTeamSelect = teamSelects[1];
        
        const selectedTeamA = firstTeamSelect.value;
        const currentTeamB = secondTeamSelect.value;
        
        // Clear second dropdown
        secondTeamSelect.innerHTML = '<option value="">בחר קבוצה</option>';
        
        // Add only the teams that are not selected in the first dropdown
        Object.keys(teams).forEach(teamLetter => {
            if (teamLetter !== selectedTeamA && teams[teamLetter] && teams[teamLetter].length > 0) {
                const option = document.createElement('option');
                option.value = teamLetter;
                option.textContent = getTeamDisplayName(teamLetter);
                
                // Keep the previously selected team if it's still valid
                if (teamLetter === currentTeamB) {
                    option.selected = true;
                }
                
                secondTeamSelect.appendChild(option);
            }
        });
        
        // Update the miniGame data
        const miniGame = miniGames.find(g => g.id === gameId);
        if (miniGame) {
            miniGame.teamB = secondTeamSelect.value;
        }
        
    } catch (error) {
        console.error('Error updating second team options:', error);
    }
}

function updateScore(gameId) {
    const gameElement = document.querySelector(`[data-game-id="${gameId}"]`);
    const scoreInputs = gameElement.querySelectorAll('.score-input-field');
    const miniGame = miniGames.find(g => g.id === gameId);
    
    miniGame.scoreA = parseInt(scoreInputs[0].value) || 0;
    miniGame.scoreB = parseInt(scoreInputs[1].value) || 0;
    
    if (miniGame.scoreA > miniGame.scoreB) {
        miniGame.winner = miniGame.teamA;
    } else if (miniGame.scoreB > miniGame.scoreA) {
        miniGame.winner = miniGame.teamB;
    } else {
        miniGame.winner = null;
    }
    
    recalculatePlayerStats();
    updateStatsDisplay();
    
    // Auto-save when score is updated
    autoSaveLiveGame();
    
    // Check if this game is complete and show visual feedback
    if (miniGame.teamA && miniGame.teamB && (miniGame.scoreA > 0 || miniGame.scoreB > 0)) {
        showGameSavedFeedback(gameId);
    }
}

function updateScorersSection(gameId) {
    try {
        const miniGame = miniGames.find(g => g.id === gameId);
        if (!miniGame) {
            console.error('Mini game not found for ID:', gameId);
            return;
        }
        
        const scorersContainer = document.getElementById(`scorers-${gameId}`);
        if (!scorersContainer) {
            console.error('Scorers container not found for ID:', gameId);
            return;
        }
        
        if (!miniGame.teamA || !miniGame.teamB) {
            scorersContainer.innerHTML = '<p>בחר קבוצות כדי להוסיף מבקיעים</p>';
            return;
        }
        
        const teamAPlayers = teams[miniGame.teamA] || [];
        const teamBPlayers = teams[miniGame.teamB] || [];
    
    scorersContainer.innerHTML = `
        <div class="player-search-container">
            <input type="text" id="player-search-${gameId}" placeholder="חפש שחקן..." class="player-search-input">
        </div>
        <div class="teams-container">
            <div class="team-section">
                <h6 class="team-header team-a-header">${getTeamDisplayName(miniGame.teamA)}</h6>
                <div class="team-players" id="team-a-players-${gameId}"></div>
            </div>
            <div class="team-section">
                <h6 class="team-header team-b-header">${getTeamDisplayName(miniGame.teamB)}</h6>
                <div class="team-players" id="team-b-players-${gameId}"></div>
            </div>
        </div>
    `;
    
    // Render Team A players
    const teamAContainer = document.getElementById(`team-a-players-${gameId}`);
    teamAPlayers.forEach(playerId => {
        const player = allPlayers.find(p => p.id === playerId);
        if (player) {
            const playerScorer = createPlayerScorerElement(player, playerId, gameId, 'A');
            
            // Restore existing scorer data if it exists
            const existingScorer = miniGame.scorers.find(s => s.playerId === playerId);
            if (existingScorer) {
                const goalsInput = playerScorer.querySelector('.goals-input');
                const assistsInput = playerScorer.querySelector('.assists-input');
                goalsInput.value = existingScorer.goals || 0;
                assistsInput.value = existingScorer.assists || 0;
            }
            
            teamAContainer.appendChild(playerScorer);
        }
    });
    
    // Render Team B players
    const teamBContainer = document.getElementById(`team-b-players-${gameId}`);
    teamBPlayers.forEach(playerId => {
        const player = allPlayers.find(p => p.id === playerId);
        if (player) {
            const playerScorer = createPlayerScorerElement(player, playerId, gameId, 'B');
            
            // Restore existing scorer data if it exists
            const existingScorer = miniGame.scorers.find(s => s.playerId === playerId);
            if (existingScorer) {
                const goalsInput = playerScorer.querySelector('.goals-input');
                const assistsInput = playerScorer.querySelector('.assists-input');
                goalsInput.value = existingScorer.goals || 0;
                assistsInput.value = existingScorer.assists || 0;
            }
            
            teamBContainer.appendChild(playerScorer);
        }
    });
    
        // Add search functionality
        const searchInput = document.getElementById(`player-search-${gameId}`);
        searchInput.addEventListener('input', () => filterPlayersInGame(gameId));
        
    } catch (error) {
        console.error('Error updating scorers section:', error);
        const scorersContainer = document.getElementById(`scorers-${gameId}`);
        if (scorersContainer) {
            scorersContainer.innerHTML = '<p>שגיאה בטעינת השחקנים</p>';
        }
    }
}

function createPlayerScorerElement(player, playerId, gameId, team) {
    const playerScorer = document.createElement('div');
    playerScorer.className = `player-scorer team-${team.toLowerCase()}`;
    playerScorer.dataset.playerName = player.name.toLowerCase();
    
    playerScorer.innerHTML = `
        <div class="player-info">
            <span class="player-name">${player.name}</span>
        </div>
        <div class="scorer-inputs">
            <div class="input-group">
                <label>גולים:</label>
                <input type="number" min="0" value="0" class="goals-input" data-player-id="${playerId}">
            </div>
            <div class="input-group">
                <label>בישולים:</label>
                <input type="number" min="0" value="0" class="assists-input" data-player-id="${playerId}">
            </div>
        </div>
    `;
    
    const goalsInput = playerScorer.querySelector('.goals-input');
    const assistsInput = playerScorer.querySelector('.assists-input');
    
    goalsInput.addEventListener('input', () => updatePlayerGameStats(gameId, playerId));
    assistsInput.addEventListener('input', () => updatePlayerGameStats(gameId, playerId));
    
    return playerScorer;
}

function filterPlayersInGame(gameId) {
    const searchTerm = document.getElementById(`player-search-${gameId}`).value.toLowerCase();
    const playerScorers = document.querySelectorAll(`#scorers-${gameId} .player-scorer`);
    
    playerScorers.forEach(playerScorer => {
        const playerName = playerScorer.dataset.playerName;
        const shouldShow = playerName.includes(searchTerm);
        playerScorer.style.display = shouldShow ? 'block' : 'none';
    });
}

function updatePlayerGameStats(gameId, playerId) {
    const gameElement = document.querySelector(`[data-game-id="${gameId}"]`);
    const goalsInput = gameElement.querySelector(`.goals-input[data-player-id="${playerId}"]`);
    const assistsInput = gameElement.querySelector(`.assists-input[data-player-id="${playerId}"]`);
    
    const goals = parseInt(goalsInput.value) || 0;
    const assists = parseInt(assistsInput.value) || 0;
    
    const miniGame = miniGames.find(g => g.id === gameId);
    const existingScorer = miniGame.scorers.find(s => s.playerId === playerId);
    
    if (existingScorer) {
        existingScorer.goals = goals;
        existingScorer.assists = assists;
    } else {
        miniGame.scorers.push({
            playerId: playerId,
            goals: goals,
            assists: assists
        });
    }
    
    recalculatePlayerStats();
    updateStatsDisplay();
    
    // Auto-save for live games
    autoSaveLiveGame();
}

function recalculatePlayerStats() {
    console.log('Recalculating player stats...');
    console.log('Current playerStats before reset:', playerStats);
    console.log('Current teams:', teams);
    console.log('Current miniGames:', miniGames);
    
    // Reset all existing player stats
    Object.keys(playerStats).forEach(playerId => {
        playerStats[playerId] = { goals: 0, assists: 0, wins: 0 };
    });
    
    // Ensure all players currently in teams have stats initialized
    const currentGamePlayers = [].concat(...Object.values(teams));
    currentGamePlayers.forEach(playerId => {
        if (!playerStats[playerId]) {
            playerStats[playerId] = { goals: 0, assists: 0, wins: 0 };
            console.log(`Initialized missing stats for player: ${playerId}`);
        }
    });
    
    // Calculate goals and assists from mini-games
    miniGames.forEach(miniGame => {
        console.log(`Processing miniGame ${miniGame.id} with scorers:`, miniGame.scorers);
        
        miniGame.scorers.forEach(scorer => {
            // Ensure the player has stats initialized
            if (!playerStats[scorer.playerId]) {
                playerStats[scorer.playerId] = { goals: 0, assists: 0, wins: 0 };
                console.log(`Initialized stats for scorer: ${scorer.playerId}`);
            }
            
            playerStats[scorer.playerId].goals += scorer.goals;
            playerStats[scorer.playerId].assists += scorer.assists;
            console.log(`Added ${scorer.goals} goals and ${scorer.assists} assists to player ${scorer.playerId}`);
        });
        
        // Calculate wins
        if (miniGame.winner) {
            const winningTeamPlayers = teams[miniGame.winner] || [];
            console.log(`Team ${miniGame.winner} won, adding wins to players:`, winningTeamPlayers);
            
            winningTeamPlayers.forEach(playerId => {
                // Ensure the player has stats initialized
                if (!playerStats[playerId]) {
                    playerStats[playerId] = { goals: 0, assists: 0, wins: 0 };
                    console.log(`Initialized stats for winner: ${playerId}`);
                }
                
                playerStats[playerId].wins += 1;
                console.log(`Added 1 win to player ${playerId}`);
            });
        }
    });
    
    console.log('Final playerStats after recalculation:', playerStats);
}

function updateStatsDisplay() {
    const statsGrid = document.getElementById('stats-summary-grid');
    if (!statsGrid) {
        console.error('Stats grid element not found');
        return;
    }
    
    console.log('Updating stats display...');
    console.log('Player stats:', playerStats);
    console.log('Selected players:', selectedPlayers);
    
    statsGrid.innerHTML = '';
    
    const header = document.createElement('div');
    header.className = 'stats-header';
    header.innerHTML = `
        <div>שחקן</div>
        <div>גולים</div>
        <div>בישולים</div>
        <div>ניצחונות</div>
    `;
    statsGrid.appendChild(header);
    
    // Get all players currently in teams (this reflects the current team composition)
    const currentGamePlayers = [].concat(...Object.values(teams));
    
    // Also include any players from selectedPlayers who might not be in teams yet
    const allCurrentPlayers = [...new Set([...currentGamePlayers, ...selectedPlayers])];
    
    // Show all current players in the game
    if (!allCurrentPlayers || allCurrentPlayers.length === 0) {
        const noPlayersRow = document.createElement('div');
        noPlayersRow.className = 'stat-row';
        noPlayersRow.innerHTML = `
            <div colspan="4" style="text-align: center; color: #666; font-style: italic;">
                אין שחקנים במשחק
            </div>
        `;
        statsGrid.appendChild(noPlayersRow);
        return;
    }
    
    // Sort players by total goals + assists (descending), then by name
    const sortedPlayers = [...allCurrentPlayers].sort((a, b) => {
        const statsA = playerStats[a] || { goals: 0, assists: 0, wins: 0 };
        const statsB = playerStats[b] || { goals: 0, assists: 0, wins: 0 };
        
        const totalA = statsA.goals + statsA.assists;
        const totalB = statsB.goals + statsB.assists;
        
        // First sort by total performance (goals + assists)
        if (totalB !== totalA) {
            return totalB - totalA;
        }
        
        // If same performance, sort by name
        const playerA = allPlayers.find(p => p.id === a);
        const playerB = allPlayers.find(p => p.id === b);
        
        if (playerA && playerB) {
            return playerA.name.localeCompare(playerB.name, 'he');
        }
        
        return 0;
    });
    
    sortedPlayers.forEach(playerId => {
        const player = allPlayers.find(p => p.id === playerId);
        const stats = playerStats[playerId] || { goals: 0, assists: 0, wins: 0 };
        
        if (!player) {
            console.warn('Player not found for ID:', playerId);
            return;
        }
        
        const statRow = document.createElement('div');
        statRow.className = 'stat-row';
        statRow.innerHTML = `
            <div>${player.name}</div>
            <div>${stats.goals}</div>
            <div>${stats.assists}</div>
            <div>${stats.wins}</div>
        `;
        statsGrid.appendChild(statRow);
    });
    
    console.log('Stats display updated with', allCurrentPlayers.length, 'current players');
}

function toggleGameCollapse(gameId) {
    const gameElement = document.querySelector(`[data-game-id="${gameId}"]`);
    const gameContent = gameElement.querySelector('.game-content');
    const collapseIcon = gameElement.querySelector('.collapse-icon');
    const collapseBtn = gameElement.querySelector('.collapse-btn');
    
    if (gameContent.style.display === 'none') {
        // Expand
        gameContent.style.display = 'block';
        collapseIcon.textContent = '▲';
        collapseBtn.title = 'כווץ משחק';
    } else {
        // Collapse
        gameContent.style.display = 'none';
        collapseIcon.textContent = '▼';
        collapseBtn.title = 'הרחב משחק';
    }
}

// Helper function to calculate and apply stat reversals
async function reversePlayerStats(playerStatsToReverse) {
    if (DEMO_MODE) {
        console.log('Demo mode: Simulating stat reversal for:', playerStatsToReverse);
        return;
    }
    
    if (!playerStatsToReverse || Object.keys(playerStatsToReverse).length === 0) {
        console.log('No player stats to reverse');
        return;
    }
    
    const batch = writeBatch(db);
    let hasUpdates = false;
    
    Object.keys(playerStatsToReverse).forEach(playerId => {
        const playerRef = doc(db, 'players', playerId);
        const stats = playerStatsToReverse[playerId];
        
        // Ensure stats object has the expected properties
        const goals = stats.goals || 0;
        const assists = stats.assists || 0;
        const wins = stats.wins || 0;
        
        // Reverse the stats by subtracting them (only if they are positive)
        if (goals > 0 || assists > 0 || wins > 0) {
            batch.update(playerRef, {
                totalGoals: increment(-goals),
                totalAssists: increment(-assists),
                totalWins: increment(-wins)
            });
            
            console.log(`Reversing stats for player ${playerId}:`, {
                goals: -goals,
                assists: -assists,
                wins: -wins
            });
            
            hasUpdates = true;
        } else {
            console.log(`No positive stats to reverse for player ${playerId}:`, stats);
        }
    });
    
    if (hasUpdates) {
        await batch.commit();
        console.log('Player stats reversed successfully');
    } else {
        console.log('No stats needed to be reversed');
    }
}

function removeMiniGame(gameId) {
    // Find the game being removed to get its stats
    const gameToRemove = miniGames.find(g => g.id === gameId);
    if (gameToRemove) {
        console.log('Removing game with stats:', gameToRemove.playerStats);
    }
    
    miniGames = miniGames.filter(g => g.id !== gameId);
    
    // Re-render all games to update numbering
    renderAllMiniGames();
    
    recalculatePlayerStats();
    updateStatsDisplay();
    
    // If all games are removed, show a message
    if (miniGames.length === 0) {
        console.log('All games removed - player stats reset to zero');
    }
}

async function finalizeGameDay() {
    if (miniGames.length === 0) {
        alert('אנא הוסף לפחות משחק אחד לפני סיום ערב המשחק');
        return;
    }
    
    // Confirm ending the game night
    const confirmEnd = confirm('האם אתה בטוח שברצונך לסיים את ערב המשחק?\n\nפעולה זו תסגור את המשחק החי ותעדכן את הסטטיסטיקות הכלליות של השחקנים.');
    if (!confirmEnd) {
        return;
    }
    
    if (DEMO_MODE) {
        console.log('Demo mode: Ending game night');
        console.log('Game day data:', {
            date: currentGameDay.date,
            miniGames: miniGames.length,
            playerStats: Object.keys(playerStats).length
        });
        
        // Simulate saving delay
        showLoadingWithTimeout(true, 2000);
        setTimeout(() => {
            showLoadingWithTimeout(false);
            alert('🏁 ערב המשחק הסתיים בהצלחה!\n\nהסטטיסטיקות עודכנו והמשחק החי נסגר.');
            goToStep(1); // Return to main dashboard
        }, 1500);
        return;
    }
    
    showLoadingWithTimeout(true, 15000);
    
    try {
        console.log('Ending game night with mini games:', miniGames);
        
        // Update the current game day data and mark as completed
        currentGameDay.miniGames = miniGames;
        currentGameDay.playerStats = playerStats;
        currentGameDay.status = 'completed'; // NOW we mark it as completed
        currentGameDay.endedAt = new Date().toISOString(); // Add end timestamp
        
        // Save to Firestore (use setDoc with merge to create if doesn't exist)
        const gameDayRef = doc(db, 'gameDays', currentGameDay.date);
        await setDoc(gameDayRef, currentGameDay, { merge: true });
        
        console.log('Game night ended successfully');
        
        // Update player career stats (only when game night is officially ended)
        const batch = writeBatch(db);
        
        Object.keys(playerStats).forEach(playerId => {
            const playerRef = doc(db, 'players', playerId);
            const newStats = playerStats[playerId];
            const oldStats = originalPlayerStats[playerId] || { goals: 0, assists: 0, wins: 0 };
            
            // Calculate the difference between new and old stats
            const statsDiff = {
                goals: newStats.goals - oldStats.goals,
                assists: newStats.assists - oldStats.assists,
                wins: newStats.wins - oldStats.wins
            };
            
            // Only update if there's a difference to avoid incrementing by 0
            if (statsDiff.goals !== 0 || statsDiff.assists !== 0 || statsDiff.wins !== 0) {
                batch.update(playerRef, {
                    totalGoals: increment(statsDiff.goals),
                    totalAssists: increment(statsDiff.assists),
                    totalWins: increment(statsDiff.wins)
                });
                
                console.log(`Player ${playerId} stats difference:`, statsDiff);
            }
        });
        
        await batch.commit();
        console.log('Player career stats updated successfully');
        
        // Clear live game data
        window.currentLiveGame = null;
        
        alert('🏁 ערב המשחק הסתיים בהצלחה!\n\nהסטטיסטיקות עודכנו והמשחק החי נסגר.');
        goToStep(1); // Return to main dashboard
        
    } catch (error) {
        console.error('Error ending game night:', error);
        alert('שגיאה בסיום ערב המשחק: ' + error.message);
    } finally {
        showLoadingWithTimeout(false);
    }
}

function goToStep(stepNumber) {
    // Store current step in history before navigating (but not if we're going back)
    if (currentStep !== stepNumber && currentStep !== 0) {
        navigationHistory.push(currentStep);
        updateBackButton();
    }
    
    // Mark previous step as completed if we're moving forward (but not when going back to step 1)
    if (stepNumber > currentStep && currentStep > 0 && stepNumber !== 1) {
        completedSteps.add(currentStep);
    }
    
    document.querySelectorAll('.admin-step').forEach(step => {
        step.classList.add('hidden');
        step.classList.remove('active');
    });
    
    document.getElementById(`step-${stepNumber}`).classList.remove('hidden');
    document.getElementById(`step-${stepNumber}`).classList.add('active');
    
    // Update current step
    currentStep = stepNumber;
    
    // Special handling for different steps
    if (stepNumber === 1) {
        // Complete reset when going back to main dashboard
        startFreshSession();
    } else if (stepNumber === 4) {
        // Initialize player stats if not already done
        if (Object.keys(playerStats).length === 0) {
            console.log('Initializing player stats for Step 4...');
            selectedPlayers.forEach(playerId => {
                playerStats[playerId] = { goals: 0, assists: 0, wins: 0 };
            });
        }
        
        // Hide/show action buttons based on mode
        const addGameBtn = document.getElementById('add-mini-game-btn');
        const finalizeBtn = document.getElementById('finalize-gameday-btn');
        const liveControls = document.querySelector('.live-game-controls');
        
        if (isViewOnlyMode) {
            // Hide action buttons in view-only mode
            if (addGameBtn) addGameBtn.style.display = 'none';
            if (finalizeBtn) finalizeBtn.style.display = 'none';
            if (liveControls) liveControls.style.display = 'none';
        } else {
            // Show action buttons in edit/live mode
            if (addGameBtn) addGameBtn.style.display = 'block';
            if (finalizeBtn) finalizeBtn.style.display = 'block';
            if (liveControls) liveControls.style.display = 'block';
        }
        
        // Always update stats display when entering Step 4
        updateStatsDisplay();
        console.log('Entered Step 4 - Player stats:', playerStats);
    }
    
    // Update progress indicator after all special handling
    updateProgressSteps(stepNumber);
    
    // If in edit mode, ensure steps 1 and 2 remain disabled
    if (isEditMode) {
        setTimeout(() => updateProgressSteps(stepNumber), 10);
    }
}

// Step navigation functionality
function setupStepNavigation() {
    const steps = document.querySelectorAll('.progress-steps .step');
    steps.forEach(step => {
        step.addEventListener('click', () => {
            const stepNumber = parseInt(step.dataset.step);
            if (canNavigateToStep(stepNumber)) {
                goToStep(stepNumber);
            } else {
                // Provide feedback when step is not accessible
                if (isEditMode && (stepNumber === 1 || stepNumber === 2)) {
                    alert('במצב עריכה ניתן לנהל הכל משלב 3 - חלוקת קבוצות');
                } else if (stepNumber > 1 && !currentGameDay) {
                    alert('יש ליצור או לבחור ערב משחק תחילה');
                } else if (stepNumber === 2 && currentGameDay && selectedPlayers.length !== 21) {
                    alert('יש לבחור 21 שחקנים תחילה');
                } else if (stepNumber === 3 && currentGameDay && (teams.A.length !== 7 || teams.B.length !== 7 || teams.C.length !== 7)) {
                    alert('יש לחלק את השחקנים לקבוצות תחילה');
                }
            }
        });
    });
}

function hasGameNightStarted() {
    // Check if any mini-games have results (scores entered)
    if (!miniGames || miniGames.length === 0) {
        console.log('No games found - game night has not started');
        return false; // No games = hasn't started
    }
    
    console.log('Checking games for results:', miniGames);
    
    // Check if any game has scores entered (including 0 scores)
    for (const game of miniGames) {
        console.log('Checking game:', game);
        console.log('All game properties:', Object.keys(game));
        console.log('teamAScore:', game.teamAScore, 'type:', typeof game.teamAScore);
        console.log('teamBScore:', game.teamBScore, 'type:', typeof game.teamBScore);
        
        // Check if both scores are defined (even if they are 0)
        if (game.teamAScore !== undefined && game.teamBScore !== undefined) {
            console.log('Game night has started - found game with defined scores:', {
                teamAScore: game.teamAScore,
                teamBScore: game.teamBScore,
                game: game
            });
            return true;
        }
        
        // Also check for other possible score property names
        if ((game.scoreA !== undefined && game.scoreB !== undefined) ||
            (game.score1 !== undefined && game.score2 !== undefined) ||
            (game.teamA_score !== undefined && game.teamB_score !== undefined)) {
            console.log('Game night has started - found game with scores (alternative properties)');
            return true;
        }
    }
    
    console.log('Game night has not started yet - no games with defined scores');
    return false;
}

function canNavigateToStep(stepNumber) {
    // If we're in view-only mode, only allow step 4
    if (isViewOnlyMode) {
        const canNavigate = stepNumber === 4;
        console.log(`View-only mode - Step ${stepNumber} can navigate: ${canNavigate}`);
        return canNavigate;
    }
    
    // If we're in edit mode, check what type of edit mode we're in
    if (isEditMode) {
        // If editing an upcoming game, only allow step 3 (team assignment)
        if (isEditingUpcomingGame) {
            const canNavigate = stepNumber === 3;
            console.log(`Upcoming game mode - Step ${stepNumber} can navigate: ${canNavigate}`);
            return canNavigate;
        }
        // If managing a live game, check if it has started
        const gameStarted = hasGameNightStarted();
        console.log(`Live game mode - Game started: ${gameStarted}, checking step ${stepNumber}`);
        
        if (gameStarted) {
            // Game night has started (has games with results) - only allow step 4
            const canNavigate = stepNumber === 4;
            console.log(`Started live game mode - Step ${stepNumber} can navigate: ${canNavigate}`);
            return canNavigate;
        } else {
            // Game night hasn't started yet - allow steps 3 and 4
            const canNavigate = stepNumber >= 3;
            console.log(`Pre-start live game mode - Step ${stepNumber} can navigate: ${canNavigate}`);
            return canNavigate;
        }
    }
    
    // Step 1 is always accessible (unless in edit mode)
    if (stepNumber === 1) return true;
    
    // If no game day exists, only step 1 is accessible
    if (!currentGameDay) {
        return stepNumber === 1;
    }
    
    // Can navigate to completed steps only if game day exists
    if (completedSteps.has(stepNumber) && currentGameDay) return true;
    
    // Can navigate to current step
    if (stepNumber === currentStep) return true;
    
    // Can navigate to next step if current step requirements are met
    if (stepNumber === currentStep + 1) {
        switch (currentStep) {
            case 1:
                return currentGameDay !== null;
            case 2:
                return selectedPlayers.length === 21;
            case 3:
                return teams.A.length === 7 && teams.B.length === 7 && teams.C.length === 7;
            default:
                return false;
        }
    }
    
    return false;
}

function isCurrentStepValid() {
    switch (currentStep) {
        case 1:
            return true; // Step 1 is always valid
        case 2:
            return currentGameDay !== null && selectedPlayers.length === 21;
        case 3:
            return currentGameDay !== null && teams.A.length === 7 && teams.B.length === 7 && teams.C.length === 7;
        case 4:
            return currentGameDay !== null; // Step 4 is valid if we have a game day
        default:
            return false;
    }
}

function updateProgressSteps(currentStepNumber) {
    console.log('Updating progress steps - Current step:', currentStepNumber, 'Edit mode:', isEditMode, 'Editing upcoming:', isEditingUpcomingGame);
    
    document.querySelectorAll('.progress-steps .step').forEach(step => {
        const stepNumber = parseInt(step.dataset.step);
        const canNavigate = canNavigateToStep(stepNumber);
        
        // Remove all classes first
        step.classList.remove('active', 'completed', 'disabled');
        
        if (stepNumber === currentStepNumber) {
            step.classList.add('active');
            console.log(`Step ${stepNumber}: active`);
        } else if (isEditMode && !canNavigate) {
            // In edit mode, prioritize disabling over completed status
            step.classList.add('disabled');
            console.log(`Step ${stepNumber}: disabled in edit mode (canNavigate: ${canNavigate})`);
        } else if (completedSteps.has(stepNumber)) {
            step.classList.add('completed');
            console.log(`Step ${stepNumber}: completed`);
        } else if (!canNavigate) {
            step.classList.add('disabled');
            console.log(`Step ${stepNumber}: disabled (canNavigate: ${canNavigate})`);
        } else {
            console.log(`Step ${stepNumber}: normal`);
        }
    });
}

// Back button functionality
function adminGoBack() {
    console.log('Back button clicked - Navigation history:', navigationHistory);
    if (navigationHistory.length > 0) {
        const previousStep = navigationHistory.pop();
        console.log('Going back to step:', previousStep);
        
        // Special handling for view-only mode
        if (isViewOnlyMode && previousStep === 'history') {
            console.log('Exiting view-only mode and returning to history view');
            // Exit view-only mode and go back to history view
            isViewOnlyMode = false;
            viewOnlySource = null;
            hideEditModeIndicator();
            
            // Show history view and hide current step
            document.getElementById('step-4').classList.add('hidden');
            document.getElementById('step-4').classList.remove('active');
            document.getElementById('history-view').classList.remove('hidden');
            
            // Reset navigation history
            navigationHistory = [1]; // From history view, can go back to main dashboard
            updateBackButton();
            return;
        }
        
        // Special handling for edit mode
        if (isEditMode && previousStep === 'history') {
            console.log('Exiting edit mode and returning to history view');
            // Exit edit mode and go back to history view
            isEditMode = false;
            isEditingUpcomingGame = false;
            editModeSource = null;
            hideEditModeIndicator();
            
            // Show history view and hide current step
            document.getElementById('step-4').classList.add('hidden');
            document.getElementById('step-4').classList.remove('active');
            document.getElementById('history-view').classList.remove('hidden');
            
            // Reset navigation history
            navigationHistory = [1]; // From history view, can go back to main dashboard
            updateBackButton();
            return;
        }
        
        // In edit mode, if trying to go back to step 1 (main dashboard), exit edit mode
        if (isEditMode && previousStep === 1) {
            console.log('Exiting edit mode and returning to main dashboard');
            // Exit edit mode by going to step 1 (which will call startFreshSession)
            goToStep(1);
            return;
        }
        
        // In view-only mode, if trying to go back to step 1 (main dashboard), exit view-only mode
        if (isViewOnlyMode && previousStep === 1) {
            console.log('Exiting view-only mode and returning to main dashboard');
            // Exit view-only mode by going to step 1 (which will call startFreshSession)
            goToStep(1);
            return;
        }
        
        // In edit mode, make sure we don't go to other invalid steps
        if (isEditMode && !canNavigateToStep(previousStep)) {
            console.log(`Cannot go back to step ${previousStep} in edit mode`);
            // Put the step back in history since we can't navigate to it
            navigationHistory.push(previousStep);
            updateBackButton();
            return;
        }
        
        // Don't add to history when going back
        const tempCurrentStep = currentStep;
        currentStep = 0; // Temporarily set to 0 to prevent adding to history
        
        // Navigate to previous step
        goToStep(previousStep);
        
        // Update back button visibility
        updateBackButton();
    }
}

function updateBackButton() {
    const backBtn = document.getElementById('admin-back-btn');
    if (backBtn) {
        if (navigationHistory.length > 0) {
            backBtn.classList.remove('hidden');
        } else {
            backBtn.classList.add('hidden');
        }
    }
}

function clearNavigationHistory() {
    navigationHistory = [];
    updateBackButton();
}

function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

// Add a safety timeout to hide loading if it gets stuck
let loadingTimeout;
function showLoadingWithTimeout(show, timeoutMs = 10000) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
        // Clear any existing timeout
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
        }
        // Set a timeout to hide loading if it gets stuck
        loadingTimeout = setTimeout(() => {
            console.warn('Loading timeout reached, hiding loading overlay');
            loadingOverlay.classList.add('hidden');
            alert('הפעולה נתקעה - אנא נסה שוב');
        }, timeoutMs);
    } else {
        loadingOverlay.classList.add('hidden');
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            loadingTimeout = null;
        }
    }
}

function resetGameDayState() {
    console.log('Resetting game day state completely...');
    
    // Always reset when going back to step 1, unless we're in a live game
    if (!window.currentLiveGame) {
        // Reset all game day data
        currentGameDay = null;
        selectedPlayers = [];
        teams = { A: [], B: [], C: [] };
        miniGames = [];
        playerStats = {};
        originalPlayerStats = {}; // Clear original stats
        allPlayers = [];
        isEditMode = false;
        isEditingUpcomingGame = false;
        isViewOnlyMode = false;
        viewOnlySource = null;
        editModeSource = null;
        
        // Reset completed steps completely
        completedSteps.clear();
        
        // Clear navigation history
        clearNavigationHistory();
        
        // Clear any existing unassigned players container
        const unassignedContainer = document.querySelector('.unassigned-players');
        if (unassignedContainer) {
            unassignedContainer.remove();
        }
        
        // Reset form fields
        const gameDateInput = document.getElementById('game-date');
        if (gameDateInput) {
            const today = getTodayIsrael();
            gameDateInput.value = today;
            gameDateInput.min = today; // Prevent selecting past dates
        }
        
        // Clear player search
        const playerSearchInput = document.getElementById('player-search');
        if (playerSearchInput) {
            playerSearchInput.value = '';
        }
        
        // Clear players grid
        const playersGrid = document.getElementById('players-grid');
        if (playersGrid) {
            playersGrid.innerHTML = '';
        }
        
        // Clear team containers
        ['A', 'B', 'C'].forEach(teamLetter => {
            const teamContainer = document.getElementById(`team-${teamLetter}`);
            if (teamContainer) {
                teamContainer.innerHTML = '';
            }
        });
        
        // Clear mini games
        const miniGamesList = document.getElementById('mini-games-list');
        if (miniGamesList) {
            miniGamesList.innerHTML = '';
        }
        
        // Clear stats summary
        const statsSummaryGrid = document.getElementById('stats-summary-grid');
        if (statsSummaryGrid) {
            statsSummaryGrid.innerHTML = '';
        }
        
        console.log('Game day state reset completely');
    }
}

function startFreshSession() {
    console.log('Starting completely fresh session...');
    
    // Reset all state variables
    currentGameDay = null;
    selectedPlayers = [];
    teams = { A: [], B: [], C: [] };
    miniGames = [];
    playerStats = {};
    originalPlayerStats = {}; // Clear original stats
    allPlayers = [];
    isEditMode = false;
    isEditingUpcomingGame = false;
    isViewOnlyMode = false;
    viewOnlySource = null;
    editModeSource = null;
    
    // Reset completed steps
    completedSteps.clear();
    
            // Clear navigation history
        clearNavigationHistory();
        
        // Hide edit mode indicator
        hideEditModeIndicator();
        
        // Reset form fields
    const gameDateInput = document.getElementById('game-date');
    if (gameDateInput) {
        const today = getTodayIsrael();
        gameDateInput.value = today;
        gameDateInput.min = today; // Prevent selecting past dates
    }
    
    // Clear all UI elements
    clearAllUIElements();
    
    // Check for live games
    checkForLiveGames();
    
    console.log('Fresh session started');
}

function clearAllUIElements() {
    // Clear player search
    const playerSearchInput = document.getElementById('player-search');
    if (playerSearchInput) {
        playerSearchInput.value = '';
    }
    
    // Clear players grid
    const playersGrid = document.getElementById('players-grid');
    if (playersGrid) {
        playersGrid.innerHTML = '';
    }
    
    // Clear team containers
    ['A', 'B', 'C'].forEach(teamLetter => {
        const teamContainer = document.getElementById(`team-${teamLetter}`);
        if (teamContainer) {
            teamContainer.innerHTML = '';
        }
    });
    
    // Clear any existing unassigned players container
    const unassignedContainer = document.querySelector('.unassigned-players');
    if (unassignedContainer) {
        unassignedContainer.remove();
    }
    
    // Clear mini games
    const miniGamesList = document.getElementById('mini-games-list');
    if (miniGamesList) {
        miniGamesList.innerHTML = '';
    }
    
    // Clear stats summary
    const statsSummaryGrid = document.getElementById('stats-summary-grid');
    if (statsSummaryGrid) {
        statsSummaryGrid.innerHTML = '';
    }
    
    // Reset selected count display
    const selectedCount = document.getElementById('selected-count');
    if (selectedCount) {
        selectedCount.textContent = 'נבחרו: 0/21';
    }
    
    // Reset team counts
    ['A', 'B', 'C'].forEach(teamLetter => {
        const countElement = document.querySelector(`[data-team="${teamLetter}"] .team-count`);
        if (countElement) {
            countElement.textContent = '0/7';
        }
    });
    
    // Reset team headers
    ['A', 'B', 'C'].forEach(teamLetter => {
        const teamHeader = document.querySelector(`[data-team="${teamLetter}"] h3`);
        if (teamHeader) {
            teamHeader.innerHTML = `קבוצה ${teamLetter}`;
        }
    });
}

function startNewGameDay() {
    startFreshSession();
    goToStep(1);
}

window.removeMiniGame = removeMiniGame;

// Game Day History Functions
async function showGameHistory() {
    try {
        // Add current step to navigation history
        navigationHistory.push(currentStep);
        updateBackButton();
        
        // Hide step 1 and show history view
        document.getElementById('step-1').classList.add('hidden');
        document.getElementById('history-view').classList.remove('hidden');
        
        // Load game day history
        await loadGameDayHistory();
        
    } catch (error) {
        console.error('Error showing game history:', error);
        alert('שגיאה בטעינת היסטוריית המשחקים: ' + error.message);
    }
}

function backToCreate() {
    // Hide history view and show step 1
    document.getElementById('history-view').classList.add('hidden');
    document.getElementById('step-1').classList.remove('hidden');
    
    // Reset game day state when going back to main dashboard
    resetGameDayState();
    
    // Remove last item from navigation history and update back button
    if (navigationHistory.length > 0) {
        navigationHistory.pop();
        updateBackButton();
    }
    
    // Update progress steps to reflect reset state
    updateProgressSteps(1);
}

async function loadGameDayHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '<div class="loading-text">טוען היסטוריית משחקים...</div>';
    
    try {
        if (DEMO_MODE) {
            // Show demo history
            loadDemoHistory();
            return;
        }
        
        console.log('Loading game day history from Firestore...');
        
        // Load all game days from Firestore
        const gameDaysSnapshot = await getDocs(collection(db, 'gameDays'));
        const gameDays = [];
        
        gameDaysSnapshot.forEach((doc) => {
            const data = doc.data();
            gameDays.push({
                id: doc.id,
                date: data.date,
                participants: data.participants || [],
                miniGames: data.miniGames || [],
                status: data.status || 'draft',
                playerStats: data.playerStats || {}
            });
        });
        
        // Sort by date (newest first)
        gameDays.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        renderGameDayHistory(gameDays);
        
    } catch (error) {
        console.error('Error loading game day history:', error);
        historyList.innerHTML = '<div class="error-text">שגיאה בטעינת היסטוריית המשחקים</div>';
    }
}

function loadDemoHistory() {
    const demoGameDays = [
        {
            id: '2024-01-20',
            date: '2024-01-20',
            participants: ['שחקן 1', 'שחקן 2', 'שחקן 3'],
            miniGames: [{}, {}, {}],
            status: 'completed',
            playerStats: {'demo-player-1': {goals: 3, assists: 1, wins: 2}}
        },
        {
            id: '2024-01-15',
            date: '2024-01-15',
            participants: ['שחקן 4', 'שחקן 5', 'שחקן 6'],
            miniGames: [{}, {}],
            status: 'completed',
            playerStats: {'demo-player-4': {goals: 2, assists: 2, wins: 1}}
        }
    ];
    
    renderGameDayHistory(demoGameDays);
}

function renderGameDayHistory(gameDays) {
    const historyList = document.getElementById('history-list');
    
    if (gameDays.length === 0) {
        historyList.innerHTML = '<div class="no-history">אין עדיין ערבי משחק שמורים</div>';
        return;
    }
    
    let html = '';
    gameDays.forEach(gameDay => {
        const dateFormatted = new Date(gameDay.date).toLocaleDateString('he-IL');
        const totalGames = gameDay.miniGames.length;
        const totalPlayers = gameDay.participants.length;
        const statusText = gameDay.status === 'completed' ? 'הושלם' : 'טיוטה';
        const statusClass = gameDay.status === 'completed' ? 'completed' : 'draft';
        
        html += `
            <div class="history-item ${statusClass}" data-game-id="${gameDay.id}">
                <div class="history-item-header">
                    <h3>${dateFormatted}</h3>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="history-item-details">
                    <div class="detail-item">
                        <span class="detail-label">שחקנים:</span>
                        <span class="detail-value">${totalPlayers}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">משחקים:</span>
                        <span class="detail-value">${totalGames}</span>
                    </div>
                </div>
                <div class="history-item-actions">
                    <button class="secondary-btn" onclick="editGameDay('${gameDay.id}')">ערוך</button>
                    <button class="secondary-btn" onclick="viewGameDayDetails('${gameDay.id}')">צפה</button>
                    <button class="delete-btn" onclick="deleteGameDay('${gameDay.id}', '${dateFormatted}')">מחק</button>
                </div>
            </div>
        `;
    });
    
    historyList.innerHTML = html;
}

async function editGameDay(gameDayId) {
    try {
        console.log('Loading game day for editing:', gameDayId);
        
        // Load the specific game day
        let gameDay;
        if (DEMO_MODE) {
            // Demo mode - create a demo game day
            gameDay = {
                date: gameDayId,
                participants: ['demo-player-1', 'demo-player-2', 'demo-player-3'],
                teams: { A: ['demo-player-1'], B: ['demo-player-2'], C: ['demo-player-3'] },
                miniGames: [],
                playerStats: {},
                status: 'draft'
            };
            allPlayers = [];
            for (let i = 1; i <= 25; i++) {
                allPlayers.push({
                    id: `demo-player-${i}`,
                    name: `שחקן ${i}`,
                    totalGoals: Math.floor(Math.random() * 20),
                    totalAssists: Math.floor(Math.random() * 15),
                    totalWins: Math.floor(Math.random() * 10)
                });
            }
        } else {
            // Load from Firestore
            const docRef = doc(db, 'gameDays', gameDayId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                throw new Error('Game day not found');
            }
            
            gameDay = docSnap.data();
            await loadPlayers();
        }
        
        // Set up edit mode
        isEditMode = true;
        isEditingUpcomingGame = false;
        isViewOnlyMode = false;
        
        // Detect where edit mode was initiated from
        const historyView = document.getElementById('history-view');
        const isFromHistoryView = historyView && !historyView.classList.contains('hidden');
        
        if (isFromHistoryView) {
            editModeSource = 'history';
            console.log('Edit mode initiated from history view');
        } else {
            editModeSource = 'main';
            console.log('Edit mode initiated from main dashboard');
        }
        
        // Set current game day
        currentGameDay = gameDay;
        selectedPlayers = gameDay.participants || [];
        teams = gameDay.teams || { A: [], B: [], C: [] };
        miniGames = gameDay.miniGames || [];
        playerStats = gameDay.playerStats || {};
        
        // Store original stats for difference calculation
        originalPlayerStats = JSON.parse(JSON.stringify(playerStats));
        console.log('Stored original stats for editing:', originalPlayerStats);
        
        console.log('Loaded game day for editing:', {
            date: gameDay.date,
            participants: selectedPlayers.length,
            miniGames: miniGames.length,
            teams: Object.keys(teams).map(t => `${t}: ${teams[t].length}`)
        });
        
        // Hide history and go to step 4 (mini-games)
        document.getElementById('history-view').classList.add('hidden');
        goToStep(4);
        
        // Set up navigation history for back button based on source
        if (editModeSource === 'history') {
            navigationHistory = ['history']; // Go back to history view
        } else {
            navigationHistory = [1]; // Go back to main dashboard
        }
        updateBackButton();
        
        // Show edit mode indicator
        showEditModeIndicator();
        
        // Render the loaded data
        renderMiniGamesForEditing();
        updateStatsDisplay();
        
        console.log('Game day loaded for editing');
        
    } catch (error) {
        console.error('Error loading game day for editing:', error);
        alert('שגיאה בטעינת ערב המשחק לעריכה: ' + error.message);
    }
}

function renderMiniGamesForEditing() {
    console.log('Rendering mini games for editing:', miniGames);
    
    if (miniGames && miniGames.length > 0) {
        renderAllMiniGames();
    } else {
        console.log('No mini games to render');
        const miniGamesList = document.getElementById('mini-games-list');
        miniGamesList.innerHTML = '';
    }
}

function renderMiniGamesForViewing() {
    const miniGamesList = document.getElementById('mini-games-list');
    miniGamesList.innerHTML = '';
    
    if (miniGames.length === 0) {
        miniGamesList.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">אין משחקים להצגה</p>';
        return;
    }
    
    miniGames.forEach((miniGame) => {
        renderMiniGameViewOnly(miniGame, miniGame.gameNumber);
    });
}

function renderMiniGameViewOnly(miniGame, gameNumber = null) {
    const miniGamesList = document.getElementById('mini-games-list');
    
    // Use stored game number or calculate if not provided
    if (gameNumber === null) {
        gameNumber = miniGame.gameNumber || (miniGames.findIndex(g => g.id === miniGame.id) + 1);
    }
    
    const miniGameElement = document.createElement('div');
    miniGameElement.className = 'mini-game view-only';
    miniGameElement.dataset.gameId = miniGame.id;
    
    // Default state is expanded for viewing
    const hasContent = miniGame.teamA && miniGame.teamB;
    const teamAName = getTeamDisplayName(miniGame.teamA);
    const teamBName = getTeamDisplayName(miniGame.teamB);
    
    miniGameElement.innerHTML = `
        <div class="mini-game-header">
            <div class="game-header-left">
                <button class="collapse-btn" onclick="toggleGameCollapse('${miniGame.id}')" title="כווץ/הרחב משחק">
                    <span class="collapse-icon">▲</span>
                </button>
                <h4>משחק ${gameNumber}</h4>
                ${hasContent ? `<span class="game-summary">${teamAName} ${miniGame.scoreA || 0}-${miniGame.scoreB || 0} ${teamBName}</span>` : ''}
            </div>
        </div>
        
        <div class="game-content">
            <div class="game-setup">
                <div class="team-selection">
                    <label>קבוצה 1:</label>
                    <input type="text" class="team-display" value="${teamAName}" readonly>
                </div>
                
                <div class="vs">נגד</div>
                
                <div class="team-selection">
                    <label>קבוצה 2:</label>
                    <input type="text" class="team-display" value="${teamBName}" readonly>
                </div>
            </div>
            
            <div class="score-section">
                <div class="score-input">
                    <label>תוצאה קבוצה 1:</label>
                    <input type="number" class="score-input-field" value="${miniGame.scoreA || 0}" readonly>
                </div>
                
                <div class="score-input">
                    <label>תוצאה קבוצה 2:</label>
                    <input type="number" class="score-input-field" value="${miniGame.scoreB || 0}" readonly>
                </div>
            </div>
            
            <div class="scorers-section">
                <h5>מבקיעים ומבשלים:</h5>
                <div class="scorers-grid" id="scorers-${miniGame.id}">
                    <!-- Scorers will be added here -->
                </div>
            </div>
        </div>
    `;
    
    miniGamesList.appendChild(miniGameElement);
    
    // Update scorers section in view-only mode
    if (miniGame.teamA && miniGame.teamB) {
        updateScorersSection(miniGame.id);
        
        // Disable all scorer inputs after they're created
        setTimeout(() => {
            const scorersContainer = document.getElementById(`scorers-${miniGame.id}`);
            if (scorersContainer) {
                const inputs = scorersContainer.querySelectorAll('input');
                inputs.forEach(input => {
                    input.readOnly = true;
                    input.style.backgroundColor = '#f5f5f5';
                    input.style.cursor = 'default';
                });
            }
            
            // Restore existing scorer data
            if (miniGame.scorers && miniGame.scorers.length > 0) {
                miniGame.scorers.forEach(scorer => {
                    const goalsInput = miniGameElement.querySelector(`.goals-input[data-player-id="${scorer.playerId}"]`);
                    const assistsInput = miniGameElement.querySelector(`.assists-input[data-player-id="${scorer.playerId}"]`);
                    if (goalsInput) goalsInput.value = scorer.goals;
                    if (assistsInput) assistsInput.value = scorer.assists;
                });
            }
        }, 100);
    }
}

async function viewGameDayDetails(gameDayId) {
    try {
        console.log('Viewing game day details:', gameDayId);
        
        let gameDayData;
        
        if (DEMO_MODE) {
            // Demo mode - load demo data
            const demoHistory = loadDemoHistory();
            gameDayData = demoHistory.find(game => game.id === gameDayId);
            
            if (!gameDayData) {
                alert('משחק לא נמצא במצב דמו');
                return;
            }
        } else {
            // Load from Firestore
            const gameDayRef = doc(db, 'gameDays', gameDayId);
            const gameDaySnap = await getDoc(gameDayRef);
            
            if (!gameDaySnap.exists()) {
                alert('ערב המשחק לא נמצא');
                return;
            }
            
            gameDayData = gameDaySnap.data();
        }
        
        // Set up view-only mode
        isViewOnlyMode = true;
        isEditMode = false;
        isEditingUpcomingGame = false;
        
        // Detect where view-only mode was initiated from
        const historyView = document.getElementById('history-view');
        const isFromHistoryView = historyView && !historyView.classList.contains('hidden');
        
        if (isFromHistoryView) {
            viewOnlySource = 'history';
            console.log('View-only mode initiated from history view');
        } else {
            viewOnlySource = 'main';
            console.log('View-only mode initiated from main dashboard');
        }
        
        // Set current game day data
        currentGameDay = { id: gameDayId, ...gameDayData };
        selectedPlayers = gameDayData.participants;
        teams = gameDayData.teams;
        miniGames = gameDayData.miniGames || [];
        playerStats = gameDayData.playerStats || {};
        
        // Load players if needed
        if (DEMO_MODE) {
            loadDemoPlayers();
        } else {
            await loadPlayers();
        }
        
        // Go to step 4 (mini-games view)
        goToStep(4);
        
        // Set up navigation history for back button based on source
        if (viewOnlySource === 'history') {
            navigationHistory = ['history']; // Go back to history view
        } else {
            navigationHistory = [1]; // Go back to main dashboard
        }
        updateBackButton();
        
        // Show view-only indicator
        showViewOnlyIndicator();
        
        // Force update progress steps to reflect view-only mode
        updateProgressSteps(4);
        
        // Render mini-games in view-only mode
        renderMiniGamesForViewing();
        
        // Update stats display
        updateStatsDisplay();
        
        console.log('Game day loaded in view-only mode');
        
    } catch (error) {
        console.error('Error loading game day for viewing:', error);
        alert('שגיאה בטעינת ערב המשחק: ' + error.message);
    }
}

// Delete game day function
async function deleteGameDay(gameDayId, dateFormatted) {
    // Confirm deletion with warning about stat reversal
    const confirmDelete = confirm(`האם אתה בטוח שברצונך למחוק את ערב המשחק מתאריך ${dateFormatted}?\n\nפעולה זו תמחק את המשחק ותבטל את כל הסטטיסטיקות שנוספו לשחקנים.\n\nפעולה זו לא ניתנת לביטול!`);
    
    if (!confirmDelete) {
        return;
    }
    
    try {
        console.log('Deleting game day:', gameDayId);
        
        if (DEMO_MODE) {
            // Demo mode - just refresh the history display
            console.log('Demo mode: Simulating game day deletion');
            alert('מצב דמו: ערב המשחק "נמחק" (לא נשמר בפועל)');
            await loadGameDayHistory();
            return;
        }
        
        // Show loading
        const historyList = document.getElementById('history-list');
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-text';
        loadingDiv.textContent = 'מוחק ערב משחק...';
        historyList.appendChild(loadingDiv);
        
        // First, get the game day data to reverse stats if it's completed
        const gameDayRef = doc(db, 'gameDays', gameDayId);
        const gameDaySnap = await getDoc(gameDayRef);
        
        if (gameDaySnap.exists()) {
            const gameDayData = gameDaySnap.data();
            
            // Reverse stats if the game day has any player stats, regardless of status
            // This handles both completed games and draft games that had stats during editing
            if (gameDayData.playerStats && Object.keys(gameDayData.playerStats).length > 0) {
                console.log('Reversing stats for game day:', gameDayData.playerStats);
                console.log('Game day status:', gameDayData.status);
                await reversePlayerStats(gameDayData.playerStats);
            } else {
                console.log('No player stats to reverse for this game day');
            }
        }
        
        // Delete from Firestore
        await deleteDoc(gameDayRef);
        
        console.log('Game day deleted successfully');
        
        // Show success message
        alert('ערב המשחק נמחק בהצלחה והסטטיסטיקות עודכנו');
        
        // Refresh the history display
        await loadGameDayHistory();
        
    } catch (error) {
        console.error('Error deleting game day:', error);
        alert('שגיאה במחיקת ערב המשחק: ' + error.message);
    }
}

// Live Games Management
async function checkForLiveGames() {
    try {
        const today = getTodayIsrael();
        console.log('Checking for live games on:', today);
        
        let liveGame = null;
        let upcomingGames = [];
        
        if (DEMO_MODE) {
            // Demo mode - create a demo live game for today and upcoming games
            liveGame = {
                id: today,
                date: today,
                participants: ['demo-player-1', 'demo-player-2', 'demo-player-3'],
                teams: { A: ['demo-player-1'], B: ['demo-player-2'], C: ['demo-player-3'] },
                miniGames: [],
                status: 'ready'
            };
            
            // Create demo upcoming games
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfter = new Date();
            dayAfter.setDate(dayAfter.getDate() + 3);
            
            const tomorrowIsrael = tomorrow.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' });
            const dayAfterIsrael = dayAfter.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' });
            
            upcomingGames = [
                {
                    id: tomorrowIsrael,
                    date: tomorrowIsrael,
                    participants: ['demo-player-1', 'demo-player-2', 'demo-player-3'],
                    teams: { A: ['demo-player-1'], B: ['demo-player-2'], C: ['demo-player-3'] },
                    miniGames: [],
                    status: 'ready'
                },
                {
                    id: dayAfterIsrael,
                    date: dayAfterIsrael,
                    participants: ['demo-player-1', 'demo-player-2'],
                    teams: { A: ['demo-player-1'], B: ['demo-player-2'], C: [] },
                    miniGames: [],
                    status: 'ready'
                }
            ];
        } else {
            // Check Firestore for today's game
            const gameDayRef = doc(db, 'gameDays', today);
            const gameDaySnap = await getDoc(gameDayRef);
            
            if (gameDaySnap.exists()) {
                const gameData = gameDaySnap.data();
                if (gameData.status === 'ready') {
                    liveGame = { id: today, ...gameData };
                }
            }
            
            // Check for upcoming games (future dates with status 'ready')
            const gameDaysQuery = query(collection(db, 'gameDays'), where('status', '==', 'ready'));
            const querySnapshot = await getDocs(gameDaysQuery);
            
            querySnapshot.forEach((doc) => {
                const gameData = { id: doc.id, ...doc.data() };
                if (gameData.date > today) {
                    upcomingGames.push(gameData);
                }
            });
            
            // Sort upcoming games by date
            upcomingGames.sort((a, b) => new Date(a.date) - new Date(b.date));
        }
        
        // Show live game section
        if (liveGame) {
            showLiveGameSection(liveGame);
        } else {
            hideLiveGameSection();
        }
        
        // Show upcoming games section
        if (upcomingGames.length > 0) {
            showUpcomingGamesSection(upcomingGames);
        } else {
            hideUpcomingGamesSection();
        }
        
    } catch (error) {
        console.error('Error checking for live and upcoming games:', error);
        hideLiveGameSection();
        hideUpcomingGamesSection();
    }
}

function showLiveGameSection(liveGame) {
    const liveGamesSection = document.getElementById('live-games-section');
    const liveGameCard = document.getElementById('live-game-card');
    
    const dateFormatted = new Date(liveGame.date).toLocaleDateString('he-IL');
    const totalPlayers = liveGame.participants.length;
    const totalGames = liveGame.miniGames.length;
    
    liveGameCard.innerHTML = `
        <div class="live-game-info">
            <div class="live-game-date">${dateFormatted}</div>
        </div>
        <div class="live-game-details">
            <div class="live-detail-item">
                <div class="live-detail-label">שחקנים</div>
                <div class="live-detail-value">${totalPlayers}</div>
            </div>
            <div class="live-detail-item">
                <div class="live-detail-label">משחקים</div>
                <div class="live-detail-value">${totalGames}</div>
            </div>
            <div class="live-detail-item">
                <div class="live-detail-label">קבוצות</div>
                <div class="live-detail-value">3</div>
            </div>
        </div>
    `;
    
    liveGamesSection.classList.remove('hidden');
    
    // Store the live game data
    window.currentLiveGame = liveGame;
}

function hideLiveGameSection() {
    const liveGamesSection = document.getElementById('live-games-section');
    liveGamesSection.classList.add('hidden');
    window.currentLiveGame = null;
}

function showUpcomingGamesSection(upcomingGames) {
    const upcomingGamesSection = document.getElementById('upcoming-games-section');
    const upcomingGamesList = document.getElementById('upcoming-games-list');
    
    upcomingGamesList.innerHTML = '';
    
    upcomingGames.forEach(game => {
        const dateFormatted = new Date(game.date).toLocaleDateString('he-IL');
        const totalPlayers = game.participants.length;
        const totalGames = game.miniGames.length;
        
        const gameCard = document.createElement('div');
        gameCard.className = 'upcoming-game-card';
        gameCard.innerHTML = `
            <div class="upcoming-game-info">
                <div class="upcoming-game-date">${dateFormatted}</div>
                <div class="upcoming-game-actions">
                    <button class="edit-upcoming-btn" onclick="editUpcomingGame('${game.id}')">ערוך</button>
                    <button class="delete-upcoming-btn" onclick="deleteUpcomingGame('${game.id}', '${dateFormatted}')">מחק</button>
                </div>
            </div>
            <div class="upcoming-game-details">
                <div class="upcoming-detail-item">
                    <div class="upcoming-detail-label">שחקנים</div>
                    <div class="upcoming-detail-value">${totalPlayers}</div>
                </div>
                <div class="upcoming-detail-item">
                    <div class="upcoming-detail-label">משחקים</div>
                    <div class="upcoming-detail-value">${totalGames}</div>
                </div>
                <div class="upcoming-detail-item">
                    <div class="upcoming-detail-label">קבוצות</div>
                    <div class="upcoming-detail-value">3</div>
                </div>
            </div>
        `;
        
        upcomingGamesList.appendChild(gameCard);
    });
    
    upcomingGamesSection.classList.remove('hidden');
}

function hideUpcomingGamesSection() {
    const upcomingGamesSection = document.getElementById('upcoming-games-section');
    upcomingGamesSection.classList.add('hidden');
}

async function editUpcomingGame(gameId) {
    try {
        console.log('Editing upcoming game:', gameId);
        
        let gameData = null;
        
        if (DEMO_MODE) {
            // Demo mode - create demo game data with proper team assignments
            gameData = {
                id: gameId,
                date: gameId,
                participants: ['demo-player-1', 'demo-player-2', 'demo-player-3', 'demo-player-4', 'demo-player-5', 'demo-player-6', 'demo-player-7', 'demo-player-8', 'demo-player-9', 'demo-player-10', 'demo-player-11', 'demo-player-12', 'demo-player-13', 'demo-player-14', 'demo-player-15', 'demo-player-16', 'demo-player-17', 'demo-player-18', 'demo-player-19', 'demo-player-20', 'demo-player-21'],
                teams: { 
                    A: ['demo-player-1', 'demo-player-2', 'demo-player-3', 'demo-player-4', 'demo-player-5', 'demo-player-6', 'demo-player-7'], 
                    B: ['demo-player-8', 'demo-player-9', 'demo-player-10', 'demo-player-11', 'demo-player-12', 'demo-player-13', 'demo-player-14'], 
                    C: ['demo-player-15', 'demo-player-16', 'demo-player-17', 'demo-player-18', 'demo-player-19', 'demo-player-20', 'demo-player-21'] 
                },
                miniGames: [],
                status: 'ready'
            };
        } else {
            // Load from Firestore
            const gameDayRef = doc(db, 'gameDays', gameId);
            const gameDaySnap = await getDoc(gameDayRef);
            
            if (!gameDaySnap.exists()) {
                alert('ערב המשחק לא נמצא');
                return;
            }
            
            gameData = { id: gameId, ...gameDaySnap.data() };
        }
        
        // Set current game day data
        currentGameDay = gameData;
        selectedPlayers = gameData.participants || [];
        teams = gameData.teams || { A: [], B: [], C: [] };
        miniGames = gameData.miniGames || [];
        playerStats = gameData.playerStats || {};
        isEditMode = true;
        isEditingUpcomingGame = true;
        console.log('Edit mode set to true for upcoming game');
        
        // Load players if needed
        if (DEMO_MODE) {
            loadDemoPlayers();
        } else {
            await loadPlayers();
        }
        
        // Check if teams are already assigned
        const hasTeamAssignments = teams.A.length > 0 || teams.B.length > 0 || teams.C.length > 0;
        
        // Always go to step 3 (team assignment) when editing
        // Mark previous steps as completed
        completedSteps.add(1);
        completedSteps.add(2);
        
        // Go directly to step 3 (team assignment) and render the existing teams
        goToStep(3);
        
        // Set up navigation history for back button AFTER goToStep to avoid conflicts
        navigationHistory = [1]; // Clear and set to step 1 as the "home" to go back to
        updateBackButton();
        console.log('Navigation history set for upcoming game:', navigationHistory);
        
        showEditModeIndicator();
        renderTeamAssignmentForEditing();
        
        // Force update progress steps to reflect edit mode restrictions
        updateProgressSteps(3);
        
        console.log('Upcoming game loaded for editing');
        
    } catch (error) {
        console.error('Error loading upcoming game for editing:', error);
        alert('שגיאה בטעינת ערב המשחק: ' + error.message);
    }
}

async function deleteUpcomingGame(gameId, dateFormatted) {
    try {
        console.log('Deleting upcoming game:', gameId);
        
        // Ask for confirmation
        const confirmDelete = confirm(`האם אתה בטוח שברצונך למחוק את ערב המשחק מתאריך ${dateFormatted}?\n\nפעולה זו אינה ניתנת לביטול.`);
        
        if (!confirmDelete) {
            console.log('Delete cancelled by user');
            return;
        }
        
        if (DEMO_MODE) {
            console.log('Demo mode: Simulating upcoming game deletion');
            alert('מצב דמו: ערב המשחק נמחק בהצלחה');
        } else {
            // Check if game exists and get its data for stats reversal
            const gameDayRef = doc(db, 'gameDays', gameId);
            const gameDaySnap = await getDoc(gameDayRef);
            
            if (gameDaySnap.exists()) {
                const gameDayData = gameDaySnap.data();
                
                // Reverse stats if the game day has any player stats, regardless of status
                // This handles both completed games and draft games that had stats during editing
                if (gameDayData.playerStats && Object.keys(gameDayData.playerStats).length > 0) {
                    console.log('Reversing stats for upcoming game:', gameDayData.playerStats);
                    console.log('Game status:', gameDayData.status);
                    await reversePlayerStats(gameDayData.playerStats);
                }
                
                // Delete the game day document
                await deleteDoc(gameDayRef);
                console.log('Upcoming game deleted successfully');
                
                alert('ערב המשחק נמחק בהצלחה');
            } else {
                console.log('Game day not found, may have been already deleted');
                alert('ערב המשחק לא נמצא, ייתכן שכבר נמחק');
            }
        }
        
        // Refresh the upcoming games list
        await checkForLiveGames();
        
    } catch (error) {
        console.error('Error deleting upcoming game:', error);
        alert('שגיאה במחיקת ערב המשחק: ' + error.message);
    }
}

async function manageLiveGame() {
    if (!window.currentLiveGame) {
        alert('אין משחק חי זמין');
        return;
    }
    
    try {
        console.log('=== MANAGE LIVE GAME CLICKED ===');
        console.log('Loading live game for management:', window.currentLiveGame.id);
        console.log('Live game data:', window.currentLiveGame);
        
        // Set current game day data
        currentGameDay = window.currentLiveGame;
        selectedPlayers = window.currentLiveGame.participants;
        teams = window.currentLiveGame.teams;
        miniGames = window.currentLiveGame.miniGames || [];
        playerStats = window.currentLiveGame.playerStats || {};
        isEditMode = true;
        isEditingUpcomingGame = false; // This is a live game, not upcoming
        
        console.log('Mini games loaded:', miniGames);
        console.log('Number of mini games:', miniGames.length);
        
        // Log each game's details
        miniGames.forEach((game, index) => {
            console.log(`Game ${index + 1}:`, {
                teamAScore: game.teamAScore,
                teamBScore: game.teamBScore,
                teamA: game.teamA,
                teamB: game.teamB,
                hasScores: (game.teamAScore !== undefined && game.teamBScore !== undefined)
            });
        });
        
        console.log('Edit mode set to true for live game');
        
        // Load players if needed
        if (DEMO_MODE) {
            loadDemoPlayers();
        } else {
            await loadPlayers();
        }
        
        // Initialize player stats if not already done
        if (Object.keys(playerStats).length === 0) {
            console.log('Initializing player stats for live game...');
            selectedPlayers.forEach(playerId => {
                playerStats[playerId] = { goals: 0, assists: 0, wins: 0 };
            });
        }
        
        // Check if game night has started to determine navigation
        const gameNightStarted = hasGameNightStarted();
        console.log('=== NAVIGATION DECISION ===');
        console.log('Game night started?', gameNightStarted);
        
        if (gameNightStarted) {
            // Game has started - go directly to step 4, no access to step 3
            goToStep(4);
            navigationHistory = [1]; // Only allow going back to main dashboard
            console.log('Live game has started - restricted to step 4 only');
        } else {
            // Game hasn't started - go to step 4 but allow access to step 3
            goToStep(4);
            navigationHistory = [1]; // Always go back to main dashboard from live game
            console.log('Live game not started - allow step 3 and 4, but back goes to main dashboard');
        }
        
        updateBackButton();
        console.log('Navigation history set for live game:', navigationHistory);
        
        showEditModeIndicator();
        
        // Force update progress steps to reflect edit mode restrictions
        updateProgressSteps(4);
        
        // Render existing mini-games
        renderMiniGamesForEditing();
        
        // Recalculate stats from existing games
        recalculatePlayerStats();
        updateStatsDisplay();
        
        console.log('Live game loaded for management');
        console.log('Player stats after loading:', playerStats);
        
    } catch (error) {
        console.error('Error loading live game:', error);
        alert('שגיאה בטעינת המשחק החי: ' + error.message);
    }
}

// Auto-save function for live games
let autoSaveTimeout;
async function autoSaveLiveGame() {
    // Only auto-save if we're in a live game (has current live game)
    if (!window.currentLiveGame || DEMO_MODE) {
        return;
    }
    
    // Clear previous timeout
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    
    // Set a new timeout to save after 1 second of inactivity
    autoSaveTimeout = setTimeout(async () => {
        try {
            console.log('Auto-saving live game...');
            
            // Update the current game day data but keep it in 'ready' status (live mode)
            currentGameDay.miniGames = miniGames;
            currentGameDay.playerStats = playerStats;
            currentGameDay.status = 'ready'; // Keep in live mode
            
            // Save to Firestore (use setDoc with merge to create if doesn't exist)
            const gameDayRef = doc(db, 'gameDays', currentGameDay.date);
            await setDoc(gameDayRef, {
                ...currentGameDay,
                miniGames: miniGames,
                playerStats: playerStats,
                status: 'ready' // Ensure it stays in live mode
            }, { merge: true });
            
            console.log('Live game auto-saved successfully');
            
        } catch (error) {
            console.error('Error auto-saving live game:', error);
        }
    }, 1000);
}

// Show visual feedback when a game is saved
function showGameSavedFeedback(gameId) {
    const gameElement = document.querySelector(`[data-game-id="${gameId}"]`);
    const gameHeader = gameElement.querySelector('.mini-game-header h4');
    
    // Add saved indicator
    if (!gameHeader.querySelector('.saved-indicator')) {
        const savedIndicator = document.createElement('span');
        savedIndicator.className = 'saved-indicator';
        savedIndicator.innerHTML = ' ✅';
        savedIndicator.style.color = '#27ae60';
        savedIndicator.style.fontSize = '1.2em';
        gameHeader.appendChild(savedIndicator);
        
        // Remove the indicator after 3 seconds
        setTimeout(() => {
            if (savedIndicator.parentNode) {
                savedIndicator.remove();
            }
        }, 3000);
    }
}

// Make functions available globally
window.editGameDay = editGameDay;
window.viewGameDayDetails = viewGameDayDetails;
window.deleteGameDay = deleteGameDay;
window.checkForLiveGames = checkForLiveGames;
window.manageLiveGame = manageLiveGame;
window.editUpcomingGame = editUpcomingGame;
window.deleteUpcomingGame = deleteUpcomingGame;
window.autoSaveLiveGame = autoSaveLiveGame;
window.showGameSavedFeedback = showGameSavedFeedback;
window.toggleGameCollapse = toggleGameCollapse;
window.removeMiniGame = removeMiniGame;
window.adminGoBack = adminGoBack; 