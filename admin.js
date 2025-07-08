// Admin configuration
const AUTHORIZED_ADMIN_EMAIL = "tkafik@gmail.com"; // Authorized admin email
const DEMO_MODE = false; // Set to true to test without Firebase

// Status codes
const STATUS = {
    0: 'טיוטה',
    1: 'עתידי',
    2: 'חי',
    3: 'הושלם',
    4: 'לא הושלם'
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

// Firebase variables (will be loaded conditionally)
let db = null;
let auth = null;
let googleProvider = null;
let collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, increment, writeBatch, query, where, onSnapshot;
let signInWithPopup, onAuthStateChanged, signOut;

// Real-time listener management
let realtimeListeners = {
    players: null,
    gameDays: null,
    admins: null,
    subscriptions: null
};
let isSigningIn = false;

// Real-time data cache
let realtimeCache = {
    players: [],
    gameDays: [],
    admins: [],
    subscriptions: {},
    initialized: {
        players: false,
        gameDays: false,
        admins: false,
        subscriptions: false
    }
};

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
        auth = firebaseConfig.auth;
        googleProvider = firebaseConfig.googleProvider;
        
        const firestoreFunctions = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
        collection = firestoreFunctions.collection;
        doc = firestoreFunctions.doc;
        getDocs = firestoreFunctions.getDocs;
        getDoc = firestoreFunctions.getDoc;
        setDoc = firestoreFunctions.setDoc;
        addDoc = firestoreFunctions.addDoc;
        updateDoc = firestoreFunctions.updateDoc;
        deleteDoc = firestoreFunctions.deleteDoc;
        increment = firestoreFunctions.increment;
        writeBatch = firestoreFunctions.writeBatch;
        query = firestoreFunctions.query;
        where = firestoreFunctions.where;
        onSnapshot = firestoreFunctions.onSnapshot; // Added for real-time listeners
        
        // Load Firebase Auth functions
        const authFunctions = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
        signInWithPopup = authFunctions.signInWithPopup;
        onAuthStateChanged = authFunctions.onAuthStateChanged;
        signOut = authFunctions.signOut;
        
        console.log('✅ Firebase loaded successfully with real-time support');
    } catch (error) {
        console.error('Failed to load Firebase:', error);
        throw error;
    }
}

/**
 * Set up real-time listeners for all collections
 * This replaces the old caching system with live data updates
 */
function setupRealtimeListeners() {
    if (DEMO_MODE) {
        console.log('Demo mode: Using mock data instead of real-time listeners');
        setupDemoData();
        return;
    }
    
    console.log('🚀 Setting up real-time listeners for admin panel...');
    
    // Set up players listener
    setupPlayersRealtimeListener();
    
    // Set up game days listener
    setupGameDaysRealtimeListener();
    
    // Set up admins listener
    setupAdminsRealtimeListener();
    
    // Set up subscriptions listener
    setupSubscriptionsRealtimeListener();
}

/**
 * Set up real-time listener for players collection
 */
function setupPlayersRealtimeListener() {
    console.log('📡 Setting up real-time players listener...');
    
    const playersRef = collection(db, 'players');
    
    realtimeListeners.players = onSnapshot(playersRef, 
        (snapshot) => {
            console.log('👥 Players data updated in real-time');
            
            realtimeCache.players = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.name) {
                    realtimeCache.players.push({
                        id: doc.id,
                        name: data.name,
                        ...data
                    });
                }
            });
            
            realtimeCache.initialized.players = true;
            console.log(`✅ Real-time players cache updated: ${realtimeCache.players.length} players`);
            
            // Refresh any active player management UI
            refreshPlayerManagementUI();
            
        },
        (error) => {
            console.error('❌ Error in players real-time listener:', error);
        }
    );
}

/**
 * Set up real-time listener for gameDays collection
 */
function setupGameDaysRealtimeListener() {
    console.log('📡 Setting up real-time game days listener...');
    
    const gameDaysRef = collection(db, 'gameDays');
    
    realtimeListeners.gameDays = onSnapshot(gameDaysRef, 
        (snapshot) => {
            console.log('🎮 Game days data updated in real-time');
            
            realtimeCache.gameDays = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                realtimeCache.gameDays.push({
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
            
            realtimeCache.initialized.gameDays = true;
            console.log(`✅ Real-time game days cache updated: ${realtimeCache.gameDays.length} games`);
            
            // Refresh any active game management UI
            refreshGameManagementUI();
            
        },
        (error) => {
            console.error('❌ Error in game days real-time listener:', error);
        }
    );
}

/**
 * Set up real-time listener for admins collection
 */
function setupAdminsRealtimeListener() {
    console.log('📡 Setting up real-time admins listener...');
    
    const adminsRef = collection(db, 'admins');
    
    realtimeListeners.admins = onSnapshot(adminsRef, 
        (snapshot) => {
            console.log('👑 Admins data updated in real-time');
            
            realtimeCache.admins = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                realtimeCache.admins.push({
                    id: doc.id,
                    email: data.email,
                    role: data.role,
                    addedAt: data.addedAt,
                    addedBy: data.addedBy,
                    // Enhanced fields for user management
                    playerId: data.playerId || null,
                    playerName: data.playerName || null,
                    isRegistered: data.isRegistered || false,
                    registeredAt: data.registeredAt || null,
                    lastLoginAt: data.lastLoginAt || null
                });
            });
            
            realtimeCache.initialized.admins = true;
            console.log(`✅ Real-time admins cache updated: ${realtimeCache.admins.length} admins`);
            
            // Refresh any active admin management UI
            refreshAdminManagementUI();
            
        },
        (error) => {
            console.error('❌ Error in admins real-time listener:', error);
        }
    );
}

/**
 * Set up real-time listener for subscriptions collection
 */
function setupSubscriptionsRealtimeListener() {
    console.log('📡 Setting up real-time subscriptions listener...');
    
    const subscriptionsRef = collection(db, 'subscriptions');
    
    realtimeListeners.subscriptions = onSnapshot(subscriptionsRef, 
        (snapshot) => {
            console.log('📅 Subscriptions data updated in real-time');
            
            realtimeCache.subscriptions = {};
            snapshot.forEach((doc) => {
                const data = doc.data();
                realtimeCache.subscriptions[doc.id] = {
                    id: doc.id,
                    playerIds: data.playerIds || [],
                    ...data
                };
            });
            
            realtimeCache.initialized.subscriptions = true;
            console.log(`✅ Real-time subscriptions cache updated: ${Object.keys(realtimeCache.subscriptions).length} subscriptions`);
            
            // Refresh any active subscription management UI
            refreshSubscriptionManagementUI();
            
        },
        (error) => {
            console.error('❌ Error in subscriptions real-time listener:', error);
        }
    );
}

/**
 * Set up demo data for testing without Firebase
 */
function setupDemoData() {
    console.log('📝 Setting up demo data...');
    
    // Demo players
    realtimeCache.players = Array.from({length: 25}, (_, i) => ({
        id: `demo-player-${i + 1}`,
        name: `שחקן ${i + 1}`
    }));
    
    // Demo game days
    const today = getTodayIsrael();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    realtimeCache.gameDays = [
        {
            id: today,
            date: today,
            participants: Array.from({length: 21}, (_, i) => `demo-player-${i + 1}`),
            teams: { A: [], B: [], C: [] },
            miniGames: [{}, {}, {}],
            status: 2,
            playerStats: {}
        },
        {
            id: yesterday.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' }),
            date: yesterday.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' }),
            participants: Array.from({length: 21}, (_, i) => `demo-player-${i + 1}`),
            teams: { A: [], B: [], C: [] },
            miniGames: [{}, {}, {}],
            status: 4,
            playerStats: {}
        }
    ];
    
    // Demo admins
    realtimeCache.admins = [
        {
            id: 'demo-admin-1',
            email: 'admin@example.com',
            role: 'super-admin',
            addedAt: new Date(),
            addedBy: 'system'
        }
    ];
    
    // Demo subscriptions
    realtimeCache.subscriptions = {
        'sunday': {
            id: 'sunday',
            playerIds: Array.from({length: 15}, (_, i) => `demo-player-${i + 1}`)
        },
        'tuesday': {
            id: 'tuesday',
            playerIds: Array.from({length: 18}, (_, i) => `demo-player-${i + 3}`)
        }
    };
    
    // Mark all as initialized
    Object.keys(realtimeCache.initialized).forEach(key => {
        realtimeCache.initialized[key] = true;
    });
    
    console.log('✅ Demo data initialized');
}

/**
 * Clean up all real-time listeners
 */
function cleanupRealtimeListeners() {
    console.log('🧹 Cleaning up real-time listeners...');
    
    Object.entries(realtimeListeners).forEach(([key, unsubscribe]) => {
        if (unsubscribe) {
            unsubscribe();
            realtimeListeners[key] = null;
        }
    });
}

/**
 * Get players from real-time cache
 */
function getPlayersFromCache() {
    return realtimeCache.players;
}

/**
 * Get game days from real-time cache
 */
function getGameDaysFromCache() {
    return realtimeCache.gameDays;
}

/**
 * Get admins from real-time cache
 */
function getAdminsFromCache() {
    return realtimeCache.admins;
}

/**
 * Get subscriptions from real-time cache
 */
function getSubscriptionsFromCache() {
    return realtimeCache.subscriptions;
}

/**
 * Wait for specific cache to be initialized
 */
function waitForCacheInitialization(cacheType) {
    return new Promise((resolve) => {
        const checkInit = () => {
            if (realtimeCache.initialized[cacheType]) {
                resolve();
            } else {
                setTimeout(checkInit, 100);
            }
        };
        checkInit();
    });
}

/**
 * Refresh player management UI when data changes
 */
function refreshPlayerManagementUI() {
    const currentTab = document.querySelector('.admin-tab.active');
    if (currentTab && currentTab.dataset.tab === 'player-management') {
        console.log('🔄 Refreshing player management UI with real-time data');
        renderPlayersList();
    }
}

/**
 * Refresh game management UI when data changes
 */
function refreshGameManagementUI() {
    const currentTab = document.querySelector('.admin-tab.active');
    if (currentTab && currentTab.dataset.tab === 'game-management') {
        console.log('🔄 Refreshing game management UI with real-time data');
        loadAllGamesForManagement();
    }
}

/**
 * Refresh admin management UI when data changes
 */
function refreshAdminManagementUI() {
    const currentTab = document.querySelector('.admin-tab.active');
    if (currentTab && currentTab.dataset.tab === 'admin-management') {
        console.log('🔄 Refreshing admin management UI with real-time data');
        renderAdminsList();
    }
}

/**
 * Refresh subscription management UI when data changes
 */
function refreshSubscriptionManagementUI() {
    const currentTab = document.querySelector('.admin-tab.active');
    if (currentTab && currentTab.dataset.tab === 'subscription-management') {
        console.log('🔄 Refreshing subscription management UI with real-time data');
        renderSubscriptionDaysOverview();
    }
}

// Utility function to get today's date in Israeli timezone
function getTodayIsrael() {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' });
}

// Real-time function to load all games from cache
async function loadAllGamesFromCache() {
    console.log('📦 Loading games from real-time cache...');
    
    if (!realtimeCache.initialized.gameDays) {
        await waitForCacheInitialization('gameDays');
    }
    
    return getGameDaysFromCache();
}

// Function to update expired live games to "not completed" status
async function updateExpiredLiveGames() {
    // Prevent multiple simultaneous updates
    if (isUpdatingExpiredGames) {
        console.log('Already updating expired games, skipping...');
        return;
    }
    
    const today = getTodayIsrael();
    
    if (DEMO_MODE) {
        console.log('Demo mode: Skipping expired live games update');
        return;
    }
    
    isUpdatingExpiredGames = true;
    
    try {
        // Use real-time cached data to check for expired games
        const allGames = await loadAllGamesFromCache();
        
        const batch = writeBatch(db);
        let updatedCount = 0;
        
        allGames.forEach((game) => {
            const gameDate = game.date;
            const gameStatus = game.status;
            
            console.log(`Checking game ${game.id}: date=${gameDate}, status=${gameStatus}, today=${today}`);
            
            // If game is live (status 2) and date is before today, mark as not completed
            if (gameStatus === 2 && gameDate < today) {
                const gameRef = doc(db, 'gameDays', game.id);
                batch.update(gameRef, { status: 4 }); // 4 = not completed
                updatedCount++;
                console.log(`Marking game ${game.id} (${gameDate}) as not completed - was status ${gameStatus}`);
                
                // Update cache immediately
                game.status = 4;
            }
        });
        
        if (updatedCount > 0) {
            await batch.commit();
            console.log(`Updated ${updatedCount} expired live games to "not completed" status`);
            // Invalidate cache after updates
            gamesCache.timestamp = 0;
        } else {
            console.log('No expired live games found to update');
        }
        
    } catch (error) {
        console.error('Error updating expired live games:', error);
    } finally {
        isUpdatingExpiredGames = false;
    }
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
const playerSelectionSection = document.getElementById('player-selection-section');
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
        
        // Set up real-time listeners for all collections
        setupRealtimeListeners();
        
        // Set up cleanup for real-time listeners
        window.addEventListener('beforeunload', cleanupRealtimeListeners);
        
        // Set up authentication state monitoring
        setupAuthStateMonitoring();
        
        // Set up tab switching for player data tab
        setupPlayerDataTab();
        
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

// Set up player data tab functionality (now handled by main tab switching)
function setupPlayerDataTab() {
    // Player data tab is now handled by the main switchToTab function
    console.log('Player data tab setup complete');
}

// Load player data for the current user
async function loadPlayerData() {
    try {
        console.log('Loading player data for current user...');
        
        // Get current user info
        const user = auth.currentUser;
        if (!user) {
            console.log('No authenticated user found');
            return;
        }
        
        // Get user record from cache
        const allAdmins = await loadAllAdminsFromCache();
        const userRecord = allAdmins.find(admin => admin.email === user.email);
        
        if (!userRecord) {
            console.log('User record not found');
            return;
        }
        
        // Update profile display
        updatePlayerProfileDisplay(userRecord);
        
        // Load player statistics if user is associated with a player
        if (userRecord.playerId) {
            await loadPlayerStatistics(userRecord.playerId);
            await loadRecentGames(userRecord.playerId);
        } else {
            showUnregisteredPlayerMessage();
        }
        
    } catch (error) {
        console.error('Error loading player data:', error);
    }
}

// Update player profile display
function updatePlayerProfileDisplay(userRecord) {
    const playerNameDisplay = document.getElementById('player-name-display');
    const playerEmailDisplay = document.getElementById('player-email-display');
    const registrationStatus = document.getElementById('registration-status');
    
    if (playerNameDisplay) {
        playerNameDisplay.textContent = userRecord.playerName || 'לא משויך לשחקן';
    }
    
    if (playerEmailDisplay) {
        playerEmailDisplay.textContent = userRecord.email;
    }
    
    if (registrationStatus) {
        if (userRecord.isRegistered) {
            registrationStatus.textContent = 'רשום';
            registrationStatus.className = 'status-badge registered';
        } else {
            registrationStatus.textContent = 'לא רשום';
            registrationStatus.className = 'status-badge not-registered';
        }
    }
}

// Load player statistics
async function loadPlayerStatistics(playerId) {
    try {
        // Get player data from cache
        const allPlayers = await loadAllPlayersFromCache();
        const player = allPlayers.find(p => p.id === playerId);
        
        if (!player) {
            console.log('Player not found:', playerId);
            return;
        }
        
        // Update statistics display
        const totalGames = document.getElementById('total-games');
        const totalGoals = document.getElementById('total-goals');
        const totalWins = document.getElementById('total-wins');
        const winRate = document.getElementById('win-rate');
        
        if (totalGames) totalGames.textContent = player.gameNights || 0;
        if (totalGoals) totalGoals.textContent = player.goals || 0;
        if (totalWins) totalWins.textContent = player.wins || 0;
        
        if (winRate) {
            const rate = player.gameNights > 0 ? Math.round((player.wins / player.gameNights) * 100) : 0;
            winRate.textContent = `${rate}%`;
        }
        
    } catch (error) {
        console.error('Error loading player statistics:', error);
    }
}

// Load recent games for player
async function loadRecentGames(playerId) {
    try {
        const recentGamesList = document.getElementById('recent-games-list');
        if (!recentGamesList) return;
        
        // Get game days from cache
        const allGameDays = await loadAllGameDaysFromCache();
        
        // Filter games where player participated
        const playerGames = allGameDays
            .filter(game => game.participants && game.participants.includes(playerId))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5); // Show last 5 games
        
        if (playerGames.length === 0) {
            recentGamesList.innerHTML = '<div class="no-games-message">אין משחקים להצגה</div>';
            return;
        }
        
        // Create game cards
        const gamesHTML = playerGames.map(game => createGameCard(game)).join('');
        recentGamesList.innerHTML = gamesHTML;
        
    } catch (error) {
        console.error('Error loading recent games:', error);
    }
}

// Create game card for recent games
function createGameCard(game) {
    const gameDate = new Date(game.date).toLocaleDateString('he-IL');
    const statusText = STATUS[game.status] || 'לא ידוע';
    
    return `
        <div class="recent-game-card">
            <div class="game-date">${gameDate}</div>
            <div class="game-status">${statusText}</div>
            <div class="game-participants">${game.participants ? game.participants.length : 0} משתתפים</div>
        </div>
    `;
}

// Show message for unregistered players
function showUnregisteredPlayerMessage() {
    const recentGamesList = document.getElementById('recent-games-list');
    if (recentGamesList) {
        recentGamesList.innerHTML = `
            <div class="unregistered-message">
                <p>עליך להירשם ולשייך את עצמך לשחקן כדי לראות את הנתונים שלך</p>
                <button class="primary-btn" onclick="showPlayerSelection()">בחר שחקן</button>
            </div>
        `;
    }
    
    // Clear statistics
    const statsElements = ['total-games', 'total-goals', 'total-wins', 'win-rate'];
    statsElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = '-';
    });
}

// Show player selection (placeholder for Phase 3)
function showPlayerSelection() {
    alert('בחירת שחקן תהיה זמינה בשלב הבא של הפיתוח');
}

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
        
        // Add retroactive fields to existing players (run once on startup)
        if (!DEMO_MODE) {
            addRetroactiveFieldsToPlayers().catch(error => {
                console.error('Error adding retroactive fields on startup:', error);
            });
        }
        
        // Check for edit parameter in URL after authentication
        setTimeout(() => {
            checkForEditParameter();
        }, 1000);
        
        console.log('Admin app initialized successfully');
    } catch (error) {
        console.error('Error initializing admin app:', error);
        alert('שגיאה בטעינת האפליקציה: ' + error.message);
    }
}

function setupEventListeners() {
    try {
        // Note: Auth form is now handled by Google SSO, no form submission needed
        
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
        
        // Browser navigation/close protection
        setupBrowserNavigationProtection();
        
        // Protect external navigation links
        setupExternalNavigationProtection();
        
        // Admin tab navigation
        setupAdminTabNavigation();
        
        // Dashboard create button
        setupDashboardCreateButton();
        
        console.log('Event listeners set up successfully');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        throw error;
    }
}

// Admin Tab Navigation Functions
function setupAdminTabNavigation() {
    const adminTabs = document.querySelectorAll('.admin-tab');
    adminTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetTab = e.currentTarget.dataset.tab;
            switchToTab(targetTab);
        });
    });
}

function setupRoleBasedTabVisibility() {
    console.log('Setting up role-based visibility. Current user role:', currentUserRole);

    // If role is not set yet, retry after a short delay
    if (!currentUserRole || currentUserRole === '') {
        console.log('Role not set yet, retrying in 200ms...');
        setTimeout(() => {
            setupRoleBasedTabVisibility();
        }, 200);
        return;
    }

    // Update the admin-label badge to reflect the current user's role
    const adminLabelElement = document.getElementById('admin-label');
    if (adminLabelElement) {
        let badgeText = 'משתמש';
        if (currentUserRole === 'super-admin') {
            badgeText = 'מנהל על';
        } else if (currentUserRole === 'admin') {
            badgeText = 'מנהל';
        }
        adminLabelElement.textContent = badgeText;
    }

    // Get all tab elements
    const allTabs = document.querySelectorAll('.admin-tab');
    const adminManagementTab = document.querySelector('[data-tab="admin-management"]');
    const dashboardTab = document.querySelector('[data-tab="dashboard"]');
    const adminTabsContainer = document.querySelector('.admin-tabs-container');

    switch (currentUserRole) {
        case 'super-admin':
            // Super-admin sees everything - show all tabs
            allTabs.forEach(tab => {
                tab.style.display = 'block';
                tab.classList.remove('hidden');
            });
            if (adminTabsContainer) {
                adminTabsContainer.style.display = 'block';
                adminTabsContainer.classList.remove('hidden');
            }
            console.log('Super-admin: All tabs visible');
            break;
        case 'admin':
            // Admin sees everything except admin management
            allTabs.forEach(tab => {
                if (tab === adminManagementTab) {
                    tab.style.display = 'none';
                    tab.classList.add('hidden');
                } else {
                    tab.style.display = 'block';
                    tab.classList.remove('hidden');
                }
            });
            if (adminTabsContainer) {
                adminTabsContainer.style.display = 'block';
                adminTabsContainer.classList.remove('hidden');
            }
            console.log('Admin: Admin management hidden, other tabs visible');
            break;
        case 'user':
            // User sees only dashboard and no tab navigation
            allTabs.forEach(tab => {
                if (tab === dashboardTab) {
                    tab.style.display = 'block';
                    tab.classList.remove('hidden');
                } else {
                    tab.style.display = 'none';
                    tab.classList.add('hidden');
                }
            });
            // Hide the entire tab navigation for users
            if (adminTabsContainer) {
                adminTabsContainer.style.display = 'none';
                adminTabsContainer.classList.add('hidden');
            }
            console.log('User: Only dashboard visible, tab navigation hidden');
            break;
        default:
            console.log('Unknown role:', currentUserRole);
            break;
    }
}

// Setup UI elements based on user role
function setupUserRoleBasedUI() {
    if (currentUserRole === 'user') {
        // Hide create new game section for users
        const createGameSection = document.querySelector('.dashboard-create-section');
        if (createGameSection) {
            createGameSection.style.display = 'none';
            createGameSection.classList.add('hidden');
        }
        
        // Add "no live game" message if no live games exist
        checkAndShowNoLiveGameMessage();
    }
}

// Check if there are live games and show appropriate message for users
function checkAndShowNoLiveGameMessage() {
    if (currentUserRole !== 'user') return;
    
    const liveGamesSection = document.getElementById('live-games-section');
    const noLiveGameMessage = document.getElementById('no-live-game-message');
    
    // Remove existing message if it exists
    if (noLiveGameMessage) {
        noLiveGameMessage.remove();
    }
    
    // If no live games are shown, add a message
    if (!liveGamesSection || liveGamesSection.classList.contains('hidden')) {
        const dashboardTab = document.getElementById('dashboard-tab');
        if (dashboardTab) {
            const messageDiv = document.createElement('div');
            messageDiv.id = 'no-live-game-message';
            messageDiv.className = 'no-live-game-message';
            messageDiv.innerHTML = `
                <div class="message-content">
                    <h3>אין משחק חי כרגע</h3>
                    <p>כרגע אין משחק חי לניהול. אנא בדוק מאוחר יותר או פנה למנהל המערכת.</p>
                </div>
            `;
            
            // Insert after the dashboard title
            const dashboardTitle = dashboardTab.querySelector('h2');
            if (dashboardTitle) {
                dashboardTitle.parentNode.insertBefore(messageDiv, dashboardTitle.nextSibling);
            }
        }
    }
}

function switchToTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Update active tab
    const allTabs = document.querySelectorAll('.admin-tab');
    const allPanels = document.querySelectorAll('.tab-panel');
    
    allTabs.forEach(tab => tab.classList.remove('active'));
    allPanels.forEach(panel => {
        panel.classList.remove('active');
        panel.classList.add('hidden');
    });
    
    // Activate selected tab and panel
    const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
    const selectedPanel = document.getElementById(`${tabName}-tab`);
    
    if (selectedTab) selectedTab.classList.add('active');
    if (selectedPanel) {
        selectedPanel.classList.remove('hidden');
        selectedPanel.classList.add('active');
        console.log('Activated panel:', selectedPanel.id);
    }
    
    // Make sure admin management is properly hidden when switching away from it
    if (tabName !== 'admin-management') {
        const adminManagementPanel = document.getElementById('admin-management-tab');
        if (adminManagementPanel) {
            adminManagementPanel.classList.add('hidden');
            adminManagementPanel.classList.remove('active');
            console.log('Explicitly hiding admin management panel');
        }
    }
    
    // Handle special tab logic
    if (tabName === 'game-management') {
        // Show game management main view, hide creation workflow
        showGameManagementMain();
        // Load games for management view (cache will handle optimization)
        loadAllGamesForManagement();
    } else if (tabName === 'dashboard') {
        // Refresh live games when returning to dashboard
        checkForLiveGames().catch(error => {
            console.error('Error checking for live games:', error);
        });
    } else if (tabName === 'subscription-management') {
        // Initialize subscription management
        initializeSubscriptionManagement();
    } else if (tabName === 'player-management') {
        // Initialize player management
        initializePlayerManagement();
    } else if (tabName === 'admin-management') {
        // Initialize admin management
        initializeAdminManagement();
    } else if (tabName === 'player-data') {
        // Load player data for current user
        loadPlayerData();
    }
}

function setupDashboardCreateButton() {
    // Dashboard create game button
    const dashboardCreateBtn = document.getElementById('dashboard-create-gameday-btn');
    
    if (dashboardCreateBtn) {
        dashboardCreateBtn.addEventListener('click', createGameDayFromDashboard);
    }
}

// Create game day from dashboard
async function createGameDayFromDashboard() {
    const gameDate = document.getElementById('dashboard-game-date').value;
    if (!gameDate) {
        alert('אנא בחר תאריך');
        return;
    }
    
    // Check if date already has a game
    const existingDates = window.existingGameDates || [];
    if (existingDates.includes(gameDate)) {
        alert('קיים כבר ערב משחק בתאריך זה. אנא בחר תאריך אחר.');
        return;
    }
    
    // Switch to game management tab
    switchToTab('game-management');
    
    // Set the date in the game management form
    const gameManagementDateInput = document.getElementById('game-date');
    if (gameManagementDateInput) {
        gameManagementDateInput.value = gameDate;
    }
    
    // Show progress container and hide main view
    const progressContainer = document.getElementById('game-progress-container');
    const gameManagementMain = document.getElementById('game-management-main');
    
    if (progressContainer) progressContainer.classList.remove('hidden');
    if (gameManagementMain) gameManagementMain.classList.add('hidden');
    
    // Check for subscriptions for this day
    const dayOfWeek = getDayOfWeekFromDate(gameDate);
    const subscription = await checkSubscriptionExists(dayOfWeek);
    
    if (subscription && subscription.playerIds && subscription.playerIds.length === 21) {
        // Show subscription confirmation popup
        const useSubscription = await showSubscriptionConfirmationPopup(dayOfWeek, subscription.playerIds.length);
        
        if (useSubscription) {
            // Load subscription players and jump to step 3
            await loadSubscriptionAndJumpToTeams(gameDate, subscription.playerIds);
            return;
        }
    }
    
    // Continue with normal flow (no subscription or user chose manual selection)
    await createGameDayNormal(gameDate);
}

function showGameManagementMain() {
    // Hide all creation workflow steps
    const allSteps = document.querySelectorAll('.admin-step');
    allSteps.forEach(step => {
        step.classList.add('hidden');
        step.classList.remove('active');
    });
    
    // Show main game management view
    const gameManagementMain = document.getElementById('game-management-main');
    if (gameManagementMain) {
        gameManagementMain.classList.remove('hidden');
    }
    
    // Hide progress container
    const progressContainer = document.getElementById('game-progress-container');
    if (progressContainer) {
        progressContainer.classList.add('hidden');
    }
}

// Load all games for management view
async function loadAllGamesForManagement() {
    try {
        console.log('Loading all games for management view...');
        
        let allGames = [];
        
        if (DEMO_MODE) {
            // Demo mode - create sample games
            const today = getTodayIsrael();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfter = new Date();
            dayAfter.setDate(dayAfter.getDate() + 3);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            
            allGames = [
                // Live game
                {
                    id: today,
                    date: today,
                    participants: Array.from({length: 21}, (_, i) => `demo-player-${i + 1}`),
                    teams: { A: [], B: [], C: [] },
                    miniGames: [],
                    status: 2,
                    playerStats: {}
                },
                // Upcoming games
                {
                    id: tomorrow.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' }),
                    date: tomorrow.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' }),
                    participants: Array.from({length: 21}, (_, i) => `demo-player-${i + 1}`),
                    teams: { A: [], B: [], C: [] },
                    miniGames: [],
                    status: 1,
                    playerStats: {}
                },
                {
                    id: dayAfter.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' }),
                    date: dayAfter.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' }),
                    participants: Array.from({length: 21}, (_, i) => `demo-player-${i + 1}`),
                    teams: { A: [], B: [], C: [] },
                    miniGames: [],
                    status: 1,
                    playerStats: {}
                },
                // Draft games
                {
                    id: 'draft-1',
                    date: tomorrow.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' }),
                    participants: Array.from({length: 15}, (_, i) => `demo-player-${i + 1}`),
                    teams: { A: [], B: [], C: [] },
                    miniGames: [],
                    status: 0,
                    playerStats: {}
                },
                // Not completed games
                {
                    id: yesterday.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' }),
                    date: yesterday.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' }),
                    participants: Array.from({length: 21}, (_, i) => `demo-player-${i + 1}`),
                    teams: { A: [], B: [], C: [] },
                    miniGames: [],
                    status: 4,
                    playerStats: {}
                },
                // Past games
                {
                    id: twoDaysAgo.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' }),
                    date: twoDaysAgo.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' }),
                    participants: Array.from({length: 21}, (_, i) => `demo-player-${i + 1}`),
                    teams: { A: [], B: [], C: [] },
                    miniGames: [{}, {}, {}],
                    status: 3,
                    playerStats: {}
                },
                {
                    id: twoDaysAgo.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' }),
                    date: twoDaysAgo.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' }),
                    participants: Array.from({length: 21}, (_, i) => `demo-player-${i + 1}`),
                    teams: { A: [], B: [], C: [] },
                    miniGames: [{}, {}],
                    status: 3,
                    playerStats: {}
                },
                {
                    id: threeDaysAgo.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' }),
                    date: threeDaysAgo.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' }),
                    participants: Array.from({length: 21}, (_, i) => `demo-player-${i + 1}`),
                    teams: { A: [], B: [], C: [] },
                    miniGames: [{}],
                    status: 3,
                    playerStats: {}
                }
            ];
        } else {
            // Use cached data instead of fresh database read
            allGames = await loadAllGamesFromCache();
        }
        
        // Sort games by date (newest first)
        allGames.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Categorize games
        const today = getTodayIsrael();
        const liveGames = allGames.filter(game => game.status === 2);
        const upcomingGames = allGames.filter(game => game.status === 1 && game.date >= today);
        const draftGames = allGames.filter(game => game.status === 0);
        const notCompletedGames = allGames.filter(game => game.status === 4);
        const pastGames = allGames.filter(game => game.status === 3 || (game.status === 1 && game.date < today));
        
        // Render each category
        renderManagementGamesSection('mgmt-live-games', liveGames, 'live');
        renderManagementGamesSection('mgmt-upcoming-games', upcomingGames, 'upcoming');
        renderManagementGamesSection('mgmt-draft-games', draftGames, 'draft');
        renderManagementGamesSection('mgmt-not-completed-games', notCompletedGames, 'not-completed');
        renderManagementGamesSection('mgmt-past-games', pastGames, 'completed');
        
    } catch (error) {
        console.error('Error loading games for management:', error);
    }
}

// Render games section for management view
function renderManagementGamesSection(sectionPrefix, games, statusType) {
    const section = document.getElementById(`${sectionPrefix}-section`);
    const list = document.getElementById(`${sectionPrefix}-list`);
    
    if (!section || !list) return;
    
    if (games.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    
    let html = '';
    games.forEach(game => {
        const dateFormatted = new Date(game.date).toLocaleDateString('he-IL');
        const totalGames = game.miniGames ? game.miniGames.length : 0;
        const totalPlayers = game.participants ? game.participants.length : 0;
        
        // Get status text and class
        let statusText, statusClass;
        switch (game.status) {
            case 0:
                statusText = 'טיוטה';
                statusClass = 'draft';
                break;
            case 1:
                statusText = 'עתידי';
                statusClass = 'upcoming';
                break;
            case 2:
                statusText = 'חי';
                statusClass = 'live';
                break;
            case 3:
                statusText = 'הושלם';
                statusClass = 'completed';
                break;
            case 4:
                statusText = 'לא הושלם';
                statusClass = 'not-completed';
                break;
            default:
                statusText = 'לא ידוע';
                statusClass = 'draft';
        }
        
        // Determine available actions based on status
        let actionsHtml = '';
        if (game.status === 0) { // Draft
            actionsHtml = `
                <button class="continue-btn" onclick="continueDraft('${game.id}')">המשך יצירה</button>
                <button class="edit-btn" onclick="editGameDay('${game.id}')">ערוך</button>
                <button class="delete-btn" onclick="deleteGameDay('${game.id}', '${dateFormatted}')">מחק</button>
            `;
        } else if (game.status === 1) { // Upcoming
            actionsHtml = `
                <button class="edit-btn" onclick="editUpcomingGame('${game.id}')">ערוך</button>
                <button class="view-btn" onclick="viewGameDayDetails('${game.id}')">צפה</button>
                <button class="delete-btn" onclick="deleteUpcomingGame('${game.id}', '${dateFormatted}')">מחק</button>
            `;
        } else if (game.status === 2) { // Live
            actionsHtml = `
                <button class="edit-btn" onclick="manageLiveGame()">נהל משחק</button>
                <button class="view-btn" onclick="viewGameDayDetails('${game.id}')">צפה</button>
            `;
        } else if (game.status === 3) { // Completed
            // Only super-admin can edit completed games
            if (currentUserRole === 'super-admin') {
                actionsHtml = `
                    <button class="edit-btn" onclick="editGameDay('${game.id}')">ערוך</button>
                    <button class="view-btn" onclick="viewGameDayDetails('${game.id}')">צפה</button>
                    <button class="delete-btn" onclick="deleteGameDay('${game.id}', '${dateFormatted}')">מחק</button>
                `;
            } else {
                actionsHtml = `
                    <button class="view-btn" onclick="viewGameDayDetails('${game.id}')">צפה</button>
                `;
            }
        } else if (game.status === 4) { // Not Completed
            actionsHtml = `
                <button class="edit-btn" onclick="editGameDay('${game.id}')">השלם משחק</button>
                <button class="view-btn" onclick="viewGameDayDetails('${game.id}')">צפה</button>
                <button class="delete-btn" onclick="deleteGameDay('${game.id}', '${dateFormatted}')">מחק</button>
            `;
        } else { // Completed
            actionsHtml = `
                <button class="view-btn" onclick="viewGameDayDetails('${game.id}')">צפה</button>
                <button class="delete-btn" onclick="deleteGameDay('${game.id}', '${dateFormatted}')">מחק</button>
            `;
        }
        
        html += `
            <div class="game-item" data-game-id="${game.id}">
                <div class="game-item-header">
                    <div class="game-item-date">${dateFormatted}</div>
                    <span class="game-status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="game-item-details">
                    <div class="game-detail-item">
                        <span class="game-detail-label">שחקנים:</span>
                        <span class="game-detail-value">${totalPlayers}</span>
                    </div>
                    <div class="game-detail-item">
                        <span class="game-detail-label">משחקים:</span>
                        <span class="game-detail-value">${totalGames}</span>
                    </div>
                    <div class="game-detail-item">
                        <span class="game-detail-label">קבוצות:</span>
                        <span class="game-detail-value">${game.teams ? Object.keys(game.teams).length : 0}</span>
                    </div>
                </div>
                <div class="game-item-actions">
                    ${actionsHtml}
                </div>
            </div>
        `;
    });
    
    if (html === '') {
        html = '<div class="no-games-message">אין משחקים להצגה</div>';
    }
    
    list.innerHTML = html;
}

function setTodayAsDefault() {
    const today = getTodayIsrael();
    const gameDateInput = document.getElementById('game-date');
    if (gameDateInput) {
        gameDateInput.value = today;
        gameDateInput.min = today; // Prevent selecting past dates
    }
}

function setTodayAsDefaultForDashboard() {
    const today = getTodayIsrael();
    const dashboardDateInput = document.getElementById('dashboard-game-date');
    if (dashboardDateInput) {
        dashboardDateInput.value = today;
        dashboardDateInput.min = today; // Prevent selecting past dates
    }
}

// Set up authentication state monitoring
function setupAuthStateMonitoring() {
    if (DEMO_MODE || !auth) {
        console.log('Demo mode or no auth - showing admin interface directly');
        showAdminInterface();
        return;
    }
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log('Auth state listener: User detected ->', user.email);
            const isAuthorized = await isAuthorizedUser(user.email);

            if (isAuthorized) {
                console.log('Auth state listener: User is authorized. Showing interface.');
                showAdminInterface(user);
            } else {
                // New user: add to DB as 'user' and let in
                try {
                    await registerNewUser(user.email); // This should add them to Firestore as role: 'user'
                    showSuccessToast('נרשמת בהצלחה', 'ברוך הבא למערכת!');
                    showAdminInterface(user);
                } catch (e) {
                    showErrorToast('שגיאת הרשמה', 'לא ניתן לרשום משתמש חדש. אנא נסה שנית.');
                    await signOut(auth);
                    showLoginInterface();
                }
            }
        } else {
            console.log('Auth state listener: No user logged in. Showing login interface.');
            showLoginInterface();
        }
    });
    
    // Monitor authentication state
    // onAuthStateChanged(auth, async (user) => {
    //     if (user) {
    //         const isAuthorized = await isAuthorizedAdmin(user.email);
    //         if (isAuthorized) {
    //             console.log('Authorized admin logged in:', user.email, 'Role:', currentUserRole);
    //             showAdminInterface(user);
    //         } else {
    //             console.log('User not authorized:', user.email);
    //             // Sign out unauthorized user
    //             await signOut(auth);
    //             showLoginInterface();
    //             showErrorToast('גישה נדחתה', 'אינך מורשה לגשת לממשק הניהול');
    //         }
    //     } else {
    //         console.log('User not logged in');
    //         showLoginInterface();
    //     }
    // });
}

// Real-time function to load all admins from cache
async function loadAllAdminsFromCache() {
    console.log('📦 Loading admins from real-time cache...');
    
    if (!realtimeCache.initialized.admins) {
        await waitForCacheInitialization('admins');
    }
    
    return getAdminsFromCache();
}

// Check if user is authorized and get their role
async function isAuthorizedUser(email) {
    if (DEMO_MODE) {
        // In demo mode, assign different roles based on email
        if (email === AUTHORIZED_ADMIN_EMAIL) {
            currentUserRole = 'super-admin';
            window.currentUserRole = currentUserRole;
        } else if (email === 'regular@example.com') {
            currentUserRole = 'admin';
            window.currentUserRole = currentUserRole;
        } else if (email === 'user@example.com') {
            currentUserRole = 'user';
            window.currentUserRole = currentUserRole;
        } else {
            currentUserRole = 'user'; // Default to user for any other email
            window.currentUserRole = currentUserRole;
        }
        
        // Update role-based visibility after setting the role
        setTimeout(() => {
            setupRoleBasedTabVisibility();
        }, 50);
        
        return true;
    }
    
    try {
        // Use cached admin data
        const allAdmins = await loadAllAdminsFromCache();
        console.log('All users from cache:', allAdmins);
        const userRecord = allAdmins.find(admin => admin.email === email);
        console.log('User record for', email, ':', userRecord);
        
        if (userRecord) {
            currentUserRole = userRecord.role;
            window.currentUserRole = currentUserRole;
            console.log('Set currentUserRole to:', currentUserRole);
            
            // Update last login time
            await updateLastLoginTime(email);
            
            // Update role-based visibility after setting the role
            setTimeout(() => {
                setupRoleBasedTabVisibility();
            }, 50);
            
            return true;
        }
        
        // If user not found, they are NOT authorized
        console.log('User not found in system:', email);
        return false;
    } catch (error) {
        console.error('Error checking user authorization:', error);
        return false;
    }
}

// Update last login time for user
async function updateLastLoginTime(email) {
    if (DEMO_MODE) return;
    
    try {
        const adminsRef = collection(db, 'admins');
        const userQuery = query(adminsRef, where('email', '==', email));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0];
            await updateDoc(doc(db, 'admins', userDoc.id), {
                lastLoginAt: new Date()
            });
            console.log('Updated last login time for:', email);
        }
    } catch (error) {
        console.error('Error updating last login time:', error);
    }
}

// Create new user record in admins collection
async function createNewUserRecord(email) {
    if (DEMO_MODE) {
        console.log('Demo mode: Would create new user record for:', email);
        return;
    }
    
    try {
        const newUser = {
            email: email,
            role: 'user',
            playerId: null,              // Will be set during player selection
            playerName: null,            // Will be set during player selection
            isRegistered: false,         // Will be set to true after player selection
            registeredAt: null,          // Will be set during player selection
            lastLoginAt: new Date(),     // Set current login time
            addedAt: new Date(),
            addedBy: 'auto-registration'
        };
        
        // Add to Firestore using email as document ID
        const userDocRef = doc(db, 'admins', email);
        console.log('Attempting to add new user:', newUser);
        await setDoc(userDocRef, newUser);
        
        console.log('✅ New user record created successfully for:', email);
        
        // Invalidate admins cache to refresh the data
        invalidateCache('admins');
        
    } catch (error) {
        console.error('❌ Error creating new user record:', error);
        throw error;
    }
}

// Function to handle new user registration (called only when we want to allow new users)
async function registerNewUser(email) {
    if (DEMO_MODE) {
        console.log('Demo mode: Would register new user for:', email);
        return true;
    }
    
    try {
        await createNewUserRecord(email);
        console.log('✅ New user registered successfully for:', email);
        
        // Set role and return true
        currentUserRole = 'user';
        window.currentUserRole = currentUserRole;
        
        // Update role-based visibility
        setTimeout(() => {
            setupRoleBasedTabVisibility();
        }, 50);
        
        return true;
    } catch (error) {
        console.error('❌ Error registering new user:', error);
        return false;
    }
}

// Legacy function for backward compatibility
async function isAuthorizedAdmin(email) {
    return await isAuthorizedUser(email);
}

// Google Sign-In function
// DELETE the old function and PASTE this one
async function signInWithGoogle() {
    if (DEMO_MODE || !auth || !googleProvider) {
        console.log('Demo mode or auth not available');
        showAdminInterface();
        return;
    }
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        console.log('Sign-in successful:', user.email);

        // Check if user is in your system
        const isAuthorized = await isAuthorizedUser(user.email);
        if (isAuthorized) {
            // Check if user needs to select a player
            const needsPlayerSelection = await checkIfUserNeedsPlayerSelection(user.email);
            if (needsPlayerSelection) {
                showPlayerSelectionInterface(user);
            } else {
                showMainAdminInterface(user);
            }
        } else {
            const shouldRegister = await showCustomConfirm(
                'משתמש חדש',
                `האימייל ${user.email} לא קיים במערכת. האם תרצה להירשם כמשתמש חדש?`,
                {
                    confirmText: 'כן, הירשם אותי',
                    cancelText: 'לא, התנתק',
                    type: 'info'
                }
            );
            if (shouldRegister) {
                const registrationSuccess = await registerNewUser(user.email);
                if (registrationSuccess) {
                    showSuccessToast('הרשמה הושלמה', 'ברוך הבא למערכת!');
                    showPlayerSelectionInterface(user);
                } else {
                    await signOut(auth);
                    showErrorToast('שגיאת הרשמה', 'לא ניתן לרשום משתמש חדש. אנא נסה שנית.');
                }
            } else {
                await signOut(auth);
                showErrorToast('התנתקות', 'התנתקת מהמערכת');
            }
        }
    } catch (error) {
        console.error('Google sign-in failed:', error);
        showErrorToast('שגיאת התחברות', 'אירעה שגיאה. אנא נסה שנית.');
    }
}


// Show admin interface
function showAdminInterface(user = null) {
    // Skip player selection check for super-admin and admin roles
    if (user && (window.currentUserRole === 'super-admin' || window.currentUserRole === 'admin')) {
        console.log('User is admin/super-admin, showing main interface');
        showMainAdminInterface(user);
        return;
    }
    
    // Check if this is a first-time user who needs to select a player
    if (user) {
        checkIfUserNeedsPlayerSelection(user.email).then(needsSelection => {
            if (needsSelection) {
                showPlayerSelectionInterface(user);
                return;
            } else {
                showMainAdminInterface(user);
            }
        }).catch(error => {
            console.error('Error checking player selection status:', error);
            showMainAdminInterface(user);
        });
    } else {
        console.log('No user provided, showing main admin interface');
        showMainAdminInterface(user);
    }
}

// Show main admin interface (after player selection or for existing users)
function showMainAdminInterface(user = null) {
    if (authSection) {
        authSection.style.display = 'none';
        authSection.classList.add('hidden');
    }
    if (adminMain) {
        adminMain.style.display = 'block';
        adminMain.classList.remove('hidden');
    }
    if (playerSelectionSection) {
        playerSelectionSection.style.display = 'none';
        playerSelectionSection.classList.add('hidden');
    }
    
    
    
    // Update user info if user is provided
    if (user) {
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) {
            userEmailElement.textContent = user.email;
        }
        const userPlayerNameElement = document.getElementById('user-player-name');
        if (userPlayerNameElement) {
            loadUserPlayerName(user.email, userPlayerNameElement);
        }
        
        // Update the admin-label badge to reflect the current user's role
        const adminLabelElement = document.getElementById('admin-label');
        if (adminLabelElement) {
            let badgeText = 'משתמש';
            if (window.currentUserRole === 'super-admin') {
                badgeText = 'מנהל על';
            } else if (window.currentUserRole === 'admin') {
                badgeText = 'מנהל';
            }
            adminLabelElement.textContent = badgeText;
        }
    }
    
    // Clean up the page background
    document.body.style.background = '#f8f9fa';
    
    // Clear navigation history when logging in
    clearNavigationHistory();
    
    // Start with step 1
    goToStep(1);
    
    // Initialize admin interface
    setupAdminTabNavigation();
    setupDashboardCreateButton();
    
    // Handle role-based tab visibility - delay to ensure role is set
    setTimeout(() => {
        setupRoleBasedTabVisibility();
        // Also hide create game section for users
        setupUserRoleBasedUI();
    }, 100);
    
    // Only run expensive operations once per session
    if (!window.adminInterfaceInitialized) {
        // Update expired live games first (only once)
        updateExpiredLiveGames().catch(error => {
            console.error('Error updating expired live games:', error);
        });
        
        window.adminInterfaceInitialized = true;
    }
    
    // Check for live games (uses cached data)
    checkForLiveGames().catch(error => {
        console.error('Error checking for live games:', error);
    });
    
    // Setup date input with existing games indicators
    setupDateInputWithIndicators().catch(error => {
        console.error('Error setting up date indicators:', error);
    });
    
    // Set today as default
    setTodayAsDefaultForDashboard();
    
    // Clear any error messages
    if (authError) {
        authError.textContent = '';
    }
    
    console.log('Admin interface shown');
}

async function loadUserPlayerName(email, element) {
    try {
        console.log('🔍 Loading player name for email:', email);
        console.log('🎯 Element ID:', element.id);
        console.log('🎯 Element class:', element.className);
        
        // Query for user document by email field
        const q = query(collection(db, 'admins'), where('email', '==', email));
        const querySnapshot = await getDocs(q);
        console.log('📥 Found matching documents:', querySnapshot.size);
        
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const data = userDoc.data();
            console.log('📋 User data:', data);
            
            if (data.playerName) {
                console.log('✅ Player name found:', data.playerName);
                element.innerHTML = `<span class="player-icon">⚽</span> ${data.playerName}`;
                element.title = `שחקן משויך: ${data.playerName}`;
                // Force text color to black
                element.style.color = 'black';
                console.log('🎨 Set color to black');
                // Hide connect button when player is already connected
                document.getElementById('connect-player-btn').style.display = 'none';
            } else {
                console.log('⚪ No player connected');
                element.innerHTML = '<span class="player-icon">⚪</span> לא משויך לשחקן';
                element.title = 'לא משויך לשחקן';
                // Show connect button for super-admin when no player is connected
                if (window.currentUserRole === 'super-admin') {
                    document.getElementById('connect-player-btn').style.display = 'inline-flex';
                } else {
                    document.getElementById('connect-player-btn').style.display = 'none';
                }
            }
        } else {
            console.log('❌ No user document found');
            element.innerHTML = '';
            // Show connect button for super-admin when no document exists
            if (window.currentUserRole === 'super-admin') {
                document.getElementById('connect-player-btn').style.display = 'inline-flex';
            } else {
                document.getElementById('connect-player-btn').style.display = 'none';
            }
        }
    } catch (e) {
        console.error('Error loading player name:', e);
        element.innerHTML = '';
        // Only show connect button for super-admin
        if (window.currentUserRole === 'super-admin') {
            document.getElementById('connect-player-btn').style.display = 'inline-flex';
        } else {
            document.getElementById('connect-player-btn').style.display = 'none';
        }
    }
}

// Player Selection Modal Functions
let selectedModalPlayerId = null;

function showPlayerSelectionModal() {
    // Only allow super-admin to access this functionality
    if (window.currentUserRole !== 'super-admin') {
        console.error('Only super-admin can access player selection');
        showErrorToast('הרשאות', 'רק מנהל-על יכול לבחור שחקן');
        return;
    }

    const modal = document.getElementById('player-selection-modal');
    modal.classList.remove('hidden');
    modal.classList.add('show');
    loadPlayersForModal();
    setupModalEventListeners();
}

function closePlayerSelectionModal() {
    const modal = document.getElementById('player-selection-modal');
    modal.classList.remove('show');
    modal.classList.add('hidden');
    selectedModalPlayerId = null;
    document.getElementById('modal-confirm-btn').disabled = true;
}

async function loadPlayersForModal() {
    try {
        showLoading(true);
        let players = [];
        if (DEMO_MODE) {
            players = loadDemoPlayers();
        } else {
            await waitForCacheInitialization('players');
            players = getPlayersFromCache();
        }
        renderModalPlayerGrid(players);
        updateModalPlayerCount(players.length);
    } catch (error) {
        console.error('Error loading players for modal:', error);
        showErrorToast('שגיאה בטעינת שחקנים', 'לא ניתן לטעון את רשימת השחקנים');
    } finally {
        showLoading(false);
    }
}

function renderModalPlayerGrid(players) {
    const grid = document.getElementById('modal-player-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (!players || players.length === 0) {
        grid.innerHTML = '<div class="no-players-message">אין שחקנים זמינים לבחירה</div>';
        return;
    }
    
    players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-selection-card';
        playerCard.dataset.playerId = player.id;
        
        playerCard.innerHTML = `
            <div class="player-name">${player.name}</div>
            <div class="player-info">
                ${player.phone ? `📞 ${player.phone}<br>` : ''}
                ${player.email ? `📧 ${player.email}<br>` : ''}
                ${player.position ? `⚽ ${player.position}` : ''}
            </div>
        `;
        
        playerCard.addEventListener('click', () => selectModalPlayer(player.id));
        grid.appendChild(playerCard);
    });
}

function selectModalPlayer(playerId) {
    const allCards = document.querySelectorAll('#modal-player-grid .player-selection-card');
    allCards.forEach(card => card.classList.remove('selected'));
    
    const selectedCard = document.querySelector(`#modal-player-grid [data-player-id="${playerId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    selectedModalPlayerId = playerId;
    document.getElementById('modal-confirm-btn').disabled = false;
}

function setupModalEventListeners() {
    const searchInput = document.getElementById('modal-player-search');
    if (searchInput) {
        searchInput.addEventListener('input', handleModalPlayerSearch);
    }
}

function handleModalPlayerSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const allCards = document.querySelectorAll('#modal-player-grid .player-selection-card');
    
    let visibleCount = 0;
    
    allCards.forEach(card => {
        const playerName = card.querySelector('.player-name').textContent.toLowerCase();
        const playerInfo = card.querySelector('.player-info').textContent.toLowerCase();
        
        if (playerName.includes(searchTerm) || playerInfo.includes(searchTerm)) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    updateModalPlayerCount(visibleCount);
}

function updateModalPlayerCount(count) {
    const countElement = document.getElementById('modal-player-count');
    if (countElement) {
        countElement.textContent = `נמצאו: ${count} שחקנים`;
    }
}

async function handleModalPlayerSelection() {
    console.log('🚀 Starting handleModalPlayerSelection');
    
    // Only allow super-admin to access this functionality
    if (window.currentUserRole !== 'super-admin') {
        console.error('❌ Access denied: Only super-admin can access player selection');
        showErrorToast('הרשאות', 'רק מנהל-על יכול לבחור שחקן');
        return;
    }
    console.log('✅ Role check passed:', window.currentUserRole);

    if (!selectedModalPlayerId) {
        console.error('❌ No player selected');
        showErrorToast('בחירת שחקן', 'אנא בחר שחקן מהרשימה');
        return;
    }
    console.log('✅ Selected player ID:', selectedModalPlayerId);
    
    try {
        showLoading(true);
        
        const userEmail = auth.currentUser?.email;
        console.log('👤 Current user email:', userEmail);
        
        if (!userEmail) {
            console.error('❌ No authenticated user found');
            throw new Error('No authenticated user');
        }
        
        // Get player name
        const players = getPlayersFromCache();
        console.log('📋 Players from cache:', players.length);
        
        const selectedPlayer = players.find(p => p.id === selectedModalPlayerId);
        console.log('🎯 Found selected player:', selectedPlayer);
        
        if (!selectedPlayer) {
            console.error('❌ Selected player not found in cache');
            throw new Error('Selected player not found');
        }
        
        console.log('🔄 Updating user with player info:', {
            userEmail,
            playerId: selectedModalPlayerId,
            playerName: selectedPlayer.name
        });
        
        // Update user with player info
        await updateUserWithPlayerInfo(userEmail, selectedModalPlayerId, selectedPlayer.name);
        
        console.log('✅ Player info updated successfully');
        showSuccessToast('חיבור הושלם', 'השחקן נבחר בהצלחה!');
        
        // Update UI
        const userPlayerNameElement = document.getElementById('user-player-name');
        console.log('🔍 Found user player name element:', !!userPlayerNameElement);
        
        if (userPlayerNameElement) {
            console.log('🔄 Updating UI with new player name');
            await loadUserPlayerName(userEmail, userPlayerNameElement);
        }
        
        closePlayerSelectionModal();
        console.log('✅ Modal closed, process complete');
    } catch (error) {
        console.error('❌ Error in handleModalPlayerSelection:', error);
        console.error('Error stack:', error.stack);
        showErrorToast('שגיאה', 'אירעה שגיאה בחיבור השחקן: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Show login interface
function showLoginInterface() {
    if (authSection) {
        authSection.style.display = 'block';
        authSection.classList.remove('hidden');
    }
    if (adminMain) {
        adminMain.style.display = 'none';
        adminMain.classList.add('hidden');
    }
    if (playerSelectionSection) {
        playerSelectionSection.style.display = 'none';
        playerSelectionSection.classList.add('hidden');
    }
    
    // Clear user info
    const userEmailElement = document.getElementById('user-email');
    if (userEmailElement) {
        userEmailElement.textContent = '';
    }
    
    console.log('Login interface shown');
}

// Player Selection Functions
async function checkIfUserNeedsPlayerSelection(userEmail) {
    try {
        if (DEMO_MODE) {
            // In demo mode, simulate that user needs player selection
            return true;
        }

        // Get user from cache first
        const admins = await loadAllAdminsFromCache();
        const userRecord = admins.find(admin => admin.email === userEmail);
        
        if (!userRecord) {
            console.log('User not found in cache, checking Firestore');
            const userDoc = await getDoc(doc(db, 'admins', userEmail));
            if (!userDoc.exists()) {
                console.log('User does not exist, needs player selection');
                return true;
            }
            const userData = userDoc.data();
            
            // Skip player selection for super-admin and admin roles
            if (userData.role === 'super-admin' || userData.role === 'admin') {
                console.log('User is admin/super-admin, skipping player selection');
                return false;
            }
            
            return !userData.playerId || !userData.isRegistered;
        }
        
        // Skip player selection for super-admin and admin roles
        if (userRecord.role === 'super-admin' || userRecord.role === 'admin') {
            console.log('User is admin/super-admin, skipping player selection');
            return false;
        }
        
        return !userRecord.playerId || !userRecord.isRegistered;
    } catch (error) {
        console.error('Error checking if user needs player selection:', error);
        return true; // Default to needing selection on error
    }
}

function showPlayerSelectionInterface(user) {
    // Hide other sections
    if (authSection) {
        authSection.style.display = 'none';
        authSection.classList.add('hidden');
    }
    if (adminMain) {
        adminMain.style.display = 'none';
        adminMain.classList.add('hidden');
    }
    
    // Show player selection section
    const playerSelectionSection = document.getElementById('player-selection-section');
    if (playerSelectionSection) {
        playerSelectionSection.style.display = 'block';
        playerSelectionSection.classList.remove('hidden');
    }
    
    // Set page background
    document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    
    // Load players and setup interface
    loadPlayersForSelection();
    setupPlayerSelectionEventListeners();
    
    console.log('Player selection interface shown for:', user.email);
}

async function loadPlayersForSelection() {
    try {
        showLoading(true);
        
        let players = [];
        if (DEMO_MODE) {
            players = loadDemoPlayers();
        } else {
            // Wait for cache to be ready
            await waitForCacheInitialization('players');
            players = getPlayersFromCache();
        }
        
        renderPlayerSelectionGrid(players);
        updatePlayerSelectionCount(players.length);
        
    } catch (error) {
        console.error('Error loading players for selection:', error);
        showErrorToast('שגיאה בטעינת שחקנים', 'לא ניתן לטעון את רשימת השחקנים');
    } finally {
        showLoading(false);
    }
}

function renderPlayerSelectionGrid(players) {
    const grid = document.getElementById('player-selection-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (!players || players.length === 0) {
        grid.innerHTML = '<div class="no-players-message">אין שחקנים זמינים לבחירה</div>';
        return;
    }
    
    players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-selection-card';
        playerCard.dataset.playerId = player.id;
        
        playerCard.innerHTML = `
            <div class="player-name">${player.name}</div>
            <div class="player-info">
                ${player.phone ? `📞 ${player.phone}<br>` : ''}
                ${player.email ? `📧 ${player.email}<br>` : ''}
                ${player.position ? `⚽ ${player.position}` : ''}
            </div>
        `;
        
        playerCard.addEventListener('click', () => selectPlayer(player.id));
        grid.appendChild(playerCard);
    });
}

function selectPlayer(playerId) {
    // Remove previous selection
    const allCards = document.querySelectorAll('.player-selection-card');
    allCards.forEach(card => card.classList.remove('selected'));
    
    // Select new player
    const selectedCard = document.querySelector(`[data-player-id="${playerId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Enable confirm button
    const confirmBtn = document.getElementById('confirm-player-selection-btn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
    }
    
    // Store selected player ID
    window.selectedPlayerId = playerId;
}

function setupPlayerSelectionEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('player-selection-search');
    if (searchInput) {
        searchInput.addEventListener('input', handlePlayerSelectionSearch);
    }
    
    // Confirm button
    const confirmBtn = document.getElementById('confirm-player-selection-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmPlayerSelection);
    }
}

function handlePlayerSelectionSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const allCards = document.querySelectorAll('.player-selection-card');
    
    let visibleCount = 0;
    
    allCards.forEach(card => {
        const playerName = card.querySelector('.player-name').textContent.toLowerCase();
        const playerInfo = card.querySelector('.player-info').textContent.toLowerCase();
        
        if (playerName.includes(searchTerm) || playerInfo.includes(searchTerm)) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    updatePlayerSelectionCount(visibleCount);
}

function updatePlayerSelectionCount(count) {
    const countElement = document.getElementById('player-selection-count');
    if (countElement) {
        countElement.textContent = `נמצאו: ${count} שחקנים`;
    }
}

async function confirmPlayerSelection() {
    if (!window.selectedPlayerId) {
        showErrorToast('בחירת שחקן', 'אנא בחר שחקן מהרשימה');
        return;
    }
    
    try {
        showLoading(true);
        
        const userEmail = auth.currentUser?.email;
        if (!userEmail) {
            throw new Error('No authenticated user');
        }
        
        // Connect user to player
        await connectUserToPlayer(userEmail, window.selectedPlayerId);
        
        showSuccessToast('חיבור הושלם', 'השחקן נבחר בהצלחה!');
        
        // Show main interface
        setTimeout(() => {
            showMainAdminInterface(auth.currentUser);
        }, 1000);
        
    } catch (error) {
        console.error('Error confirming player selection:', error);
        showErrorToast('שגיאה בחיבור', 'לא ניתן לחבר את המשתמש לשחקן');
    } finally {
        showLoading(false);
    }
}

async function connectUserToPlayer(userEmail, playerId) {
    try {
        if (DEMO_MODE) {
            console.log('Demo mode: Connecting user', userEmail, 'to player', playerId);
            return;
        }
        
        // Update user document with playerId
        await updateDoc(doc(db, 'admins', userEmail), {
            playerId: playerId,
            playerSelectionCompleted: true,
            playerSelectionDate: new Date()
        });
        
        console.log('User connected to player successfully:', userEmail, '->', playerId);
        
    } catch (error) {
        console.error('Error connecting user to player:', error);
        throw error;
    }
}

async function logout() {
    if (DEMO_MODE) {
        console.log('Demo mode: Would log out user');
        showLoginInterface();
        return;
    }

    try {
        if (!auth) {
            console.error('Auth not initialized');
            showErrorToast('שגיאה', 'מערכת האימות לא מוכנה');
            return;
        }

        // Clean up any active listeners
        cleanupRealtimeListeners();
        
        // Clear cache
        invalidateCache('all');
        
        // Sign out from Firebase
        await signOut(auth);
        console.log('User signed out successfully');
        
        // Reset UI
        showLoginInterface();
        showSuccessToast('התנתקות', 'התנתקת בהצלחה');
        
        // Clear any game state
        resetGameDayState();
        clearAllUIElements();
    } catch (error) {
        console.error('Error signing out:', error);
        showErrorToast('שגיאה', 'אירעה שגיאה בהתנתקות');
    }
}

// Make functions globally available
window.signInWithGoogle = signInWithGoogle;
window.logout = logout;

// Step 1: Create Game Day
async function createGameDay() {
    const gameDate = document.getElementById('game-date').value;
    if (!gameDate) {
        alert('אנא בחר תאריך');
        return;
    }
    
    // Check if date already has a game
    const existingDates = window.existingGameDates || [];
    if (existingDates.includes(gameDate)) {
        alert('קיים כבר ערב משחק בתאריך זה. אנא בחר תאריך אחר.');
        return;
    }
    
    // Show progress container and hide main view
    const progressContainer = document.getElementById('game-progress-container');
    const gameManagementMain = document.getElementById('game-management-main');
    
    if (progressContainer) progressContainer.classList.remove('hidden');
    if (gameManagementMain) gameManagementMain.classList.add('hidden');
    
    // Check for subscriptions for this day
    const dayOfWeek = getDayOfWeekFromDate(gameDate);
    const subscription = await checkSubscriptionExists(dayOfWeek);
    
    if (subscription && subscription.playerIds && subscription.playerIds.length === 21) {
        // Show subscription confirmation popup
        const useSubscription = await showSubscriptionConfirmationPopup(dayOfWeek, subscription.playerIds.length);
        
        if (useSubscription) {
            // Load subscription players and jump to step 3
            await loadSubscriptionAndJumpToTeams(gameDate, subscription.playerIds);
            return;
        }
    }
    
    // Continue with normal flow (no subscription or user chose manual selection)
    await createGameDayNormal(gameDate);
}

// Helper function to get day of week from date
function getDayOfWeekFromDate(dateString) {
    const date = new Date(dateString);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
}

// Helper function to check if subscription exists for a day
async function checkSubscriptionExists(dayOfWeek) {
    if (DEMO_MODE) {
        // For demo mode, simulate subscription for Sunday
        if (dayOfWeek === 'sunday') {
            return { playerIds: Array.from({length: 21}, (_, i) => `demo-player-${i + 1}`) };
        }
        return null;
    }
    
    try {
        const subscriptionDoc = await getDoc(doc(db, 'subscriptions', dayOfWeek));
        return subscriptionDoc.exists() ? subscriptionDoc.data() : null;
    } catch (error) {
        console.error('Error checking subscription:', error);
        return null;
    }
}

// Helper function to show subscription confirmation popup
async function showSubscriptionConfirmationPopup(dayOfWeek, playerCount) {
    return new Promise((resolve) => {
        // Create modal HTML
        const modal = document.createElement('div');
        modal.className = 'subscription-confirmation-modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>מנוי קיים ליום ${getDayDisplayName(dayOfWeek)}</h3>
                </div>
                <div class="modal-body">
                    <p>נמצא מנוי עם ${playerCount} שחקנים ליום ${getDayDisplayName(dayOfWeek)}</p>
                    <p>האם תרצה להשתמש ברשימת השחקנים הקיימת ולדלג ישירות לחלוקת הקבוצות?</p>
                </div>
                <div class="modal-actions">
                    <button class="primary-btn use-subscription-btn">כן, השתמש במנוי</button>
                    <button class="secondary-btn manual-selection-btn">לא, בחר שחקנים ידנית</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const useSubscriptionBtn = modal.querySelector('.use-subscription-btn');
        const manualSelectionBtn = modal.querySelector('.manual-selection-btn');
        const backdrop = modal.querySelector('.modal-backdrop');
        
        const cleanup = () => {
            document.body.removeChild(modal);
        };
        
        useSubscriptionBtn.addEventListener('click', () => {
            cleanup();
            resolve(true);
        });
        
        manualSelectionBtn.addEventListener('click', () => {
            cleanup();
            resolve(false);
        });
        
        backdrop.addEventListener('click', () => {
            cleanup();
            resolve(false);
        });
    });
}

// Helper function to get day display name in Hebrew
function getDayDisplayName(dayOfWeek) {
    const dayNames = {
        'sunday': 'ראשון',
        'monday': 'שני',
        'tuesday': 'שלישי',
        'wednesday': 'רביעי',
        'thursday': 'חמישי',
        'friday': 'שישי',
        'saturday': 'שבת'
    };
    return dayNames[dayOfWeek] || dayOfWeek;
}

// Helper function to load subscription players and jump to step 3
async function loadSubscriptionAndJumpToTeams(gameDate, playerIds) {
    showLoadingWithTimeout(true, 15000);
    
    try {
        console.log('Loading subscription players for date:', gameDate);
        
        // Initialize game day structure
        currentGameDay = {
            date: gameDate,
            participants: playerIds,
            teams: { A: [], B: [], C: [] },
            miniGames: [],
            playerStats: {},
            status: getStatusForDate(gameDate),
            isSubscriptionBased: true // Flag to indicate this game uses subscription
        };
        
        if (DEMO_MODE) {
            console.log('Demo mode: Loading subscription players');
            // Load demo players
            loadDemoPlayers();
            // Set selected players to subscription players
            selectedPlayers = playerIds;
        } else {
            // Test Firebase connection
            if (!db) {
                throw new Error('Firebase database not initialized');
            }
            
            // Save to Firestore
            const gameDayRef = doc(db, 'gameDays', gameDate);
            await Promise.race([
                setDoc(gameDayRef, currentGameDay),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Firebase timeout')), 10000)
                )
            ]);
            
            // Load all players for team assignment
            await loadPlayers();
            
            // Set selected players to subscription players
            selectedPlayers = playerIds;
        }
        
        // Initialize player stats
        initializePlayerStats();
        
        // Mark steps 1 and 2 as completed
        completedSteps.add(1);
        completedSteps.add(2);
        
        // Jump directly to step 3 (team assignment)
        console.log('Jumping to step 3 with subscription players');
        goToStep(3);
        renderTeamAssignment();
        
        // Show subscription indicator
        showSubscriptionIndicator();
        
    } catch (error) {
        console.error('Error loading subscription players:', error);
        if (error.message.includes('timeout') || error.message.includes('network')) {
            alert('בעיית חיבור לאינטרנט - נעבור לבחירה ידנית');
        } else {
            alert('שגיאה בטעינת מנוי השחקנים - נעבור לבחירה ידנית');
        }
        
        // Fallback to normal flow
        await createGameDayNormal(gameDate);
    } finally {
        showLoadingWithTimeout(false);
    }
}

// Helper function to show subscription indicator
function showSubscriptionIndicator() {
    // Add subscription indicator to step 3 header
    const step3Header = document.querySelector('#step-3 h2');
    if (step3Header && !step3Header.querySelector('.subscription-indicator')) {
        const indicator = document.createElement('span');
        indicator.className = 'subscription-indicator';
        indicator.innerHTML = '📋 מבוסס על מנוי';
        step3Header.appendChild(indicator);
    }
}

// Original createGameDay logic moved to separate function
async function createGameDayNormal(gameDate) {
    if (DEMO_MODE) {
        console.log('Demo mode: Creating game day without Firebase');
        
        // Initialize game day structure
        currentGameDay = {
            date: gameDate,
            participants: [],
            teams: { A: [], B: [], C: [] },
            miniGames: [],
            playerStats: {},
            status: getStatusForDate(gameDate)
        };
        
        // Mark step 1 as completed
        completedSteps.add(1);
        
        // Load demo players
        loadDemoPlayers();
        goToStep(2);
        return;
    }
    
    showLoadingWithTimeout(true, 15000);
    
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
            status: getStatusForDate(gameDate)
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

// Demo players data with all required fields
const demoPlayers = [
    { id: 'demo1', name: 'יוסי כהן', goals: 15, assists: 8, wins: 12, totalGameNights: 25, totalMiniGames: 75 },
    { id: 'demo2', name: 'דני לוי', goals: 12, assists: 10, wins: 14, totalGameNights: 22, totalMiniGames: 66 },
    { id: 'demo3', name: 'משה אברהם', goals: 18, assists: 6, wins: 11, totalGameNights: 28, totalMiniGames: 84 },
    { id: 'demo4', name: 'אבי דוד', goals: 9, assists: 12, wins: 13, totalGameNights: 20, totalMiniGames: 60 },
    { id: 'demo5', name: 'רון מזרחי', goals: 14, assists: 9, wins: 10, totalGameNights: 24, totalMiniGames: 72 },
    { id: 'demo6', name: 'גיל שלום', goals: 11, assists: 7, wins: 15, totalGameNights: 26, totalMiniGames: 78 },
    { id: 'demo7', name: 'עמית גולן', goals: 16, assists: 11, wins: 9, totalGameNights: 21, totalMiniGames: 63 },
    { id: 'demo8', name: 'תומר בן דוד', goals: 8, assists: 13, wins: 16, totalGameNights: 27, totalMiniGames: 81 },
    { id: 'demo9', name: 'אלון כץ', goals: 13, assists: 5, wins: 8, totalGameNights: 19, totalMiniGames: 57 },
    { id: 'demo10', name: 'נתן רוזן', goals: 10, assists: 14, wins: 12, totalGameNights: 23, totalMiniGames: 69 },
    { id: 'demo11', name: 'אריק שמיר', goals: 17, assists: 4, wins: 14, totalGameNights: 25, totalMiniGames: 75 },
    { id: 'demo12', name: 'בן ציון', goals: 7, assists: 15, wins: 11, totalGameNights: 22, totalMiniGames: 66 },
    { id: 'demo13', name: 'יובל פרץ', goals: 19, assists: 3, wins: 13, totalGameNights: 29, totalMiniGames: 87 },
    { id: 'demo14', name: 'שי אלבז', goals: 6, assists: 16, wins: 10, totalGameNights: 20, totalMiniGames: 60 },
    { id: 'demo15', name: 'עידן מלכה', goals: 15, assists: 7, wins: 15, totalGameNights: 26, totalMiniGames: 78 },
    { id: 'demo16', name: 'נועם יוסף', goals: 12, assists: 9, wins: 9, totalGameNights: 21, totalMiniGames: 63 },
    { id: 'demo17', name: 'אסף חיים', goals: 14, assists: 8, wins: 12, totalGameNights: 24, totalMiniGames: 72 },
    { id: 'demo18', name: 'דוד שרון', goals: 11, assists: 10, wins: 14, totalGameNights: 25, totalMiniGames: 75 },
    { id: 'demo19', name: 'רועי אבן', goals: 9, assists: 12, wins: 8, totalGameNights: 18, totalMiniGames: 54 },
    { id: 'demo20', name: 'טל ברק', goals: 16, assists: 6, wins: 16, totalGameNights: 28, totalMiniGames: 84 },
    { id: 'demo21', name: 'אור כהן', goals: 13, assists: 11, wins: 11, totalGameNights: 23, totalMiniGames: 69 },
    { id: 'demo22', name: 'יהונתן לב', goals: 8, assists: 14, wins: 13, totalGameNights: 22, totalMiniGames: 66 },
    { id: 'demo23', name: 'מתן גור', goals: 18, assists: 5, wins: 10, totalGameNights: 27, totalMiniGames: 81 },
    { id: 'demo24', name: 'איתי נחום', goals: 10, assists: 13, wins: 15, totalGameNights: 24, totalMiniGames: 72 },
    { id: 'demo25', name: 'שחר דן', goals: 12, assists: 8, wins: 9, totalGameNights: 19, totalMiniGames: 57 }
];

// Demo players for testing
function loadDemoPlayers() {
    console.log('Loading demo players...');
    allPlayers = [...demoPlayers];
    
    console.log(`Loaded ${allPlayers.length} demo players`);
    renderPlayersGrid();
}

// Step 2: Player Selection
async function loadPlayers() {
    try {
        console.log('Loading players...');
        
        // Use cached players data
        allPlayers = await loadAllPlayersFromCache();
        
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

async function handleUserPlayerConnection() {
    console.log('handleUserPlayerConnection called');
    if (!window.selectedPlayerId) {
        showErrorToast('בחירת שחקן', 'אנא בחר שחקן מהרשימה');
        return;
    }
    try {
        showLoading(true);
        const userEmail = auth && auth.currentUser ? auth.currentUser.email : null;
        if (!userEmail) {
            showErrorToast('שגיאה', 'לא נמצא משתמש מחובר.');
            return;
        }
        // Get selected player info
        await waitForCacheInitialization('players');
        const players = getPlayersFromCache();
        const selectedPlayer = players.find(p => p.id === window.selectedPlayerId);
        if (!selectedPlayer) {
            showErrorToast('שגיאה', 'לא נמצא שחקן תואם.');
            return;
        }
        // Update user document in DB
        await updateUserWithPlayerInfo(userEmail, selectedPlayer.id, selectedPlayer.name);
        showSuccessToast('חיבור הושלם', 'המשתמש חובר לשחקן בהצלחה!');
        setTimeout(() => {
            showMainAdminInterface(auth.currentUser);
        }, 1000);
    } catch (error) {
        console.error('Error connecting user to player:', error);
        showErrorToast('שגיאה', error.message || 'לא ניתן לחבר את המשתמש לשחקן');
    } finally {
        showLoading(false);
    }
}
window.handleUserPlayerConnection = handleUserPlayerConnection;

async function updateUserWithPlayerInfo(userEmail, playerId, playerName) {
    console.log('🚀 Starting updateUserWithPlayerInfo:', { userEmail, playerId, playerName });
    
    try {
        // Query for the user document by email field
        const q = query(collection(db, 'admins'), where('email', '==', userEmail));
        console.log('📄 Querying for user document with email:', userEmail);
        
        const querySnapshot = await getDocs(q);
        console.log('📥 Found matching documents:', querySnapshot.size);
        
        if (querySnapshot.empty) {
            console.error('❌ No user document found for email:', userEmail);
            throw new Error('User document not found');
        }
        
        // Get the first matching document
        const userDoc = querySnapshot.docs[0];
        const currentData = userDoc.data();
        console.log('📋 Current user data:', JSON.stringify(currentData, null, 2));
        
        // Prepare update data
        const updateData = {
            playerId: playerId,
            playerName: playerName,
            isRegistered: true,
            registeredAt: currentData.registeredAt || new Date(),
            lastLoginAt: new Date(),
            role: currentData.role || 'user',
            email: userEmail,
            addedAt: currentData.addedAt || new Date(),
            addedBy: currentData.addedBy || 'system'
        };
        
        console.log('📝 Update data prepared:', JSON.stringify(updateData, null, 2));
        
        // Update the document using its actual ID
        const userDocRef = doc(db, 'admins', userDoc.id);
        console.log('🔄 Updating document with ID:', userDoc.id);
        await updateDoc(userDocRef, updateData);
        
        // Don't change the role if it exists
        if (currentData.role) {
            console.log('👑 Preserving existing role:', currentData.role);
            currentUserRole = currentData.role;
            window.currentUserRole = currentData.role;
        }
        
        console.log('✅ User info updated successfully for:', userEmail);
        
        // Verify the update
        const updatedDoc = await getDoc(userDocRef);
        const updatedData = updatedDoc.data();
        console.log('📋 Updated user data:', JSON.stringify(updatedData, null, 2));
        
    } catch (error) {
        console.error('❌ Error updating user info:', error);
        console.error('Error stack:', error.stack);
        throw new Error('Failed to update user info: ' + error.message);
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
        // Fix: participants should be the union of all players in teams
        const participants = [...teams.A, ...teams.B, ...teams.C];
        currentGameDay.participants = [...new Set(participants)];
        // DO NOT set status to 3 here! Only set status when game is actually completed.
        // Leave currentGameDay.status unchanged
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
        return `${captain.name} 👑`;
    }
    return `קבוצה ${teamLetter}`;
}

// Step 4: Mini-Games Management
function addMiniGame() {
    // Show team selection modal instead of directly adding game
    showTeamSelectionModal();
}

// Show team selection modal
function showTeamSelectionModal() {
    const modal = document.getElementById('team-selection-modal');
    const teamASelect = document.getElementById('team-a-select');
    const teamBSelect = document.getElementById('team-b-select');
    const confirmBtn = document.getElementById('confirm-team-selection');
    
    // Populate team options
    populateTeamSelectionOptions();
    
    // Show modal
    modal.classList.remove('hidden');
    
    // Reset form
    teamASelect.value = '';
    teamBSelect.value = '';
    confirmBtn.disabled = true;
    
    // Setup event listeners if not already done
    setupTeamSelectionEventListeners();
}

// Populate team selection options
function populateTeamSelectionOptions() {
    const teamASelect = document.getElementById('team-a-select');
    const teamBSelect = document.getElementById('team-b-select');
    
    // Clear existing options (except first one)
    teamASelect.innerHTML = '<option value="">-- בחר קבוצה --</option>';
    teamBSelect.innerHTML = '<option value="">-- בחר קבוצה --</option>';
    
    // Get available teams from current game day
    const availableTeams = teams ? Object.keys(teams) : ['A', 'B', 'C'];
    
    availableTeams.forEach(teamLetter => {
        const teamName = getTeamDisplayName(teamLetter);
        const optionA = document.createElement('option');
        optionA.value = teamLetter;
        optionA.textContent = teamName;
        teamASelect.appendChild(optionA);
        
        const optionB = document.createElement('option');
        optionB.value = teamLetter;
        optionB.textContent = teamName;
        teamBSelect.appendChild(optionB);
    });
}

// Setup team selection event listeners
function setupTeamSelectionEventListeners() {
    const teamASelect = document.getElementById('team-a-select');
    const teamBSelect = document.getElementById('team-b-select');
    const confirmBtn = document.getElementById('confirm-team-selection');
    const cancelBtn = document.getElementById('cancel-team-selection');
    const closeBtn = document.getElementById('close-team-selection');
    
    // Remove existing listeners to avoid duplicates
    teamASelect.removeEventListener('change', validateTeamSelection);
    teamBSelect.removeEventListener('change', validateTeamSelection);
    confirmBtn.removeEventListener('click', confirmNewGame);
    cancelBtn.removeEventListener('click', closeTeamSelectionModal);
    closeBtn.removeEventListener('click', closeTeamSelectionModal);
    
    // Add new listeners
    teamASelect.addEventListener('change', validateTeamSelection);
    teamBSelect.addEventListener('change', validateTeamSelection);
    confirmBtn.addEventListener('click', confirmNewGame);
    cancelBtn.addEventListener('click', closeTeamSelectionModal);
    closeBtn.addEventListener('click', closeTeamSelectionModal);
}

// Validate team selection
function validateTeamSelection() {
    const teamASelect = document.getElementById('team-a-select');
    const teamBSelect = document.getElementById('team-b-select');
    const confirmBtn = document.getElementById('confirm-team-selection');
    
    const teamA = teamASelect.value;
    const teamB = teamBSelect.value;
    
    // Enable confirm button only if both teams are selected and different
    confirmBtn.disabled = !teamA || !teamB || teamA === teamB;
    
    // Update second team options to exclude selected team A
    updateSecondTeamOptions();
}

// Update second team options to exclude selected team A
function updateSecondTeamOptions() {
    const teamASelect = document.getElementById('team-a-select');
    const teamBSelect = document.getElementById('team-b-select');
    
    const selectedTeamA = teamASelect.value;
    const currentTeamB = teamBSelect.value;
    
    // Clear and repopulate team B options
    teamBSelect.innerHTML = '<option value="">-- בחר קבוצה --</option>';
    
    const availableTeams = teams ? Object.keys(teams) : ['A', 'B', 'C'];
    
    availableTeams.forEach(teamLetter => {
        if (teamLetter !== selectedTeamA) {
            const teamName = getTeamDisplayName(teamLetter);
            const option = document.createElement('option');
            option.value = teamLetter;
            option.textContent = teamName;
            teamBSelect.appendChild(option);
        }
    });
    
    // Restore team B selection if it's still valid
    if (currentTeamB && currentTeamB !== selectedTeamA) {
        teamBSelect.value = currentTeamB;
    }
}

// Confirm new game creation
function confirmNewGame() {
    const teamASelect = document.getElementById('team-a-select');
    const teamBSelect = document.getElementById('team-b-select');
    
    const teamA = teamASelect.value;
    const teamB = teamBSelect.value;
    
    if (!teamA || !teamB || teamA === teamB) {
        alert('אנא בחר שתי קבוצות שונות');
        return;
    }
    
    // Create the mini game
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
        gameNumber: gameNumber,
        teamA: teamA,
        teamB: teamB,
        scoreA: 0,
        scoreB: 0,
        scorers: [],
        winner: null
    };
    
    // Add new game at the beginning of the array (top of the list)
    miniGames.unshift(miniGame);
    
    // Close modal
    closeTeamSelectionModal();
    
    // Re-render all games to update numbering
    renderAllMiniGames();
    
    // Update stopwatch game selection dropdown
    updateTimerGameSelection();
    
    // Show stopwatch section and automatically select the new game
    showStopwatchForGame(miniGameId);
    
    // Update stats display
    updateStatsDisplay();
    
    // Hide new game interface
    hideNewGameInterface();
}

// Close team selection modal
function closeTeamSelectionModal() {
    const modal = document.getElementById('team-selection-modal');
    modal.classList.add('hidden');
}

// Show stopwatch for specific game
function showStopwatchForGame(gameId) {
    const stopwatchSection = document.getElementById('live-stopwatch-section');
    const timerGameSelect = document.getElementById('timer-game-select');
    
    // Show stopwatch section
    stopwatchSection.classList.remove('hidden');
    
    // Add live game active class to body
    document.body.classList.add('live-game-active');
    
    // Select the game in dropdown
    timerGameSelect.value = gameId;
    
    // Trigger change event to update stopwatch
    timerGameSelect.dispatchEvent(new Event('change'));
    
    // Focus on the start button
    const startBtn = document.getElementById('start-stop-btn');
    if (startBtn) {
        startBtn.focus();
    }
}

// Hide new game interface
function hideNewGameInterface() {
    const newGameInterface = document.getElementById('new-game-interface');
    newGameInterface.classList.add('hidden');
}

// Show new game interface
function showNewGameInterface() {
    const newGameInterface = document.getElementById('new-game-interface');
    newGameInterface.classList.remove('hidden');
}

// Hide stopwatch section
function hideStopwatchSection() {
    const stopwatchSection = document.getElementById('live-stopwatch-section');
    stopwatchSection.classList.add('hidden');
    
    // Remove live game active class from body
    document.body.classList.remove('live-game-active');
}

// Initialize the new game management interface
function initializeNewGameInterface() {
    const addGameBtn = document.getElementById('add-mini-game-btn');
    
    if (addGameBtn) {
        addGameBtn.addEventListener('click', addMiniGame);
    }
    
    // Setup modal event listeners
    setupTeamSelectionEventListeners();
    
    // Initially show the new game interface
    showNewGameInterface();
}

// Lock all games during live play
function lockAllGamesForLivePlay() {
    console.log('Locking all games during live play');
    
    // Add locked state to body
    document.body.classList.add('live-game-locked');
    
    // Disable all game lock/unlock buttons
    const lockButtons = document.querySelectorAll('.lock-btn');
    lockButtons.forEach(btn => {
        btn.disabled = true;
        btn.title = 'לא ניתן לפתוח נעילה במהלך משחק חי';
    });
    
    // Lock all existing games
    miniGames.forEach(game => {
        if (!game.isLocked) {
            game.isLocked = true;
            game.wasAutoLocked = true; // Mark as auto-locked to distinguish from manual locks
        }
    });
    
    // Re-render games to show locked state
    renderAllMiniGames();
    
    // Mark current live game visually
    markCurrentLiveGame();
    
    // Disable add game button
    const addGameBtn = document.getElementById('add-mini-game-btn');
    if (addGameBtn) {
        addGameBtn.disabled = true;
        addGameBtn.title = 'לא ניתן להוסיף משחק במהלך משחק חי';
    }
}

// Unlock all games after live play
function unlockAllGamesAfterLivePlay() {
    console.log('Unlocking all games after live play');
    
    // Remove locked state from body
    document.body.classList.remove('live-game-locked');
    
    // Re-enable all game lock/unlock buttons
    const lockButtons = document.querySelectorAll('.lock-btn');
    lockButtons.forEach(btn => {
        btn.disabled = false;
        btn.title = '';
    });
    
    // Handle game locking and collapsing after live play ends
    miniGames.forEach(game => {
        if (game.wasAutoLocked) {
            // Keep the game locked by default after completion
            game.wasAutoLocked = false;
            // Game remains locked (isLocked = true)
        }
        
        // Collapse all games by default after live play ends
        game.isCollapsed = true;
    });
    
    // Re-render games to show unlocked state
    renderAllMiniGames();
    
    // Remove live game visual marking
    removeCurrentLiveGameMarking();
    
    // Re-enable add game button
    const addGameBtn = document.getElementById('add-mini-game-btn');
    if (addGameBtn) {
        addGameBtn.disabled = false;
        addGameBtn.title = '';
    }
}

// Mark current live game visually
function markCurrentLiveGame() {
    if (!stopwatchState.currentGameId) return;
    
    const gameContainer = document.querySelector(`[data-game-id="${stopwatchState.currentGameId}"]`);
    if (gameContainer) {
        gameContainer.classList.add('current-live-game');
    }
}

// Remove live game visual marking
function removeCurrentLiveGameMarking() {
    const liveGameContainers = document.querySelectorAll('.current-live-game');
    liveGameContainers.forEach(container => {
        container.classList.remove('current-live-game');
    });
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
    
    // Check if this game was recorded live (has stopwatch data)
    const wasRecordedLive = miniGame.durationSeconds !== undefined;
    
    // Initialize lock state if not already set
    if (wasRecordedLive && miniGame.isLocked === undefined) {
        miniGame.isLocked = true; // Lock by default for live-recorded games
    }
    
    // Default state is expanded for all games
    const hasContent = miniGame.teamA && miniGame.teamB && (miniGame.scoreA > 0 || miniGame.scoreB > 0);
    const isCollapsed = false; // All games start expanded by default
    
    // Create lock icon and indicator
    const lockIcon = wasRecordedLive ? `
        <button class="game-lock-btn ${miniGame.isLocked ? 'locked' : 'unlocked'}" 
                onclick="toggleGameLock('${miniGame.id}')" 
                title="${miniGame.isLocked ? 'משחק נעול - נרשם בזמן אמת. לחץ לפתיחת עריכה' : 'משחק פתוח לעריכה. לחץ לנעילה'}">
            <span class="lock-icon">${miniGame.isLocked ? '🔒' : '🔓'}</span>
        </button>
    ` : '';
    
    const liveIndicator = wasRecordedLive ? `
        <span class="live-recorded-indicator" title="משחק נרשם בזמן אמת עם סטופר">
            ⏱️ חי
        </span>
    ` : '';
    
    miniGameElement.innerHTML = `
        <div class="mini-game-header">
            <div class="game-header-left">
                <button class="collapse-btn" onclick="toggleGameCollapse('${miniGame.id}')" title="${isCollapsed ? 'הרחב משחק' : 'כווץ משחק'}">
                    <span class="collapse-icon">${isCollapsed ? '▼' : '▲'}</span>
                </button>
                <h4>משחק ${gameNumber}</h4>
                ${liveIndicator}
                ${hasContent ? `
                    <div class="game-summary">
                        ${getGameSummaryWithScorers(miniGame)}
                    </div>
                ` : ''}
            </div>
            <div class="game-header-right">
                ${lockIcon}
                <button class="remove-game-btn" onclick="removeMiniGame('${miniGame.id}')">הסר</button>
            </div>
        </div>
        
        <div class="game-content ${miniGame.isLocked ? 'locked-content' : ''}" ${isCollapsed ? 'style="display: none;"' : ''}>
            <div class="game-setup">
                <div class="team-selection">
                    <label>קבוצה 1:</label>
                    <select class="team-select" data-team="A" ${miniGame.isLocked ? 'disabled' : ''}>
                        <option value="">בחר קבוצה</option>
                        ${generateTeamOptions()}
                    </select>
                </div>
                
                <div class="vs">נגד</div>
                
                <div class="team-selection">
                    <label>קבוצה 2:</label>
                    <select class="team-select" data-team="B" ${miniGame.isLocked ? 'disabled' : ''}>
                        <option value="">בחר קבוצה</option>
                        ${generateTeamOptions()}
                    </select>
                </div>
            </div>
            
            <div class="score-section">
                <div class="score-input">
                    <label>תוצאה קבוצה 1:</label>
                    <input type="number" min="0" class="score-input-field" data-team="A" value="0" ${miniGame.isLocked ? 'readonly' : ''}>
                </div>
                
                <div class="score-input">
                    <label>תוצאה קבוצה 2:</label>
                    <input type="number" min="0" class="score-input-field" data-team="B" value="0" ${miniGame.isLocked ? 'readonly' : ''}>
                </div>
            </div>
            
            <div class="scorers-section">
                <h5>מבקיעים ומבשלים:</h5>
                <div class="scorers-grid" id="scorers-${miniGame.id}">
                    <!-- Scorers will be added here -->
                </div>
            </div>
            
            ${wasRecordedLive ? `
                <div class="live-game-info">
                    <div class="live-game-duration">
                        <span class="duration-label">משך המשחק:</span>
                        <span class="duration-value">${formatDuration(miniGame.durationSeconds)}</span>
                    </div>
                    ${miniGame.isLocked ? `
                        <div class="lock-message">
                            <span class="lock-message-text">🔒 משחק נעול - נרשם בזמן אמת. לחץ על הנעילה לעריכה</span>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
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
        
        // Update stopwatch game selection dropdown to reflect team changes
        updateTimerGameSelection();
        
        // Update current game info if this is the selected game
        if (stopwatchState.currentGameId === gameId) {
            updateCurrentGameInfo();
        }
        
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
    
    // Check if the game is locked
    const miniGame = miniGames.find(g => g.id === gameId);
    const isLocked = miniGame && miniGame.isLocked;
    
    playerScorer.innerHTML = `
        <div class="player-info">
            <span class="player-name">${player.name}</span>
        </div>
        <div class="scorer-inputs">
            <div class="input-group">
                <label>גולים:</label>
                <input type="number" min="0" value="0" class="goals-input" data-player-id="${playerId}" ${isLocked ? 'readonly' : ''}>
            </div>
            <div class="input-group">
                <label>בישולים:</label>
                <input type="number" min="0" value="0" class="assists-input" data-player-id="${playerId}" ${isLocked ? 'readonly' : ''}>
            </div>
        </div>
    `;
    
    const goalsInput = playerScorer.querySelector('.goals-input');
    const assistsInput = playerScorer.querySelector('.assists-input');
    
    // Only add event listeners if not locked
    if (!isLocked) {
        goalsInput.addEventListener('input', () => updatePlayerGameStats(gameId, playerId));
        assistsInput.addEventListener('input', () => updatePlayerGameStats(gameId, playerId));
    }
    
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

// Toggle game lock state
function toggleGameLock(gameId) {
    // Prevent toggling during live play
    if (document.body.classList.contains('live-game-locked')) {
        showToast('לא ניתן לשנות נעילת משחקים במהלך משחק חי', 'error');
        return;
    }
    
    const miniGame = miniGames.find(g => g.id === gameId);
    if (!miniGame) return;
    
    // Toggle lock state
    miniGame.isLocked = !miniGame.isLocked;
    
    // Remove auto-lock flag if manually toggling
    if (miniGame.wasAutoLocked) {
        miniGame.wasAutoLocked = false;
    }
    
    // Re-render the game to update UI
    renderAllMiniGames();
    
    // Show feedback
    const lockState = miniGame.isLocked ? 'נעול' : 'פתוח לעריכה';
    showToast(`משחק ${lockState}`, 'info');
    
    // Auto-save if in live mode
    if (window.currentLiveGame) {
        autoSaveLiveGame();
    }
}

// Format duration in seconds to MM:SS format
function formatDuration(seconds) {
    if (!seconds) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Generate game summary with scorers under team names
function getGameSummaryWithScorers(miniGame) {
    const teamAName = getTeamDisplayName(miniGame.teamA);
    const teamBName = getTeamDisplayName(miniGame.teamB);
    const scoreA = miniGame.scoreA || 0;
    const scoreB = miniGame.scoreB || 0;
    
    // Get scorers for each team
    const teamAScorers = getTeamScorers(miniGame, miniGame.teamA);
    const teamBScorers = getTeamScorers(miniGame, miniGame.teamB);
    
    return `
        <div class="game-score-layout">
            <div class="score-line">
                <div class="team-score-section">
                    <div class="team-name">${teamAName}</div>
                    <div class="team-scorers">${teamAScorers}</div>
                </div>
                <div class="score-center">${scoreA} - ${scoreB}</div>
                <div class="team-score-section">
                    <div class="team-name">${teamBName}</div>
                    <div class="team-scorers">${teamBScorers}</div>
                </div>
            </div>
        </div>
    `;
}

// Get scorers for a specific team
function getTeamScorers(miniGame, teamLetter) {
    if (!miniGame.scorers || miniGame.scorers.length === 0) return '';
    
    const teamPlayers = teams[teamLetter] || [];
    const scorers = [];
    
    // Get all goals from live goals if available, otherwise use scorers data
    const goals = getGoalsForTeam(miniGame, teamLetter);
    
    goals.forEach(goal => {
        const scorer = allPlayers.find(p => p.id === goal.scorerId);
        if (scorer) {
            let scorerText = scorer.name;
            
            // Add assister name in parentheses if available
            if (goal.assisterId) {
                const assister = allPlayers.find(p => p.id === goal.assisterId);
                if (assister) {
                    scorerText += `(${assister.name})`;
                }
            }
            
            scorers.push(scorerText);
        }
    });
    
    return scorers.join(', ');
}

// Get goals for a specific team from live goals or scorers data
function getGoalsForTeam(miniGame, teamLetter) {
    const teamPlayers = teams[teamLetter] || [];
    const goals = [];
    
    // First try to get from live goals (more detailed)
    if (miniGame.liveGoals && miniGame.liveGoals.length > 0) {
        miniGame.liveGoals.forEach(goal => {
            if (teamPlayers.includes(goal.scorerId)) {
                goals.push({
                    scorerId: goal.scorerId,
                    assisterId: goal.assisterId
                });
            }
        });
    } else if (miniGame.scorers && miniGame.scorers.length > 0) {
        // Fallback to scorers data (less detailed, no assist info)
        miniGame.scorers.forEach(scorer => {
            if (scorer.goals > 0 && teamPlayers.includes(scorer.playerId)) {
                // Add one entry for each goal
                for (let i = 0; i < scorer.goals; i++) {
                    goals.push({
                        scorerId: scorer.playerId,
                        assisterId: null // No assist info available in scorers format
                    });
                }
            }
        });
    }
    
    return goals;
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
    
    // Update stopwatch game selection dropdown
    updateTimerGameSelection();
    
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
            goToStep(1); // Return to main admin page
        }, 1500);
        return;
    }
    
    showLoadingWithTimeout(true, 15000);
    
    try {
        console.log('Ending game night with mini games:', miniGames);
        
        // Update the current game day data and mark as completed
        currentGameDay.miniGames = miniGames;
        currentGameDay.playerStats = playerStats;
        currentGameDay.status = 3; // completed
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
            
            // Calculate mini games played by this player
            const playerMiniGamesCount = miniGames.filter(game => {
                // Check if player participated in this mini game
                const teamAPlayers = teams[game.teamA] || [];
                const teamBPlayers = teams[game.teamB] || [];
                return teamAPlayers.includes(playerId) || teamBPlayers.includes(playerId);
            }).length;
            
            // Update stats including new fields
            const updateData = {};
            
            // Only update if there's a difference to avoid incrementing by 0
            if (statsDiff.goals !== 0 || statsDiff.assists !== 0 || statsDiff.wins !== 0) {
                updateData.goals = increment(statsDiff.goals);
                updateData.assists = increment(statsDiff.assists);
                updateData.wins = increment(statsDiff.wins);
            }
            
            // Always increment game nights and mini games for participating players
            updateData.totalGameNights = increment(1);
            updateData.totalMiniGames = increment(playerMiniGamesCount);
            
            batch.update(playerRef, updateData);
            
            console.log(`Player ${playerId} stats update:`, {
                ...statsDiff,
                gameNights: 1,
                miniGames: playerMiniGamesCount
            });
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
    
    // If going to step 1, show dashboard tab
    if (stepNumber === 1) {
        switchToTab('dashboard');
        // Complete reset when going back to main dashboard
        startFreshSession();
        currentStep = stepNumber;
        return;
    }
    
    // For steps 2-5, ensure we're in game management tab
    switchToTab('game-management');
    
    // Show progress container
    const progressContainer = document.getElementById('game-progress-container');
    if (progressContainer) progressContainer.classList.remove('hidden');
    
    // Hide main game management view
    const gameManagementMain = document.getElementById('game-management-main');
    if (gameManagementMain) gameManagementMain.classList.add('hidden');
    
    document.querySelectorAll('.admin-step').forEach(step => {
        step.classList.add('hidden');
        step.classList.remove('active');
    });
    
    document.getElementById(`step-${stepNumber}`).classList.remove('hidden');
    document.getElementById(`step-${stepNumber}`).classList.add('active');
    
    // Update current step
    currentStep = stepNumber;
    
    // Special handling for different steps
    if (stepNumber === 4) {
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
        const stopwatchSection = document.getElementById('live-stopwatch-section');
        
        if (isViewOnlyMode) {
            // Hide action buttons in view-only mode
            if (addGameBtn) addGameBtn.style.display = 'none';
            if (finalizeBtn) finalizeBtn.style.display = 'none';
            if (liveControls) liveControls.style.display = 'none';
            if (stopwatchSection) stopwatchSection.style.display = 'none';
        } else if (isEditMode && currentGameDay && currentGameDay.status === 3) {
            // In edit mode for completed games, hide stopwatch but show other controls
            if (addGameBtn) addGameBtn.style.display = 'block';
            if (finalizeBtn) finalizeBtn.style.display = 'none'; // Hide finalize for completed games
            if (liveControls) liveControls.style.display = 'block';
            if (stopwatchSection) stopwatchSection.style.display = 'none'; // Hide stopwatch for completed games
        } else {
            // Show all controls for live/new games
            if (addGameBtn) addGameBtn.style.display = 'block';
            if (finalizeBtn) finalizeBtn.style.display = 'block';
            if (liveControls) liveControls.style.display = 'block';
            if (stopwatchSection) stopwatchSection.style.display = 'block';
        }
        
        // Only initialize stopwatch for live/new games, not for completed games in edit mode
        if (!isViewOnlyMode && !(isEditMode && currentGameDay && currentGameDay.status === 3)) {
            initializeStopwatch();
            initializeNewGameInterface();
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

// Browser navigation protection
function setupBrowserNavigationProtection() {
    // Handle browser back/forward navigation
    window.addEventListener('popstate', async (event) => {
        if (isGameCreationInProgress()) {
            // Prevent the navigation
            history.pushState(null, null, window.location.href);
            
            // Show our custom draft confirmation popup
            const action = await showDraftConfirmationPopup();
            
            if (action === 'continue') {
                // User chose to continue creation - do nothing
                return;
            } else if (action === 'draft') {
                // Save as draft and allow navigation
                await saveDraftAndGoToMain();
                // After saving, allow the original navigation
                history.back();
            } else if (action === 'remove') {
                // Remove game and allow navigation
                await removeGameAndGoToMain();
                // After removing, allow the original navigation
                history.back();
            }
        }
    });
    
    // Push initial state for popstate handling
    history.pushState(null, null, window.location.href);
}

// Protect external navigation links
function setupExternalNavigationProtection() {
    // Find all links that navigate away from the current page
    const externalLinks = document.querySelectorAll('a[href]:not([href^="#"])');
    
    externalLinks.forEach(link => {
        link.addEventListener('click', async (event) => {
            if (isGameCreationInProgress()) {
                event.preventDefault();
                
                // Show our custom draft confirmation popup
                const action = await showDraftConfirmationPopup();
                
                if (action === 'continue') {
                    // User chose to continue creation - do nothing
                    return;
                } else if (action === 'draft') {
                    // Save as draft and allow navigation
                    await saveDraftAndGoToMain();
                    // After saving, navigate to the original destination
                    window.location.href = link.href;
                } else if (action === 'remove') {
                    // Remove game and allow navigation
                    await removeGameAndGoToMain();
                    // After removing, navigate to the original destination
                    window.location.href = link.href;
                }
            }
        });
    });
    
    // Also protect the subscription management link specifically
    const subscriptionLink = document.querySelector('a[href="admin-subscriptions.html"]');
    if (subscriptionLink) {
        subscriptionLink.addEventListener('click', async (event) => {
            if (isGameCreationInProgress()) {
                event.preventDefault();
                
                // Show our custom draft confirmation popup
                const action = await showDraftConfirmationPopup();
                
                if (action === 'continue') {
                    // User chose to continue creation - do nothing
                    return;
                } else if (action === 'draft') {
                    // Save as draft and allow navigation
                    await saveDraftAndGoToMain();
                    // After saving, navigate to subscriptions page
                    window.location.href = 'admin-subscriptions.html';
                } else if (action === 'remove') {
                    // Remove game and allow navigation
                    await removeGameAndGoToMain();
                    // After removing, navigate to subscriptions page
                    window.location.href = 'admin-subscriptions.html';
                }
            }
        });
    }
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
async function adminGoBack() {
    console.log('Back button clicked - Navigation history:', navigationHistory);
    if (navigationHistory.length > 0) {
        const previousStep = navigationHistory.pop();
        console.log('Going back to step:', previousStep);
        
        // Check if we're in the middle of creating a game and trying to go back to main dashboard
        if (previousStep === 1 && currentGameDay && !isEditMode && !isViewOnlyMode && isGameCreationInProgress()) {
            console.log('Game creation in progress, showing draft confirmation');
            // Put the step back in history since we might not navigate away
            navigationHistory.push(previousStep);
            updateBackButton();
            
            // Show draft confirmation popup
            const action = await showDraftConfirmationPopup();
            
            if (action === 'continue') {
                // User chose to continue creation - do nothing, stay on current step
                return;
            } else if (action === 'draft') {
                // Save as draft and go to main dashboard
                await saveDraftAndGoToMain();
                return;
            } else if (action === 'remove') {
                // Remove game and go to main dashboard
                await removeGameAndGoToMain();
                return;
            }
            
            // If user closed modal without choosing, stay on current step
            return;
        }
        
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

// Helper function to check if game creation is in progress
function isGameCreationInProgress() {
    // Game creation is in progress if:
    // 1. We have a current game day
    // 2. We're in steps 2, 3, or 4 (not step 1)
    // 3. The game is not finalized (no mini games completed or status is not final)
    return currentGameDay && 
           currentStep >= 2 && 
           (!currentGameDay.status || currentGameDay.status < 3) && // Not completed
           !isEditMode && 
           !isViewOnlyMode;
}

// Helper function to show draft confirmation popup
async function showDraftConfirmationPopup() {
    return new Promise((resolve) => {
        // Create modal HTML
        const modal = document.createElement('div');
        modal.className = 'draft-confirmation-modal';
        
        // Determine current progress for better messaging
        let progressText = '';
        if (currentStep === 2) {
            progressText = 'בחירת שחקנים';
        } else if (currentStep === 3) {
            progressText = 'חלוקת קבוצות';
        } else if (currentStep === 4) {
            progressText = 'ניהול משחקים';
        }
        
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>עצרת את היצירה באמצע</h3>
                </div>
                <div class="modal-body">
                    <p>אתה נמצא באמצע יצירת ערב משחק בשלב: <strong>${progressText}</strong></p>
                    <p>מה תרצה לעשות עם ערב המשחק?</p>
                    <div class="progress-indicator">
                        <div class="progress-step ${currentStep >= 2 ? 'completed' : ''}">
                            <span class="step-number">2</span>
                            <span class="step-label">בחירת שחקנים</span>
                        </div>
                        <div class="progress-step ${currentStep >= 3 ? 'completed' : ''}">
                            <span class="step-number">3</span>
                            <span class="step-label">חלוקת קבוצות</span>
                        </div>
                        <div class="progress-step ${currentStep >= 4 ? 'completed' : ''}">
                            <span class="step-number">4</span>
                            <span class="step-label">ניהול משחקים</span>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="primary-btn continue-creation-btn">חזור ליצירה</button>
                    <button class="secondary-btn save-draft-btn">שמור כטיוטה</button>
                    <button class="danger-btn remove-game-btn">מחק ערב משחק</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const continueBtn = modal.querySelector('.continue-creation-btn');
        const saveDraftBtn = modal.querySelector('.save-draft-btn');
        const removeGameBtn = modal.querySelector('.remove-game-btn');
        const backdrop = modal.querySelector('.modal-backdrop');
        
        const cleanup = () => {
            document.body.removeChild(modal);
        };
        
        continueBtn.addEventListener('click', () => {
            cleanup();
            resolve('continue');
        });
        
        saveDraftBtn.addEventListener('click', () => {
            cleanup();
            resolve('draft');
        });
        
        removeGameBtn.addEventListener('click', () => {
            cleanup();
            resolve('remove');
        });
        
        backdrop.addEventListener('click', () => {
            cleanup();
            resolve('continue'); // Default to continue if clicked outside
        });
    });
}

// Helper function to save game as draft and go to main dashboard
async function saveDraftAndGoToMain() {
    try {
        showLoadingWithTimeout(true, 10000);
        
        if (!DEMO_MODE && currentGameDay) {
            // Update game status to draft (0) and save current progress
            const draftGameDay = {
                ...currentGameDay,
                status: 0, // Draft status
                participants: selectedPlayers,
                teams: teams,
                miniGames: miniGames,
                playerStats: playerStats,
                lastModified: new Date().toISOString(),
                isDraft: true
            };
            
            console.log('Saving game as draft:', draftGameDay);
            const gameDayRef = doc(db, 'gameDays', currentGameDay.date);
            await setDoc(gameDayRef, draftGameDay);
            
            console.log('Game saved as draft successfully');
        }
        
        // Go to main dashboard
        goToStep(1);
        
        // Show success message
        setTimeout(() => {
            alert('ערב המשחק נשמר כטיוטה בהצלחה');
        }, 500);
        
    } catch (error) {
        console.error('Error saving draft:', error);
        alert('שגיאה בשמירת הטיוטה: ' + error.message);
    } finally {
        showLoadingWithTimeout(false);
    }
}

// Helper function to remove game and go to main dashboard
async function removeGameAndGoToMain() {
    try {
        showLoadingWithTimeout(true, 10000);
        
        if (!DEMO_MODE && currentGameDay) {
            console.log('Removing game day:', currentGameDay.date);
            const gameDayRef = doc(db, 'gameDays', currentGameDay.date);
            await deleteDoc(gameDayRef);
            
            console.log('Game day removed successfully');
        }
        
        // Go to main dashboard
        goToStep(1);
        
        // Show success message
        setTimeout(() => {
            alert('ערב המשחק נמחק בהצלחה');
        }, 500);
        
    } catch (error) {
        console.error('Error removing game day:', error);
        alert('שגיאה במחיקת ערב המשחק: ' + error.message);
    } finally {
        showLoadingWithTimeout(false);
    }
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
    
    // Setup date input indicators
    setupDateInputWithIndicators();
    
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
        // Check if game creation is in progress
        if (isGameCreationInProgress()) {
            const action = await showDraftConfirmationPopup();
            
            if (action === 'continue') {
                // User chose to continue creation - do nothing
                return;
            } else if (action === 'draft') {
                // Save as draft and proceed to history
                await saveDraftAndGoToMain();
                // Continue to show history after saving
            } else if (action === 'remove') {
                // Remove game and proceed to history
                await removeGameAndGoToMain();
                // Continue to show history after removing
            } else {
                // User closed modal - stay on current step
                return;
            }
        }
        
        // Add current step to navigation history
        navigationHistory.push(currentStep);
        updateBackButton();
        
        // Ensure we're in game management tab
        switchToTab('game-management');
        
        // Hide main game management view and show history view
        const gameManagementMain = document.getElementById('game-management-main');
        const progressContainer = document.getElementById('game-progress-container');
        
        if (gameManagementMain) gameManagementMain.classList.add('hidden');
        if (progressContainer) progressContainer.classList.add('hidden');
        
        document.getElementById('history-view').classList.remove('hidden');
        
        // Load game day history
        await loadGameDayHistory();
        
    } catch (error) {
        console.error('Error showing game history:', error);
        alert('שגיאה בטעינת היסטוריית המשחקים: ' + error.message);
    }
}

function backToCreate() {
    // Hide history view and show main game management view
    document.getElementById('history-view').classList.add('hidden');
    
    const gameManagementMain = document.getElementById('game-management-main');
    const progressContainer = document.getElementById('game-progress-container');
    
    if (gameManagementMain) gameManagementMain.classList.remove('hidden');
    if (progressContainer) progressContainer.classList.add('hidden');
    
    // Ensure we're in game management tab
    switchToTab('game-management');
    
    // Reset game day state when going back to main dashboard
    resetGameDayState();
    
    // Remove last item from navigation history and update back button
    if (navigationHistory.length > 0) {
        navigationHistory.pop();
        updateBackButton();
    }
    
    // Reset current step
    currentStep = 1;
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
                status: normalizeStatus(data.status),
                playerStats: data.playerStats || {},
                teams: data.teams || {} // Add teams data loading
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
            status: 3,
            playerStats: {'demo-player-1': {goals: 3, assists: 1, wins: 2}}
        },
        {
            id: '2024-01-15',
            date: '2024-01-15',
            participants: ['שחקן 4', 'שחקן 5', 'שחקן 6'],
            miniGames: [{}, {}],
            status: 3,
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
        
        // Use the STATUS mapping for proper text and class
        let statusText, statusClass;
        switch (gameDay.status) {
            case 0:
                statusText = 'טיוטה';
                statusClass = 'draft';
                break;
            case 1:
                statusText = 'עתידי';
                statusClass = 'upcoming';
                break;
            case 2:
                statusText = 'חי';
                statusClass = 'live';
                break;
            case 3:
                statusText = 'הושלם';
                statusClass = 'completed';
                break;
            case 4:
                statusText = 'לא הושלם';
                statusClass = 'not-completed';
                break;
            default:
                statusText = 'טיוטה';
                statusClass = 'draft';
        }
        
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
                    ${gameDay.status === 3 && currentUserRole !== 'super-admin' ? 
                        // Completed games - only super-admin can edit
                        `<button class="secondary-btn" onclick="viewGameDayDetails('${gameDay.id}')">צפה</button>` :
                        // All other statuses or super-admin
                        `<button class="secondary-btn" onclick="editGameDay('${gameDay.id}')">ערוך</button>
                         <button class="secondary-btn" onclick="viewGameDayDetails('${gameDay.id}')">צפה</button>
                         <button class="delete-btn" onclick="deleteGameDay('${gameDay.id}', '${dateFormatted}')">מחק</button>`
                    }
                </div>
            </div>
        `;
    });
    
    historyList.innerHTML = html;
}

async function editGameDay(gameDayId) {
    try {
        console.log('Loading game day for editing:', gameDayId);
        
        // First, check if this is a completed game and user has permission
        if (!DEMO_MODE) {
            const docRef = doc(db, 'gameDays', gameDayId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const gameData = docSnap.data();
                if (gameData.status === 3 && currentUserRole !== 'super-admin') {
                    alert('רק מנהל על יכול לערוך ערבי משחק שהושלמו');
                    return;
                }
            }
        }
        
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
                status: 0 // draft
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
            // Demo mode - refresh the appropriate view
            console.log('Demo mode: Simulating game day deletion');
            alert('מצב דמו: ערב המשחק "נמחק" (לא נשמר בפועל)');
            
            // Check which view is currently active and refresh accordingly
            const gameManagementMain = document.getElementById('game-management-main');
            const historyView = document.getElementById('history-view');
            const activeTab = document.querySelector('.admin-tab.active');
            
            if (activeTab && activeTab.dataset.tab === 'game-management' && 
                gameManagementMain && !gameManagementMain.classList.contains('hidden')) {
                // We're in the game management tab main view
                await loadAllGamesForManagement();
            } else if (historyView && !historyView.classList.contains('hidden')) {
                // We're in the history view
                await loadGameDayHistory();
            } else {
                // Default to refreshing both dashboard and game management
                await checkForLiveGames();
                await loadAllGamesForManagement();
            }
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
        
        // Check which view is currently active and refresh accordingly
        const gameManagementMain = document.getElementById('game-management-main');
        const historyView = document.getElementById('history-view');
        const activeTab = document.querySelector('.admin-tab.active');
        
        if (activeTab && activeTab.dataset.tab === 'game-management' && 
            gameManagementMain && !gameManagementMain.classList.contains('hidden')) {
            // We're in the game management tab main view
            await loadAllGamesForManagement();
        } else if (historyView && !historyView.classList.contains('hidden')) {
            // We're in the history view
            await loadGameDayHistory();
        } else {
            // Default to refreshing both dashboard and game management
            await checkForLiveGames();
            await loadAllGamesForManagement();
        }
        
    } catch (error) {
        console.error('Error deleting game day:', error);
        alert('שגיאה במחיקת ערב המשחק: ' + error.message);
    }
}

// Function to get all existing game dates
async function getExistingGameDates() {
    try {
        let existingDates = [];
        
        if (DEMO_MODE) {
            // Demo mode - return some sample dates
            const today = getTodayIsrael();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfter = new Date();
            dayAfter.setDate(dayAfter.getDate() + 3);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            
            const tomorrowIsrael = tomorrow.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' });
            const dayAfterIsrael = dayAfter.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' });
            const yesterdayIsrael = yesterday.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' });
            const twoDaysAgoIsrael = twoDaysAgo.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' });
            
            existingDates = [today, tomorrowIsrael, dayAfterIsrael, yesterdayIsrael, twoDaysAgoIsrael];
        } else {
            // Get all game dates from Firestore
            const gameDaysSnapshot = await getDocs(collection(db, 'gameDays'));
            existingDates = gameDaysSnapshot.docs.map(doc => doc.id);
        }
        
        return existingDates;
    } catch (error) {
        console.error('Error getting existing game dates:', error);
        return [];
    }
}

// Function to setup date input with existing games indicators
async function setupDateInputWithIndicators() {
    try {
        const existingDates = await getExistingGameDates();
        const dateInput = document.getElementById('game-date');
        
        if (!dateInput) return;
        
        // Store existing dates for validation
        window.existingGameDates = existingDates;
        
        // Add event listener for date change to show validation
        dateInput.addEventListener('change', function() {
            validateSelectedDate(this.value);
        });
        
        // Add custom styling for existing dates
        addDateIndicators(existingDates);
        
    } catch (error) {
        console.error('Error setting up date indicators:', error);
    }
}

// Function to add visual indicators for existing game dates
function addDateIndicators(existingDates) {
    // Create a style element for custom date styling
    const styleId = 'date-indicators-style';
    let existingStyle = document.getElementById(styleId);
    
    if (existingStyle) {
        existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    
    // Generate CSS for each existing date
    let css = '';
    existingDates.forEach(date => {
        // Convert date to the format used by date input
        const dateForInput = date; // Already in YYYY-MM-DD format
        css += `
            input[type="date"][value="${dateForInput}"] {
                background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ff6b35"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>') !important;
                background-repeat: no-repeat !important;
                background-position: right 10px center !important;
                background-size: 20px 20px !important;
                border-color: #ff6b35 !important;
            }
        `;
    });
    
    style.textContent = css;
    document.head.appendChild(style);
}

// Function to validate selected date
function validateSelectedDate(selectedDate) {
    const existingDates = window.existingGameDates || [];
    const messageDiv = document.getElementById('date-validation-message');
    
    // Remove existing message
    if (messageDiv) {
        messageDiv.remove();
    }
    
    if (existingDates.includes(selectedDate)) {
        // Show warning message
        const dateInput = document.getElementById('game-date');
        const warningDiv = document.createElement('div');
        warningDiv.id = 'date-validation-message';
        warningDiv.className = 'date-validation-warning';
        warningDiv.innerHTML = `
            <div class="warning-content">
                <span class="warning-icon">⚠️</span>
                <span class="warning-text">קיים כבר ערב משחק בתאריך זה</span>
            </div>
        `;
        
        dateInput.parentNode.insertBefore(warningDiv, dateInput.nextSibling);
        
        // Disable create button
        const createBtn = document.getElementById('create-gameday-btn');
        if (createBtn) {
            createBtn.disabled = true;
            createBtn.textContent = 'תאריך כבר תפוס';
        }
    } else {
        // Enable create button
        const createBtn = document.getElementById('create-gameday-btn');
        if (createBtn) {
            createBtn.disabled = false;
            createBtn.textContent = 'צור ערב משחק';
        }
    }
}

// Live Games Management
async function checkForLiveGames() {
    try {
        // First, update expired live games to not completed
        await updateExpiredLiveGames();
        
        // Then, update today's games from upcoming to live
        await updateTodayGameStatus();
        
        const today = getTodayIsrael();
        console.log('Checking for live games on:', today);
        
        let liveGame = null;
        let upcomingGames = [];
        let draftGames = [];
        
        if (DEMO_MODE) {
            // Demo mode - create a demo live game for today and upcoming games
            liveGame = {
                id: today,
                date: today,
                participants: ['demo-player-1', 'demo-player-2', 'demo-player-3'],
                teams: { A: ['demo-player-1'], B: ['demo-player-2'], C: ['demo-player-3'] },
                miniGames: [],
                status: 1 // ready
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
                    status: 1 // ready
                },
                {
                    id: dayAfterIsrael,
                    date: dayAfterIsrael,
                    participants: ['demo-player-1', 'demo-player-2'],
                    teams: { A: ['demo-player-1'], B: ['demo-player-2'], C: [] },
                    miniGames: [],
                    status: 1 // ready
                }
            ];
            
            // Create demo draft games
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            
            const yesterdayIsrael = yesterday.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' });
            const twoDaysAgoIsrael = twoDaysAgo.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jerusalem' });
            
            draftGames = [
                {
                    id: yesterdayIsrael,
                    date: yesterdayIsrael,
                    participants: ['demo-player-1', 'demo-player-2', 'demo-player-3', 'demo-player-4'],
                    teams: { A: ['demo-player-1'], B: ['demo-player-2'], C: ['demo-player-3'] },
                    miniGames: [],
                    status: 0 // draft
                },
                {
                    id: twoDaysAgoIsrael,
                    date: twoDaysAgoIsrael,
                    participants: ['demo-player-1', 'demo-player-2'],
                    teams: { A: [], B: [], C: [] },
                    miniGames: [],
                    status: 0 // draft
                }
            ];
        } else {
            // Use cached data instead of fresh database reads
            const allGames = await loadAllGamesFromCache();
            
            allGames.forEach((game) => {
                const gameStatus = game.status;
                
                // Check for today's live game
                if (game.date === today && (gameStatus === 1 || gameStatus === 2)) {
                    liveGame = game;
                }
                
                // Upcoming games (future dates with status 1 or 2)
                if (game.date > today && (gameStatus === 1 || gameStatus === 2)) {
                    upcomingGames.push(game);
                }
                
                // Draft games (status 0, any date)
                if (gameStatus === 0) {
                    draftGames.push(game);
                }
            });
            
            // Sort upcoming games by date
            upcomingGames.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Sort draft games by date (newest first)
            draftGames.sort((a, b) => new Date(b.date) - new Date(a.date));
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
        
        // Show draft games section
        if (draftGames && draftGames.length > 0) {
            showDraftGamesSection(draftGames);
        } else {
            hideDraftGamesSection();
        }
        
        // Check and show no live game message for users
        checkAndShowNoLiveGameMessage();
        
    } catch (error) {
        console.error('Error checking for live and upcoming games:', error);
        hideLiveGameSection();
        hideUpcomingGamesSection();
        hideDraftGamesSection();
        // Also check for no live game message in case of error
        checkAndShowNoLiveGameMessage();
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

function showDraftGamesSection(draftGames) {
    const draftGamesSection = document.getElementById('draft-games-section');
    const draftGamesList = document.getElementById('draft-games-list');
    
    draftGamesList.innerHTML = '';
    
    draftGames.forEach(game => {
        const dateFormatted = new Date(game.date).toLocaleDateString('he-IL');
        const totalPlayers = game.participants.length;
        const totalGames = game.miniGames.length;
        
        const gameCard = document.createElement('div');
        gameCard.className = 'draft-game-card';
        gameCard.innerHTML = `
            <div class="draft-game-info">
                <div class="draft-game-date">${dateFormatted}</div>
                <div class="draft-game-actions">
                    <button class="continue-draft-btn" onclick="continueDraft('${game.id}')">המשך יצירה</button>
                    <button class="edit-draft-btn" onclick="editUpcomingGame('${game.id}')">ערוך</button>
                    <button class="delete-draft-btn" onclick="deleteUpcomingGame('${game.id}', '${dateFormatted}')">מחק</button>
                </div>
            </div>
            <div class="draft-game-details">
                <div class="draft-detail-item">
                    <div class="draft-detail-label">שחקנים</div>
                    <div class="draft-detail-value">${totalPlayers}</div>
                </div>
                <div class="draft-detail-item">
                    <div class="draft-detail-label">משחקים</div>
                    <div class="draft-detail-value">${totalGames}</div>
                </div>
                <div class="draft-detail-item">
                    <div class="draft-detail-label">קבוצות</div>
                    <div class="draft-detail-value">3</div>
                </div>
            </div>
        `;
        
        draftGamesList.appendChild(gameCard);
    });
    
    draftGamesSection.classList.remove('hidden');
}

function hideDraftGamesSection() {
    const draftGamesSection = document.getElementById('draft-games-section');
    draftGamesSection.classList.add('hidden');
}

// Function to continue a draft game from where it was left off
async function continueDraft(gameId) {
    try {
        console.log('Continuing draft game:', gameId);
        
        let gameData = null;
        
        if (DEMO_MODE) {
            // Demo mode - create demo draft data
            gameData = {
                id: gameId,
                date: gameId,
                participants: ['demo-player-1', 'demo-player-2', 'demo-player-3'],
                teams: { A: [], B: [], C: [] },
                miniGames: [],
                status: 0, // draft
                isDraft: true
            };
        } else {
            // Load from Firestore
            const gameDayRef = doc(db, 'gameDays', gameId);
            const gameDaySnap = await getDoc(gameDayRef);
            
            if (!gameDaySnap.exists()) {
                alert('טיוטת ערב המשחק לא נמצאה');
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
        
        // Load players if needed
        if (DEMO_MODE) {
            loadDemoPlayers();
        } else {
            await loadPlayers();
        }
        
        // Determine which step to continue from based on current progress
        let targetStep = 2; // Default to player selection
        
        if (selectedPlayers.length === 21) {
            completedSteps.add(1);
            completedSteps.add(2);
            targetStep = 3; // Go to team assignment
            
            // If teams are already assigned, go to mini-games
            if (teams.A.length === 7 && teams.B.length === 7 && teams.C.length === 7) {
                completedSteps.add(3);
                targetStep = 4; // Go to mini-games
                
                // Initialize player stats if not already done
                if (Object.keys(playerStats).length === 0) {
                    initializePlayerStats();
                }
            }
        } else {
            completedSteps.add(1);
        }
        
        console.log(`Continuing draft from step ${targetStep}`);
        
        // Navigate to the appropriate step
        goToStep(targetStep);
        
        // Render the appropriate view
        if (targetStep === 2) {
            renderPlayersGrid();
        } else if (targetStep === 3) {
            renderTeamAssignment();
        } else if (targetStep === 4) {
            renderAllMiniGames();
            updateStatsDisplay();
        }
        
        // Set up navigation history
        navigationHistory = [1];
        updateBackButton();
        
        console.log('Draft game loaded for continuation');
        
    } catch (error) {
        console.error('Error continuing draft game:', error);
        alert('שגיאה בטעינת טיוטת ערב המשחק: ' + error.message);
    }
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
                status: 1 // ready
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
        
        // Check which view is currently active and refresh accordingly
        const gameManagementMain = document.getElementById('game-management-main');
        const activeTab = document.querySelector('.admin-tab.active');
        
        if (activeTab && activeTab.dataset.tab === 'game-management' && 
            gameManagementMain && !gameManagementMain.classList.contains('hidden')) {
            // We're in the game management tab main view
            await loadAllGamesForManagement();
        } else {
            // Default to refreshing dashboard view
            await checkForLiveGames();
        }
        
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
            currentGameDay.status = 1; // Keep in live mode
            
            // Save to Firestore (use setDoc with merge to create if doesn't exist)
            const gameDayRef = doc(db, 'gameDays', currentGameDay.date);
            await setDoc(gameDayRef, {
                ...currentGameDay,
                miniGames: miniGames,
                playerStats: playerStats,
                status: 1 // Ensure it stays in live mode
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

// =================================
// Live Mini-Game Stopwatch System
// =================================

// Stopwatch state variables
let stopwatchState = {
    isRunning: false,
    isPaused: false,
    startTime: null,
    pausedTime: 0,
    currentGameId: null,
    timerInterval: null,
    liveGoals: []
};

// Initialize stopwatch when step 4 is loaded
function initializeStopwatch() {
    console.log('Initializing Live Mini-Game Stopwatch...');
    
    // Get DOM elements
    const startStopBtn = document.getElementById('start-stop-btn');
    const pauseResumeBtn = document.getElementById('pause-resume-btn');
    const timerGameSelect = document.getElementById('timer-game-select');
    const addGoalBtn = document.getElementById('add-goal-btn');
    
    // Add event listeners
    if (startStopBtn) {
        startStopBtn.addEventListener('click', handleStartStopClick);
    }
    if (pauseResumeBtn) {
        pauseResumeBtn.addEventListener('click', handlePauseResumeClick);
    }
    if (timerGameSelect) {
        timerGameSelect.addEventListener('change', handleGameSelectionChange);
    }
    if (addGoalBtn) {
        addGoalBtn.addEventListener('click', showGoalLoggingModal);
    }
    
    // Update game selection dropdown
    updateTimerGameSelection();
    
    // Reset stopwatch state
    resetStopwatchState();
    
    console.log('Stopwatch initialized successfully');
}

// Reset stopwatch to initial state
function resetStopwatchState() {
    stopwatchState = {
        isRunning: false,
        isPaused: false,
        startTime: null,
        pausedTime: 0,
        currentGameId: null,
        timerInterval: null,
        liveGoals: []
    };
    
    updateStopwatchDisplay();
    updateStopwatchControls();
    updateCurrentGameInfo();
}

// Update the timer game selection dropdown
function updateTimerGameSelection() {
    const timerGameSelect = document.getElementById('timer-game-select');
    if (!timerGameSelect) return;
    
    // Store current selection
    const currentSelection = timerGameSelect.value;
    
    // Clear existing options except the first one
    timerGameSelect.innerHTML = '<option value="">-- בחר משחק --</option>';
    
    // Add options for each mini-game
    miniGames.forEach((game, index) => {
        const gameNumber = game.gameNumber || (index + 1);
        let optionText = `משחק ${gameNumber}`;
        
        if (game.teamA && game.teamB) {
            const teamAName = getTeamDisplayName(game.teamA);
            const teamBName = getTeamDisplayName(game.teamB);
            
            // If game is completed, show results and disable
            if (game.durationSeconds) {
                const scoreA = game.scoreA || 0;
                const scoreB = game.scoreB || 0;
                optionText += ` - ${teamAName} ${scoreA}-${scoreB} ${teamBName} (הושלם)`;
            } else {
                optionText += ` - ${teamAName} נגד ${teamBName}`;
            }
        } else if (game.durationSeconds) {
            optionText += ' (הושלם)';
        }
        
        const option = document.createElement('option');
        option.value = game.id;
        option.textContent = optionText;
        
        // Disable completed games
        if (game.durationSeconds) {
            option.disabled = true;
            option.style.color = '#6c757d';
            option.style.fontStyle = 'italic';
        }
        
        timerGameSelect.appendChild(option);
    });
    
    // Restore selection if still valid and not completed
    if (currentSelection) {
        const currentGame = miniGames.find(g => g.id === currentSelection);
        if (currentGame && !currentGame.durationSeconds) {
            timerGameSelect.value = currentSelection;
        }
    }
}

// Handle game selection change
function handleGameSelectionChange(event) {
    const gameId = event.target.value;
    
    if (gameId) {
        stopwatchState.currentGameId = gameId;
        updateCurrentGameInfo();
        
        // Enable start button
        const startStopBtn = document.getElementById('start-stop-btn');
        if (startStopBtn) {
            startStopBtn.disabled = false;
        }
        
        // Load existing duration if available
        const selectedGame = miniGames.find(g => g.id === gameId);
        if (selectedGame && selectedGame.durationSeconds) {
            // If game has existing duration, show it but don't start timer
            displayTime(selectedGame.durationSeconds);
            updateStopwatchStatus('משחק הושלם');
        } else {
            // Reset display for new game
            displayTime(0);
            updateStopwatchStatus('מוכן להתחלה');
        }
        
        // Load existing live goals for this game
        loadLiveGoalsForGame(gameId);
    } else {
        stopwatchState.currentGameId = null;
        updateCurrentGameInfo();
        
        // Disable start button
        const startStopBtn = document.getElementById('start-stop-btn');
        if (startStopBtn) {
            startStopBtn.disabled = true;
        }
        
        resetStopwatchState();
    }
}

// Calculate live scores from goals
function calculateLiveScores(gameId) {
    const selectedGame = miniGames.find(g => g.id === gameId);
    if (!selectedGame) return { scoreA: 0, scoreB: 0 };
    
    let scoreA = 0;
    let scoreB = 0;
    
    // Count goals from live goals array
    stopwatchState.liveGoals.forEach(goal => {
        if (goal.team === selectedGame.teamA) {
            scoreA++;
        } else if (goal.team === selectedGame.teamB) {
            scoreB++;
        }
    });
    
    return { scoreA, scoreB };
}

// Update live score display
function updateLiveScoreDisplay() {
    const liveScoreDisplay = document.getElementById('live-score-display');
    const teamAName = document.getElementById('team-a-name');
    const teamBName = document.getElementById('team-b-name');
    const teamAScore = document.getElementById('team-a-score');
    const teamBScore = document.getElementById('team-b-score');
    
    if (!liveScoreDisplay || !teamAName || !teamBName || !teamAScore || !teamBScore) return;
    
    if (stopwatchState.currentGameId && (stopwatchState.isRunning || stopwatchState.isPaused)) {
        const selectedGame = miniGames.find(g => g.id === stopwatchState.currentGameId);
        if (selectedGame && selectedGame.teamA && selectedGame.teamB) {
            const teamADisplayName = getTeamDisplayName(selectedGame.teamA);
            const teamBDisplayName = getTeamDisplayName(selectedGame.teamB);
            const { scoreA, scoreB } = calculateLiveScores(stopwatchState.currentGameId);
            
            // Update team names and scores
            teamAName.textContent = teamADisplayName;
            teamBName.textContent = teamBDisplayName;
            teamAScore.textContent = scoreA;
            teamBScore.textContent = scoreB;
            
            // Show live score display
            liveScoreDisplay.style.display = 'block';
        } else {
            liveScoreDisplay.style.display = 'none';
        }
    } else {
        liveScoreDisplay.style.display = 'none';
    }
}

// Update current game info display
function updateCurrentGameInfo() {
    const currentGameTeams = document.getElementById('current-game-teams');
    if (!currentGameTeams) return;
    
    if (stopwatchState.currentGameId) {
        const selectedGame = miniGames.find(g => g.id === stopwatchState.currentGameId);
        if (selectedGame && selectedGame.teamA && selectedGame.teamB) {
            const teamAName = getTeamDisplayName(selectedGame.teamA);
            const teamBName = getTeamDisplayName(selectedGame.teamB);
            
            // Check if game is completed (has duration)
            if (selectedGame.durationSeconds) {
                const scoreA = selectedGame.scoreA || 0;
                const scoreB = selectedGame.scoreB || 0;
                currentGameTeams.textContent = `${teamAName} ${scoreA}-${scoreB} ${teamBName}`;
            } else {
                currentGameTeams.textContent = `${teamAName} נגד ${teamBName}`;
            }
        } else {
            currentGameTeams.textContent = 'משחק נבחר - הגדר קבוצות';
        }
    } else {
        currentGameTeams.textContent = 'בחר משחק להתחלה';
    }
    
    // Update live score display
    updateLiveScoreDisplay();
}

// Handle start/stop button click
function handleStartStopClick() {
    if (!stopwatchState.currentGameId) return;
    
    if (!stopwatchState.isRunning) {
        startStopwatch();
    } else {
        stopStopwatch();
    }
}

// Handle pause/resume button click
function handlePauseResumeClick() {
    if (!stopwatchState.isRunning) return;
    
    if (stopwatchState.isPaused) {
        resumeStopwatch();
    } else {
        pauseStopwatch();
    }
}

// Start the stopwatch
function startStopwatch() {
    console.log('Starting stopwatch for game:', stopwatchState.currentGameId);
    
    const now = Date.now();
    stopwatchState.startTime = now - stopwatchState.pausedTime;
    stopwatchState.isRunning = true;
    stopwatchState.isPaused = false;
    
    // Start the timer interval
    stopwatchState.timerInterval = setInterval(updateStopwatchDisplay, 100);
    
    // Update UI
    updateStopwatchControls();
    updateStopwatchStatus('משחק פעיל');
    
    // Show live goal logging interface
    showLiveGoalLogging();
    
    // Show live score display
    updateLiveScoreDisplay();
    
    // Add visual state class
    const stopwatchSection = document.getElementById('live-stopwatch-section');
    if (stopwatchSection) {
        stopwatchSection.classList.add('stopwatch-running');
    }
    
    // Lock all games during live play
    lockAllGamesForLivePlay();
    
    // Save start time to Firestore (optional)
    saveStopwatchStartTime();
}

// Pause the stopwatch
function pauseStopwatch() {
    console.log('Pausing stopwatch');
    
    stopwatchState.isPaused = true;
    stopwatchState.pausedTime = Date.now() - stopwatchState.startTime;
    
    // Clear timer interval
    if (stopwatchState.timerInterval) {
        clearInterval(stopwatchState.timerInterval);
        stopwatchState.timerInterval = null;
    }
    
    // Update UI
    updateStopwatchControls();
    updateStopwatchStatus('משחק מושהה');
    
    // Keep live score display visible during pause
    updateLiveScoreDisplay();
    
    // Add visual state class
    const stopwatchSection = document.getElementById('live-stopwatch-section');
    if (stopwatchSection) {
        stopwatchSection.classList.remove('stopwatch-running');
        stopwatchSection.classList.add('stopwatch-paused');
    }
}

// Resume the stopwatch
function resumeStopwatch() {
    console.log('Resuming stopwatch');
    
    stopwatchState.isPaused = false;
    stopwatchState.startTime = Date.now() - stopwatchState.pausedTime;
    
    // Start the timer interval
    stopwatchState.timerInterval = setInterval(updateStopwatchDisplay, 100);
    
    // Update UI
    updateStopwatchControls();
    updateStopwatchStatus('משחק פעיל');
    
    // Keep live score display visible during resume
    updateLiveScoreDisplay();
    
    // Add visual state class
    const stopwatchSection = document.getElementById('live-stopwatch-section');
    if (stopwatchSection) {
        stopwatchSection.classList.remove('stopwatch-paused');
        stopwatchSection.classList.add('stopwatch-running');
    }
}

// Stop the stopwatch
async function stopStopwatch() {
    console.log('Stopping stopwatch');
    
    // Show loading immediately
    console.log('About to show loading...');
    showGameCompletionLoading(true);
    console.log('Loading function called');
    
    // Safety timeout to prevent infinite loading (10 seconds)
    const safetyTimeout = setTimeout(() => {
        console.warn('Safety timeout triggered - hiding loading overlay');
        showGameCompletionLoading(false);
        
        // Force hide with backup method
        const overlay = document.getElementById('game-completion-loading');
        if (overlay) {
            overlay.style.display = 'none !important';
            console.log('Force hidden loading overlay due to safety timeout');
        }
        
        updateStopwatchStatus('זמן קצוב - נסה שוב');
        showToast('הפעולה ארכה יותר מדי. נסה שוב.', 'error');
    }, 10000);
    
    // Calculate final duration
    const finalDuration = stopwatchState.isPaused ? 
        Math.floor(stopwatchState.pausedTime / 1000) : 
        Math.floor((Date.now() - stopwatchState.startTime) / 1000);
    
    // Clear timer interval
    if (stopwatchState.timerInterval) {
        clearInterval(stopwatchState.timerInterval);
        stopwatchState.timerInterval = null;
    }
    
    // Update state
    stopwatchState.isRunning = false;
    stopwatchState.isPaused = false;
    
    // Update UI
    updateStopwatchControls();
    updateStopwatchStatus('שומר משחק...');
    
    // Hide live goal logging interface
    hideLiveGoalLogging();
    
    // Remove visual state classes
    const stopwatchSection = document.getElementById('live-stopwatch-section');
    if (stopwatchSection) {
        stopwatchSection.classList.remove('stopwatch-running', 'stopwatch-paused');
    }
    
    try {
        console.log('Starting to save stopwatch results...');
        // Save final duration and goals to mini-game
        await saveStopwatchResults(finalDuration);
        console.log('Stopwatch results saved successfully');
        
        // Update status to completed
        updateStopwatchStatus('משחק הושלם');
        
        // Show completion feedback
        showStopwatchCompletionFeedback(finalDuration);
        console.log('Game completion process finished successfully');
        
        // Note: Loading will be hidden after the UI cleanup is complete
    } catch (error) {
        console.error('Error saving game:', error);
        
        // Clear safety timeout
        clearTimeout(safetyTimeout);
        
        // Hide loading on error
        console.log('Hiding loading due to error...');
        showGameCompletionLoading(false);
        
        // Force hide immediately as backup
        const overlay = document.getElementById('game-completion-loading');
        if (overlay) {
            overlay.style.display = 'none !important';
            console.log('Force hidden loading overlay on error as backup');
        }
        
        // Update status to show error
        updateStopwatchStatus('שגיאה בשמירת המשחק');
        
        // Show error message
        showToast('שגיאה בשמירת המשחק. נסה שוב.', 'error');
        
        // Don't continue with the cleanup if save failed
        return;
    }
    
    // Hide stopwatch and show new game interface after completion
    setTimeout(() => {
        // Reset timer display
        displayTime(0);
        
        // Update current game info to show results
        updateCurrentGameInfo();
        
        // Update dropdown to disable completed game
        updateTimerGameSelection();
        
        // Clear game selection
        const timerGameSelect = document.getElementById('timer-game-select');
        if (timerGameSelect) {
            timerGameSelect.value = '';
        }
        
        // Reset stopwatch state
        stopwatchState.currentGameId = null;
        stopwatchState.pausedTime = 0;
        
        // Update UI
        updateCurrentGameInfo();
        updateStopwatchStatus('בחר משחק להתחלה');
        
        // Disable start button
        const startStopBtn = document.getElementById('start-stop-btn');
        if (startStopBtn) {
            startStopBtn.disabled = true;
        }
        
        // Unlock all games after completion
        unlockAllGamesAfterLivePlay();
        
        // Hide stopwatch and show new game interface
        hideStopwatchSection();
        showNewGameInterface();
        
        // Clear safety timeout now that everything is complete
        clearTimeout(safetyTimeout);
        
        // Hide loading overlay after UI cleanup is complete
        console.log('UI cleanup complete - hiding loading overlay...');
        showGameCompletionLoading(false);
        
        // Force hide immediately as backup
        const overlay = document.getElementById('game-completion-loading');
        if (overlay) {
            overlay.style.display = 'none !important';
            console.log('Force hidden loading overlay after UI cleanup');
        }
    }, 3000); // Wait 3 seconds to show completion feedback first
}

// Update stopwatch display
function updateStopwatchDisplay() {
    if (!stopwatchState.isRunning || stopwatchState.isPaused) {
        return;
    }
    
    const elapsed = Math.floor((Date.now() - stopwatchState.startTime) / 1000);
    displayTime(elapsed);
}

// Display time in MM:SS format
function displayTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    
    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay) {
        timeDisplay.textContent = timeString;
    }
}

// Update stopwatch controls
function updateStopwatchControls() {
    const startStopBtn = document.getElementById('start-stop-btn');
    const pauseResumeBtn = document.getElementById('pause-resume-btn');
    
    if (startStopBtn) {
        if (stopwatchState.isRunning) {
            startStopBtn.innerHTML = '<span class="btn-icon">⏹️</span><span class="btn-text">סיים משחק</span>';
            startStopBtn.classList.add('stop-mode');
        } else {
            startStopBtn.innerHTML = '<span class="btn-icon">▶️</span><span class="btn-text">התחל משחק</span>';
            startStopBtn.classList.remove('stop-mode');
        }
    }
    
    if (pauseResumeBtn) {
        if (stopwatchState.isRunning) {
            pauseResumeBtn.classList.remove('hidden');
            if (stopwatchState.isPaused) {
                pauseResumeBtn.innerHTML = '<span class="btn-icon">▶️</span><span class="btn-text">המשך</span>';
                pauseResumeBtn.classList.add('resume-mode');
            } else {
                pauseResumeBtn.innerHTML = '<span class="btn-icon">⏸️</span><span class="btn-text">השהה</span>';
                pauseResumeBtn.classList.remove('resume-mode');
            }
        } else {
            pauseResumeBtn.classList.add('hidden');
        }
    }
}

// Update stopwatch status text
function updateStopwatchStatus(status) {
    const stopwatchStatus = document.getElementById('stopwatch-status');
    if (stopwatchStatus) {
        stopwatchStatus.textContent = status;
    }
}

// Show live goal logging interface
function showLiveGoalLogging() {
    const liveGoalLogging = document.getElementById('live-goal-logging');
    if (liveGoalLogging) {
        liveGoalLogging.classList.remove('hidden');
    }
}

// Hide live goal logging interface
function hideLiveGoalLogging() {
    const liveGoalLogging = document.getElementById('live-goal-logging');
    if (liveGoalLogging) {
        liveGoalLogging.classList.add('hidden');
    }
}

// Show goal logging modal
function showGoalLoggingModal() {
    if (!stopwatchState.currentGameId || !stopwatchState.isRunning) return;
    
    const selectedGame = miniGames.find(g => g.id === stopwatchState.currentGameId);
    if (!selectedGame || !selectedGame.teamA || !selectedGame.teamB) {
        alert('יש להגדיר קבוצות למשחק לפני רישום שערים');
        return;
    }
    
    // Create modal HTML
    const modalHTML = `
        <div class="goal-logging-modal" id="goal-logging-modal">
            <div class="goal-logging-modal-content">
                <h3>⚽ רישום שער</h3>
                <div class="goal-form">
                    <div class="form-group">
                        <label for="goal-team-select">קבוצה מבקיעה:</label>
                        <select id="goal-team-select">
                            <option value="">-- בחר קבוצה --</option>
                            <option value="${selectedGame.teamA}">${getTeamDisplayName(selectedGame.teamA)}</option>
                            <option value="${selectedGame.teamB}">${getTeamDisplayName(selectedGame.teamB)}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="goal-scorer-select">מבקיע:</label>
                        <select id="goal-scorer-select" disabled>
                            <option value="">-- בחר מבקיע --</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="goal-assister-select">מבשל (אופציונלי):</label>
                        <select id="goal-assister-select" disabled>
                            <option value="">-- בחר מבשל --</option>
                        </select>
                    </div>
                </div>
                <div class="goal-form-actions">
                    <button class="goal-form-cancel" onclick="closeGoalLoggingModal()">ביטול</button>
                    <button class="goal-form-save" onclick="saveGoalFromModal()">שמור שער</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    const teamSelect = document.getElementById('goal-team-select');
    const scorerSelect = document.getElementById('goal-scorer-select');
    const assisterSelect = document.getElementById('goal-assister-select');
    
    teamSelect.addEventListener('change', () => {
        const selectedTeam = teamSelect.value;
        if (selectedTeam) {
            populatePlayerSelects(selectedTeam, scorerSelect, assisterSelect);
        } else {
            scorerSelect.disabled = true;
            assisterSelect.disabled = true;
            scorerSelect.innerHTML = '<option value="">-- בחר מבקיע --</option>';
            assisterSelect.innerHTML = '<option value="">-- בחר מבשל --</option>';
        }
    });
}

// Populate player selects based on team
function populatePlayerSelects(teamLetter, scorerSelect, assisterSelect) {
    const teamPlayers = teams[teamLetter] || [];
    
    // Clear existing options
    scorerSelect.innerHTML = '<option value="">-- בחר מבקיע --</option>';
    assisterSelect.innerHTML = '<option value="">-- בחר מבשל --</option>';
    
    // Add player options
    teamPlayers.forEach(playerId => {
        const player = allPlayers.find(p => p.id === playerId);
        if (player) {
            const scorerOption = document.createElement('option');
            scorerOption.value = playerId;
            scorerOption.textContent = player.name;
            scorerSelect.appendChild(scorerOption);
            
            const assisterOption = document.createElement('option');
            assisterOption.value = playerId;
            assisterOption.textContent = player.name;
            assisterSelect.appendChild(assisterOption);
        }
    });
    
    // Enable selects
    scorerSelect.disabled = false;
    assisterSelect.disabled = false;
}

// Close goal logging modal
function closeGoalLoggingModal() {
    const modal = document.getElementById('goal-logging-modal');
    if (modal) {
        modal.remove();
    }
}

// Save goal from modal
function saveGoalFromModal() {
    const teamSelect = document.getElementById('goal-team-select');
    const scorerSelect = document.getElementById('goal-scorer-select');
    const assisterSelect = document.getElementById('goal-assister-select');
    
    const team = teamSelect.value;
    const scorerId = scorerSelect.value;
    const assisterId = assisterSelect.value;
    
    if (!team || !scorerId) {
        alert('יש לבחור קבוצה ומבקיע');
        return;
    }
    
    // Get current time
    const currentTime = stopwatchState.isPaused ? 
        Math.floor(stopwatchState.pausedTime / 1000) : 
        Math.floor((Date.now() - stopwatchState.startTime) / 1000);
    
    // Create goal object
    const goal = {
        id: `goal-${Date.now()}`,
        time: currentTime,
        team: team,
        scorerId: scorerId,
        assisterId: assisterId || null,
        timestamp: new Date().toISOString()
    };
    
    // Add to live goals
    stopwatchState.liveGoals.push(goal);
    
    // Update live goals display
    updateLiveGoalsDisplay();
    
    // Close modal
    closeGoalLoggingModal();
    
    // Show feedback
    const scorerName = allPlayers.find(p => p.id === scorerId)?.name || 'לא ידוע';
    const timeString = `${Math.floor(currentTime / 60)}:${(currentTime % 60).toString().padStart(2, '0')}`;
    showToast(`שער נרשם: ${scorerName} (${timeString})`, 'success');
}

// Update live goals display
function updateLiveGoalsDisplay() {
    const liveGoalsList = document.getElementById('live-goals-list');
    if (!liveGoalsList) return;
    
    liveGoalsList.innerHTML = '';
    
    stopwatchState.liveGoals.forEach(goal => {
        const goalElement = document.createElement('div');
        goalElement.className = 'live-goal-item';
        goalElement.dataset.goalId = goal.id;
        
        const scorer = allPlayers.find(p => p.id === goal.scorerId);
        const assister = goal.assisterId ? allPlayers.find(p => p.id === goal.assisterId) : null;
        const timeString = `${Math.floor(goal.time / 60)}:${(goal.time % 60).toString().padStart(2, '0')}`;
        
        let goalText = scorer ? scorer.name : 'לא ידוע';
        if (assister) {
            goalText += ` (בישול: ${assister.name})`;
        }
        
        goalElement.innerHTML = `
            <div class="goal-info">
                <div class="goal-time">${timeString}</div>
                <div class="goal-details">${goalText}</div>
            </div>
            <button class="remove-goal-btn" onclick="removeLiveGoal('${goal.id}')">הסר</button>
        `;
        
        liveGoalsList.appendChild(goalElement);
    });
    
    // Update live score display whenever goals change
    updateLiveScoreDisplay();
}

// Remove live goal
function removeLiveGoal(goalId) {
    stopwatchState.liveGoals = stopwatchState.liveGoals.filter(g => g.id !== goalId);
    updateLiveGoalsDisplay();
    updateLiveScoreDisplay();
}

// Load existing live goals for a game
function loadLiveGoalsForGame(gameId) {
    const selectedGame = miniGames.find(g => g.id === gameId);
    if (selectedGame && selectedGame.liveGoals) {
        stopwatchState.liveGoals = [...selectedGame.liveGoals];
        updateLiveGoalsDisplay();
    } else {
        stopwatchState.liveGoals = [];
        updateLiveGoalsDisplay();
    }
    updateLiveScoreDisplay();
}

// Save stopwatch start time to Firestore (optional)
async function saveStopwatchStartTime() {
    if (DEMO_MODE || !stopwatchState.currentGameId) return;
    
    try {
        const selectedGame = miniGames.find(g => g.id === stopwatchState.currentGameId);
        if (selectedGame) {
            selectedGame.startTime = new Date().toISOString();
            
            // Auto-save if in live mode
            if (window.currentLiveGame) {
                await autoSaveLiveGame();
            }
        }
    } catch (error) {
        console.error('Error saving stopwatch start time:', error);
    }
}

// Save stopwatch results to mini-game
async function saveStopwatchResults(durationSeconds) {
    if (!stopwatchState.currentGameId) return;
    
    try {
        const selectedGame = miniGames.find(g => g.id === stopwatchState.currentGameId);
        if (selectedGame) {
            // Save duration
            selectedGame.durationSeconds = durationSeconds;
            
            // Lock the completed game by default
            selectedGame.isLocked = true;
            
            // Collapse the completed game by default
            selectedGame.isCollapsed = true;
            
            // Save live goals
            selectedGame.liveGoals = [...stopwatchState.liveGoals];
            
            // Process live goals into scorers format
            if (stopwatchState.liveGoals.length > 0) {
                processLiveGoalsIntoScorers(selectedGame);
            }
            
            // Auto-save if in live mode
            if (window.currentLiveGame) {
                console.log('Auto-saving live game to database...');
                try {
                    // Add timeout to prevent hanging
                    const savePromise = autoSaveLiveGame();
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Auto-save timeout')), 5000)
                    );
                    
                    await Promise.race([savePromise, timeoutPromise]);
                    console.log('Live game auto-save completed');
                } catch (error) {
                    console.warn('Auto-save failed or timed out:', error);
                    // Continue anyway - the local game data is saved
                }
            } else {
                console.log('No live game to auto-save');
            }
            
            console.log(`Saved stopwatch results for game ${stopwatchState.currentGameId}: ${durationSeconds} seconds, ${stopwatchState.liveGoals.length} goals`);
        }
    } catch (error) {
        console.error('Error saving stopwatch results:', error);
    }
}

// Process live goals into existing scorers format
function processLiveGoalsIntoScorers(game) {
    if (!game.scorers) {
        game.scorers = [];
    }
    
    // Process each live goal
    stopwatchState.liveGoals.forEach(goal => {
        // Find or create scorer entry
        let scorerEntry = game.scorers.find(s => s.playerId === goal.scorerId);
        if (!scorerEntry) {
            scorerEntry = {
                playerId: goal.scorerId,
                goals: 0,
                assists: 0
            };
            game.scorers.push(scorerEntry);
        }
        
        // Increment goals
        scorerEntry.goals++;
        
        // Handle assist
        if (goal.assisterId) {
            let assisterEntry = game.scorers.find(s => s.playerId === goal.assisterId);
            if (!assisterEntry) {
                assisterEntry = {
                    playerId: goal.assisterId,
                    goals: 0,
                    assists: 0
                };
                game.scorers.push(assisterEntry);
            }
            assisterEntry.assists++;
        }
    });
    
    // Update game scores based on live goals
    updateGameScoresFromLiveGoals(game);
    
    // Recalculate player stats
    recalculatePlayerStats();
    updateStatsDisplay();
}

// Update game scores based on live goals
function updateGameScoresFromLiveGoals(game) {
    let scoreA = 0;
    let scoreB = 0;
    
    stopwatchState.liveGoals.forEach(goal => {
        if (goal.team === game.teamA) {
            scoreA++;
        } else if (goal.team === game.teamB) {
            scoreB++;
        }
    });
    
    game.scoreA = scoreA;
    game.scoreB = scoreB;
    
    // Update winner
    if (scoreA > scoreB) {
        game.winner = game.teamA;
    } else if (scoreB > scoreA) {
        game.winner = game.teamB;
    } else {
        game.winner = null; // tie
    }
    
    // Update the mini-game display
    renderAllMiniGames();
}

// Show stopwatch completion feedback
function showStopwatchCompletionFeedback(durationSeconds) {
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    showToast(`משחק הושלם! משך זמן: ${timeString}`, 'success');
    
    // Update game selection dropdown to reflect completion
    updateTimerGameSelection();
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Add to toast container
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

// Show/hide game completion loading
function showGameCompletionLoading(show) {
    console.log('showGameCompletionLoading called with:', show);
    
    if (show) {
        // Create loading overlay if it doesn't exist
        let loadingOverlay = document.getElementById('game-completion-loading');
        if (!loadingOverlay) {
            console.log('Creating new loading overlay');
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'game-completion-loading';
            loadingOverlay.className = 'game-completion-loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">שומר משחק למסד הנתונים...</div>
                    <div class="loading-subtext">אנא המתן, אל תעזוב את הדף</div>
                </div>
            `;
            document.body.appendChild(loadingOverlay);
            console.log('Loading overlay created and added to body');
        }
        
        // Show loading with a small delay to ensure DOM is updated
        setTimeout(() => {
            loadingOverlay.classList.add('active');
            document.body.classList.add('game-completion-loading');
            console.log('Loading overlay activated');
        }, 10);
        
    } else {
        console.log('Hiding loading overlay');
        // Hide loading
        const loadingOverlay = document.getElementById('game-completion-loading');
        if (loadingOverlay) {
            console.log('Found loading overlay, removing active class');
            loadingOverlay.classList.remove('active');
            
            // Force hide with additional methods
            loadingOverlay.style.opacity = '0';
            loadingOverlay.style.visibility = 'hidden';
            loadingOverlay.style.display = 'none';
            
            console.log('Loading overlay deactivated and force hidden');
        } else {
            console.log('Loading overlay not found!');
        }
        
        // Re-enable interactions
        document.body.classList.remove('game-completion-loading');
        console.log('Body class removed, interactions re-enabled');
        
        // Additional cleanup after a short delay to ensure it's hidden
        setTimeout(() => {
            const overlay = document.getElementById('game-completion-loading');
            if (overlay) {
                overlay.remove();
                console.log('Loading overlay completely removed from DOM');
            }
        }, 500);
    }
}

// Clean up stopwatch when leaving step 4
function cleanupStopwatch() {
    if (stopwatchState.timerInterval) {
        clearInterval(stopwatchState.timerInterval);
    }
    
    // Close any open modals
    closeGoalLoggingModal();
    
    // Hide any loading states
    showGameCompletionLoading(false);
    
    // Reset state
    resetStopwatchState();
    
    console.log('Stopwatch cleaned up');
}

// Make functions available globally
window.editGameDay = editGameDay;
window.viewGameDayDetails = viewGameDayDetails;
window.deleteGameDay = deleteGameDay;
window.checkForLiveGames = checkForLiveGames;
window.manageLiveGame = manageLiveGame;
window.editUpcomingGame = editUpcomingGame;
window.deleteUpcomingGame = deleteUpcomingGame;
window.continueDraft = continueDraft;
window.autoSaveLiveGame = autoSaveLiveGame;
window.showGameSavedFeedback = showGameSavedFeedback;
window.toggleGameCollapse = toggleGameCollapse;
window.removeMiniGame = removeMiniGame;
window.adminGoBack = adminGoBack; 

function getStatusForDate(gameDate) {
    const now = luxon.DateTime.now().setZone('Asia/Jerusalem');
    const [year, month, day] = gameDate.split('-').map(Number);
    const gameDateObj = luxon.DateTime.fromObject({ year, month, day }, { zone: 'Asia/Jerusalem' });
    
    // Normalize both dates to start of day for proper comparison
    const nowDay = now.startOf('day');
    const gameDay = gameDateObj.startOf('day');
    
    console.log('getStatusForDate:', {
        gameDate,
        now: now.toISO(),
        gameDateObj: gameDateObj.toISO(),
        nowDay: nowDay.toISO(),
        gameDay: gameDay.toISO(),
        isToday: gameDay.equals(nowDay),
        isFuture: gameDay > nowDay,
        isPast: gameDay < nowDay
    });
    
    if (gameDay.equals(nowDay)) return 2; // live (today)
    if (gameDay > nowDay) return 1; // upcoming (future)
    return 3; // completed (past)
}

// Auto-update today's games from upcoming to live
async function updateTodayGameStatus() {
    if (DEMO_MODE) {
        console.log('Demo mode: Skipping auto-update of game status');
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
                await updateDoc(gameDayRef, {
                    status: 2
                });
                console.log('Successfully updated today\'s game status to live');
            } else {
                console.log('Today\'s game status is already:', normalizedStatus);
            }
        } else {
            console.log('No game found for today');
        }
        
    } catch (error) {
        console.error('Error updating today\'s game status:', error);
        // Don't show alert for this background operation
    }
}

// ===== SUBSCRIPTION MANAGEMENT =====

// Global variables for subscription management
let subscriptionAllPlayers = [];
let subscriptionAllSubscriptions = {};
let subscriptionCurrentDay = '';
let subscriptionCurrentSubscription = [];
let subscriptionFilteredPlayers = [];

// Day names mapping for subscriptions
const SUBSCRIPTION_DAY_NAMES = {
    'sunday': 'ראשון',
    'monday': 'שני',
    'tuesday': 'שלישי',
    'wednesday': 'רביעי',
    'thursday': 'חמישי'
};

// Initialize subscription management when tab is opened
async function initializeSubscriptionManagement() {
    try {
        const loader = document.getElementById('subscriptions-loader');
        const mainContent = document.getElementById('subscription-main-content');
        
        loader.classList.remove('hidden');
        
        // Load all players using cache
        console.log('Loading players for subscription management...');
        subscriptionAllPlayers = await loadAllPlayersFromCache();
        
        // Sort players by name
        subscriptionAllPlayers.sort((a, b) => a.name.localeCompare(b.name, 'he'));
        
        // Load all subscriptions
        console.log('Loading subscriptions...');
        await loadAllSubscriptions();
        
        // Populate copy selector
        populateSubscriptionCopySelector();
        
        // Setup event listeners
        setupSubscriptionEventListeners();
        
        // Render days overview
        renderSubscriptionDaysOverview();
        
        loader.classList.add('hidden');
        
        console.log(`Loaded ${subscriptionAllPlayers.length} players and ${Object.keys(subscriptionAllSubscriptions).length} subscriptions`);
        
    } catch (error) {
        console.error('Error initializing subscription management:', error);
        showSubscriptionStatusMessage('שגיאה בטעינת הנתונים: ' + error.message, 'error');
        document.getElementById('subscriptions-loader').classList.add('hidden');
    }
}

// Load all subscriptions from real-time cache
async function loadAllSubscriptions() {
    console.log('📦 Loading subscriptions from real-time cache...');
    
    // Wait for subscriptions cache to be initialized
    if (!realtimeCache.initialized.subscriptions) {
        await waitForCacheInitialization('subscriptions');
    }
    
    // Get subscriptions from real-time cache
    const subscriptionsData = getSubscriptionsFromCache();
    
    // Convert to the format expected by the subscription management UI
    subscriptionAllSubscriptions = {};
    Object.entries(subscriptionsData).forEach(([day, subscription]) => {
        subscriptionAllSubscriptions[day] = subscription.playerIds || [];
    });
    
    console.log(`✅ Loaded ${Object.keys(subscriptionAllSubscriptions).length} subscriptions from real-time cache`);
}

// Setup subscription event listeners
function setupSubscriptionEventListeners() {
    const backToOverviewBtn = document.getElementById('subscription-back-to-overview-btn');
    const playerSearch = document.getElementById('subscription-player-search');
    const copyFromDay = document.getElementById('subscription-copy-from-day');
    const copySubscriptionBtn = document.getElementById('subscription-copy-btn');
    const saveSubscriptionBtn = document.getElementById('subscription-save-btn');
    const deleteSubscriptionBtn = document.getElementById('subscription-delete-btn');
    
    if (backToOverviewBtn) backToOverviewBtn.addEventListener('click', showSubscriptionDaysOverview);
    if (playerSearch) playerSearch.addEventListener('input', handleSubscriptionPlayerSearch);
    if (copyFromDay) copyFromDay.addEventListener('change', handleSubscriptionCopyFromDayChange);
    if (copySubscriptionBtn) copySubscriptionBtn.addEventListener('click', copySubscription);
    if (saveSubscriptionBtn) saveSubscriptionBtn.addEventListener('click', saveSubscription);
    if (deleteSubscriptionBtn) deleteSubscriptionBtn.addEventListener('click', deleteSubscription);
}

// Show subscription days overview
function showSubscriptionDaysOverview() {
    const daysOverview = document.getElementById('subscription-days-overview');
    const playerManagement = document.getElementById('subscription-player-management');
    const playerSearch = document.getElementById('subscription-player-search');
    
    if (daysOverview) daysOverview.style.display = 'block';
    if (playerManagement) playerManagement.style.display = 'none';
    
    subscriptionCurrentDay = '';
    subscriptionCurrentSubscription = [];
    
    // Clear search
    if (playerSearch) playerSearch.value = '';
}

// Show subscription player management for a specific day
function showSubscriptionPlayerManagement(day) {
    subscriptionCurrentDay = day;
    // Create a copy to avoid modifying the original subscription
    subscriptionCurrentSubscription = [...(subscriptionAllSubscriptions[day] || [])];
    
    // Update UI
    const daysOverview = document.getElementById('subscription-days-overview');
    const playerManagement = document.getElementById('subscription-player-management');
    const currentDayTitle = document.getElementById('subscription-current-day-title');
    const deleteSubscriptionBtn = document.getElementById('subscription-delete-btn');
    const playerSearch = document.getElementById('subscription-player-search');
    
    if (daysOverview) daysOverview.style.display = 'none';
    if (playerManagement) playerManagement.style.display = 'block';
    if (currentDayTitle) currentDayTitle.textContent = `עריכת מנוי ליום ${SUBSCRIPTION_DAY_NAMES[day]}`;
    
    // Show/hide delete button based on existing subscription
    if (deleteSubscriptionBtn) {
        if (subscriptionAllSubscriptions[day] && subscriptionAllSubscriptions[day].length > 0) {
            deleteSubscriptionBtn.style.display = 'inline-block';
        } else {
            deleteSubscriptionBtn.style.display = 'none';
        }
    }
    
    renderSubscriptionPlayersList();
    updateSubscriptionSelectedCount();
    updateSubscriptionActionButtons();
    
    // Clear search
    if (playerSearch) playerSearch.value = '';
}

// Render subscription days overview
function renderSubscriptionDaysOverview() {
    const daysGrid = document.getElementById('subscription-days-grid');
    if (!daysGrid) return;
    
    daysGrid.innerHTML = Object.keys(SUBSCRIPTION_DAY_NAMES).map(day => {
        const dayName = SUBSCRIPTION_DAY_NAMES[day];
        const subscription = subscriptionAllSubscriptions[day] || [];
        const hasSubscription = subscription.length > 0;
        
        let actionsHTML = '';
        if (hasSubscription) {
            actionsHTML = `
                <div class="day-actions">
                    <button class="day-action-btn edit-subscription-btn" onclick="showSubscriptionPlayerManagement('${day}')" title="עריכה">
                        ✏️
                    </button>
                    <button class="day-action-btn delete-subscription-btn" onclick="confirmDeleteSubscription('${day}')" title="מחיקה">
                        🗑️
                    </button>
                </div>
            `;
        } else {
            actionsHTML = `
                <div class="day-actions">
                    <button class="day-action-btn add-subscription-btn" onclick="showSubscriptionPlayerManagement('${day}')" title="הוסף מנוי">
                        +
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="day-card ${hasSubscription ? 'has-subscription' : 'no-subscription'}">
                <div class="day-name">${dayName}</div>
                <div class="day-info">
                    ${hasSubscription ? `${subscription.length} שחקנים רשומים` : 'אין מנוי'}
                </div>
                ${actionsHTML}
            </div>
        `;
    }).join('');
}

// Global functions for subscription onclick handlers
window.showSubscriptionPlayerManagement = showSubscriptionPlayerManagement;
window.confirmDeleteSubscription = confirmDeleteSubscription;

// Handle subscription player search
function handleSubscriptionPlayerSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    if (searchTerm) {
        subscriptionFilteredPlayers = subscriptionAllPlayers.filter(player => 
            player.name.toLowerCase().includes(searchTerm)
        );
    } else {
        subscriptionFilteredPlayers = [];
    }
    
    renderSubscriptionPlayersList();
}

// Render subscription players list
function renderSubscriptionPlayersList() {
    const playersGrid = document.getElementById('subscription-players-grid');
    if (!playersGrid) return;
    
    const playersToShow = subscriptionFilteredPlayers.length > 0 ? subscriptionFilteredPlayers : subscriptionAllPlayers;
    
    playersGrid.innerHTML = playersToShow.map(player => {
        const isSelected = subscriptionCurrentSubscription.includes(player.id);
        const isDisabled = !isSelected && subscriptionCurrentSubscription.length >= 21;
        
        return `
            <div class="player-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}" 
                 onclick="toggleSubscriptionPlayer('${player.id}')">
                <div class="player-name">${player.name}</div>
                <div class="player-position">${player.position || 'שחקן'}</div>
            </div>
        `;
    }).join('');
}

// Toggle subscription player selection
function toggleSubscriptionPlayer(playerId) {
    const playerIndex = subscriptionCurrentSubscription.indexOf(playerId);
    
    if (playerIndex > -1) {
        // Remove player
        subscriptionCurrentSubscription.splice(playerIndex, 1);
    } else {
        // Add player (if not at limit)
        if (subscriptionCurrentSubscription.length < 21) {
            subscriptionCurrentSubscription.push(playerId);
        }
    }
    
    renderSubscriptionPlayersList();
    updateSubscriptionSelectedCount();
    updateSubscriptionActionButtons();
}

// Global function for subscription player toggle
window.toggleSubscriptionPlayer = toggleSubscriptionPlayer;

// Update subscription selected count
function updateSubscriptionSelectedCount() {
    const selectedCount = document.getElementById('subscription-selected-count');
    if (selectedCount) {
        const count = subscriptionCurrentSubscription.length;
        selectedCount.textContent = `נבחרו: ${count}/21`;
        selectedCount.style.color = count === 21 ? '#28a745' : count > 21 ? '#dc3545' : '#333';
    }
}

// Populate subscription copy selector
function populateSubscriptionCopySelector() {
    const copyFromDay = document.getElementById('subscription-copy-from-day');
    if (!copyFromDay) return;
    
    copyFromDay.innerHTML = '<option value="">-- בחר יום להעתקה --</option>';
    
    Object.keys(SUBSCRIPTION_DAY_NAMES).forEach(day => {
        if (day !== subscriptionCurrentDay && subscriptionAllSubscriptions[day] && subscriptionAllSubscriptions[day].length > 0) {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = `${SUBSCRIPTION_DAY_NAMES[day]} (${subscriptionAllSubscriptions[day].length} שחקנים)`;
            copyFromDay.appendChild(option);
        }
    });
}

// Handle subscription copy from day change
function handleSubscriptionCopyFromDayChange(event) {
    const copyBtn = document.getElementById('subscription-copy-btn');
    if (copyBtn) {
        copyBtn.disabled = !event.target.value;
    }
}

// Copy subscription from another day
function copySubscription() {
    const copyFromDay = document.getElementById('subscription-copy-from-day');
    if (!copyFromDay || !copyFromDay.value) return;
    
    const sourceDay = copyFromDay.value;
    const sourceSubscription = subscriptionAllSubscriptions[sourceDay] || [];
    
    if (sourceSubscription.length > 0) {
        subscriptionCurrentSubscription = [...sourceSubscription];
        renderSubscriptionPlayersList();
        updateSubscriptionSelectedCount();
        updateSubscriptionActionButtons();
        
        showSubscriptionStatusMessage(`הועתק מנוי מיום ${SUBSCRIPTION_DAY_NAMES[sourceDay]} (${sourceSubscription.length} שחקנים)`, 'success');
    }
}

// Update subscription action buttons
function updateSubscriptionActionButtons() {
    const saveBtn = document.getElementById('subscription-save-btn');
    const originalSubscription = subscriptionAllSubscriptions[subscriptionCurrentDay] || [];
    
    // Check if there are changes and exactly 21 players selected
    const hasChanges = JSON.stringify(subscriptionCurrentSubscription.sort()) !== JSON.stringify(originalSubscription.sort());
    const hasCorrectCount = subscriptionCurrentSubscription.length === 21;
    
    if (saveBtn) {
        saveBtn.disabled = !hasChanges || !hasCorrectCount;
    }
}

// Save subscription
async function saveSubscription() {
    if (subscriptionCurrentSubscription.length !== 21) {
        showSubscriptionStatusMessage('יש לבחור בדיוק 21 שחקנים', 'error');
        return;
    }
    
    const originalSubscription = subscriptionAllSubscriptions[subscriptionCurrentDay] || [];
    
    // Show confirmation if there are changes
    if (JSON.stringify(subscriptionCurrentSubscription.sort()) !== JSON.stringify(originalSubscription.sort())) {
        await showSubscriptionEditConfirmation(originalSubscription, subscriptionCurrentSubscription);
    }
}

// Show subscription edit confirmation
async function showSubscriptionEditConfirmation(originalPlayerIds, newPlayerIds) {
    const getPlayerName = (playerId) => {
        const player = subscriptionAllPlayers.find(p => p.id === playerId);
        return player ? player.name : playerId;
    };
    
    const addedPlayers = newPlayerIds.filter(id => !originalPlayerIds.includes(id));
    const removedPlayers = originalPlayerIds.filter(id => !newPlayerIds.includes(id));
    
    const addedPlayerNames = addedPlayers.map(getPlayerName);
    const removedPlayerNames = removedPlayers.map(getPlayerName);
    
    return showSubscriptionCustomConfirmation(addedPlayerNames, removedPlayerNames);
}

// Show subscription custom confirmation
function showSubscriptionCustomConfirmation(addedPlayerNames, removedPlayerNames) {
    return new Promise((resolve) => {
        const modal = document.getElementById('subscription-confirmation-modal');
        const modalTitle = document.getElementById('subscription-modal-title');
        const modalMessage = document.getElementById('subscription-modal-message');
        const changesSummary = document.getElementById('subscription-changes-summary');
        const cancelBtn = document.getElementById('subscription-modal-cancel-btn');
        const confirmBtn = document.getElementById('subscription-modal-confirm-btn');
        
        if (!modal) {
            resolve(false);
            return;
        }
        
        modalTitle.textContent = 'אישור שינויים במנוי';
        modalMessage.textContent = `האם אתה בטוח שברצונך לשמור את השינויים במנוי ליום ${SUBSCRIPTION_DAY_NAMES[subscriptionCurrentDay]}?`;
        
        // Build changes summary
        let summaryHTML = '';
        
        if (addedPlayerNames.length > 0) {
            summaryHTML += `
                <div class="change-section added">
                    <h4>שחקנים שנוספו (${addedPlayerNames.length}):</h4>
                    <div class="change-list">
                        ${addedPlayerNames.map(name => `<div class="change-item added"><span class="change-icon">+</span>${name}</div>`).join('')}
                    </div>
                </div>
            `;
        }
        
        if (removedPlayerNames.length > 0) {
            summaryHTML += `
                <div class="change-section removed">
                    <h4>שחקנים שהוסרו (${removedPlayerNames.length}):</h4>
                    <div class="change-list">
                        ${removedPlayerNames.map(name => `<div class="change-item removed"><span class="change-icon">-</span>${name}</div>`).join('')}
                    </div>
                </div>
            `;
        }
        
        changesSummary.innerHTML = summaryHTML;
        
        const handleConfirm = async () => {
            await saveSubscriptionToFirestore();
            resolve(true);
            cleanup();
        };
        
        const handleCancel = () => {
            resolve(false);
            cleanup();
        };
        
        const handleOverlayClick = (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        };
        
        const cleanup = () => {
            modal.style.display = 'none';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            modal.removeEventListener('click', handleOverlayClick);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        modal.addEventListener('click', handleOverlayClick);
        
        modal.style.display = 'flex';
    });
}

// Save subscription to Firestore
async function saveSubscriptionToFirestore() {
    try {
        if (DEMO_MODE) {
            console.log('Demo mode: Simulating subscription save');
            subscriptionAllSubscriptions[subscriptionCurrentDay] = [...subscriptionCurrentSubscription];
            showSubscriptionStatusMessage('מצב דמו: המנוי "נשמר" בהצלחה', 'success');
            renderSubscriptionDaysOverview();
            updateSubscriptionActionButtons();
            return;
        }
        
        const subscriptionRef = doc(db, 'subscriptions', subscriptionCurrentDay);
        await setDoc(subscriptionRef, {
            playerIds: subscriptionCurrentSubscription,
            dayOfWeek: subscriptionCurrentDay,
            lastUpdated: new Date().toISOString()
        });
        
        // Update local data
        subscriptionAllSubscriptions[subscriptionCurrentDay] = [...subscriptionCurrentSubscription];
        
        showSubscriptionStatusMessage('המנוי נשמר בהצלחה', 'success');
        renderSubscriptionDaysOverview();
        updateSubscriptionActionButtons();
        
        // Update delete button visibility
        const deleteBtn = document.getElementById('subscription-delete-btn');
        if (deleteBtn) {
            deleteBtn.style.display = 'inline-block';
        }
        
    } catch (error) {
        console.error('Error saving subscription:', error);
        showSubscriptionStatusMessage('שגיאה בשמירת המנוי: ' + error.message, 'error');
    }
}

// Delete subscription
async function deleteSubscription() {
    if (confirm(`האם אתה בטוח שברצונך למחוק את המנוי ליום ${SUBSCRIPTION_DAY_NAMES[subscriptionCurrentDay]}?`)) {
        await deleteSubscriptionForDay(subscriptionCurrentDay);
    }
}

// Confirm delete subscription
async function confirmDeleteSubscription(day) {
    if (confirm(`האם אתה בטוח שברצונך למחוק את המנוי ליום ${SUBSCRIPTION_DAY_NAMES[day]}?`)) {
        await deleteSubscriptionForDay(day);
    }
}

// Delete subscription for specific day
async function deleteSubscriptionForDay(day) {
    try {
        if (DEMO_MODE) {
            console.log('Demo mode: Simulating subscription deletion');
            delete subscriptionAllSubscriptions[day];
            showSubscriptionStatusMessage('מצב דמו: המנוי "נמחק" בהצלחה', 'success');
            renderSubscriptionDaysOverview();
            
            // If currently viewing this day, go back to overview
            if (subscriptionCurrentDay === day) {
                showSubscriptionDaysOverview();
            }
            return;
        }
        
        const subscriptionRef = doc(db, 'subscriptions', day);
        await deleteDoc(subscriptionRef);
        
        // Update local data
        delete subscriptionAllSubscriptions[day];
        
        showSubscriptionStatusMessage(`המנוי ליום ${SUBSCRIPTION_DAY_NAMES[day]} נמחק בהצלחה`, 'success');
        renderSubscriptionDaysOverview();
        
        // If currently viewing this day, go back to overview
        if (subscriptionCurrentDay === day) {
            showSubscriptionDaysOverview();
        }
        
    } catch (error) {
        console.error('Error deleting subscription:', error);
        showSubscriptionStatusMessage('שגיאה במחיקת המנוי: ' + error.message, 'error');
    }
}

// Show subscription status message
function showSubscriptionStatusMessage(message, type) {
    const statusMessage = document.getElementById('subscription-status-message');
    if (!statusMessage) return;
    
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);
}

// ===== PLAYER MANAGEMENT =====

// Global variables for player management
let playerManagementAllPlayers = [];
let playerManagementFilteredPlayers = [];
let currentEditingPlayer = null;
let playerSubscriptions = {}; // Store which players have subscriptions and for which days

// Initialize player management when tab is opened
async function initializePlayerManagement() {
    try {
        const loader = document.getElementById('players-loader');
        const mainContent = document.getElementById('player-management-main-content');
        
        loader.classList.remove('hidden');
        
        // Add retroactive fields to existing players
        await addRetroactiveFieldsToPlayers();
        
        // Load all players
        console.log('Loading players for management...');
        await loadAllPlayersForManagement();
        
        // Load subscription data for indicators
        console.log('Loading subscription data...');
        await loadPlayerSubscriptions();
        
        // Setup event listeners
        setupPlayerManagementEventListeners();
        
        // Render players list
        renderPlayersList();
        
        loader.classList.add('hidden');
        mainContent.style.display = 'block';
        
        console.log('Player management initialized successfully');
    } catch (error) {
        console.error('Error initializing player management:', error);
        showPlayerStatusMessage('שגיאה בטעינת נתוני השחקנים', 'error');
    }
}

// Load all players for management
async function loadAllPlayersForManagement() {
    try {
        // Use cached players data
        playerManagementAllPlayers = await loadAllPlayersFromCache();
 
        // Sort players by name
        playerManagementAllPlayers.sort((a, b) => a.name.localeCompare(b.name, 'he'));
        
        // Initialize filtered players
        playerManagementFilteredPlayers = [...playerManagementAllPlayers];
        
        console.log(`Loaded ${playerManagementAllPlayers.length} players for management`);
    } catch (error) {
        console.error('Error loading players for management:', error);
        throw error;
    }
}

// Load player subscriptions for indicators from real-time cache
async function loadPlayerSubscriptions() {
    try {
        playerSubscriptions = {};
        
        // Wait for subscriptions cache to be initialized
        if (!realtimeCache.initialized.subscriptions) {
            await waitForCacheInitialization('subscriptions');
        }
        
        // Get subscriptions from real-time cache
        const subscriptionsData = getSubscriptionsFromCache();
        
        // Map player IDs to their subscription days
        Object.entries(subscriptionsData).forEach(([day, subscription]) => {
            const playerIds = subscription.playerIds || [];
            playerIds.forEach(playerId => {
                if (!playerSubscriptions[playerId]) {
                    playerSubscriptions[playerId] = [];
                }
                playerSubscriptions[playerId].push(day);
            });
        });
        
        console.log(`✅ Loaded subscription data for ${Object.keys(playerSubscriptions).length} players from real-time cache`);
    } catch (error) {
        console.error('Error loading player subscriptions:', error);
        // Don't throw error - subscriptions are optional
    }
}

// Setup event listeners for player management
function setupPlayerManagementEventListeners() {
    // Add new player
    const addPlayerBtn = document.getElementById('add-player-btn');
    if (addPlayerBtn) {
        addPlayerBtn.addEventListener('click', addNewPlayer);
    }
    
    // Search players
    const playersSearch = document.getElementById('players-search');
    if (playersSearch) {
        playersSearch.addEventListener('input', filterPlayers);
    }
    
    // Subscription filter
    const subscriptionFilter = document.getElementById('subscription-filter');
    if (subscriptionFilter) {
        subscriptionFilter.addEventListener('change', filterPlayers);
    }
    
    // Back to players list
    const backToPlayersBtn = document.getElementById('back-to-players-btn');
    if (backToPlayersBtn) {
        backToPlayersBtn.addEventListener('click', showPlayersOverview);
    }
    
    // Save player changes
    const savePlayerBtn = document.getElementById('save-player-btn');
    if (savePlayerBtn) {
        savePlayerBtn.addEventListener('click', savePlayerChanges);
    }
    
    // Cancel edit
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', showPlayersOverview);
    }
    
    // Player delete confirmation modal
    const deleteModalCancelBtn = document.getElementById('player-delete-modal-cancel-btn');
    const deleteModalConfirmBtn = document.getElementById('player-delete-modal-confirm-btn');
    
    if (deleteModalCancelBtn) {
        deleteModalCancelBtn.addEventListener('click', hidePlayerDeleteModal);
    }
    
    if (deleteModalConfirmBtn) {
        deleteModalConfirmBtn.addEventListener('click', confirmPlayerDelete);
    }
    
    console.log('Player management event listeners set up');
}

// Filter players based on search and subscription
function filterPlayers() {
    const searchInput = document.getElementById('players-search');
    const subscriptionFilterInput = document.getElementById('subscription-filter');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const subscriptionFilter = subscriptionFilterInput ? subscriptionFilterInput.value : 'all';
    
    // Start with all players
    let filteredPlayers = [...playerManagementAllPlayers];
    
    // Apply search filter
    if (searchTerm !== '') {
        filteredPlayers = filteredPlayers.filter(player =>
            player.name.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply subscription filter
    if (subscriptionFilter !== 'all') {
        filteredPlayers = filteredPlayers.filter(player => {
            const playerSubscriptionDays = playerSubscriptions[player.id] || [];
            
            switch (subscriptionFilter) {
                case 'subscribed':
                    return playerSubscriptionDays.length > 0;
                case 'no-subscription':
                    return playerSubscriptionDays.length === 0;
                case 'sunday':
                case 'monday':
                case 'tuesday':
                case 'wednesday':
                case 'thursday':
                    return playerSubscriptionDays.includes(subscriptionFilter);
                default:
                    return true;
            }
        });
    }
    
    playerManagementFilteredPlayers = filteredPlayers;
    renderPlayersList();
}

// Render players list
function renderPlayersList() {
    const playersListContainer = document.getElementById('players-list');
    const playersCount = document.getElementById('players-count');
    
    if (!playersListContainer) return;
    
    // Update count with filter indication
    if (playersCount) {
        const totalPlayers = playerManagementAllPlayers.length;
        const filteredCount = playerManagementFilteredPlayers.length;
        
        if (filteredCount === totalPlayers) {
            playersCount.textContent = `סך הכל: ${totalPlayers} שחקנים`;
        } else {
            playersCount.textContent = `מציג: ${filteredCount} מתוך ${totalPlayers} שחקנים`;
        }
    }
    
    // Clear container
    playersListContainer.innerHTML = '';
    
    // Render players
    playerManagementFilteredPlayers.forEach(player => {
        const playerItem = createPlayerItem(player);
        playersListContainer.appendChild(playerItem);
    });
    
    if (playerManagementFilteredPlayers.length === 0) {
        playersListContainer.innerHTML = '<div class="no-players">לא נמצאו שחקנים התואמים לסינון</div>';
    }
}

// Helper function to get Hebrew day names
function getHebrewDayName(dayKey) {
    const dayNames = {
        'sunday': 'ראשון',
        'monday': 'שני',
        'tuesday': 'שלישי',
        'wednesday': 'רביעי',
        'thursday': 'חמישי',
        'friday': 'שישי',
        'saturday': 'שבת'
    };
    return dayNames[dayKey] || dayKey;
}

// Create player item element
function createPlayerItem(player) {
    const playerItem = document.createElement('div');
    playerItem.className = 'player-item';
    
    // Handle both field naming conventions for backward compatibility
    const goals = player.goals || player.totalGoals || 0;
    const assists = player.assists || player.totalAssists || 0;
    const wins = player.wins || player.totalWins || 0;
    const totalGameNights = player.totalGameNights || 0;
    const totalMiniGames = player.totalMiniGames || 0;
    
    // Get subscription indicators for this player
    const subscriptionDays = playerSubscriptions[player.id] || [];
    const subscriptionIndicators = subscriptionDays.map(day => 
        `<span class="subscription-indicator">מנוי ${getHebrewDayName(day)}</span>`
    ).join('');
    
    playerItem.innerHTML = `
        <div class="player-item-header">
            <div class="player-name-section">
                <h4 class="player-name">${player.name}</h4>
                ${subscriptionIndicators ? `<div class="subscription-indicators">${subscriptionIndicators}</div>` : ''}
            </div>
            <div class="player-actions">
                <button class="player-action-btn edit-player-btn" onclick="editPlayer('${player.id}')">
                    ✏️ ערוך
                </button>
                <button class="player-action-btn delete-player-btn" onclick="deletePlayer('${player.id}')">
                    🗑️ מחק
                </button>
            </div>
        </div>
        <div class="player-stats">
            <div class="player-stat-item">
                <div class="player-stat-label">⚽ שערים</div>
                <div class="player-stat-value">${goals}</div>
            </div>
            <div class="player-stat-item">
                <div class="player-stat-label">🎯 בישולים</div>
                <div class="player-stat-value">${assists}</div>
            </div>
            <div class="player-stat-item">
                <div class="player-stat-label">🏆 ניצחונות</div>
                <div class="player-stat-value">${wins}</div>
            </div>
            <div class="player-stat-item">
                <div class="player-stat-label">🌙 ערבים</div>
                <div class="player-stat-value">${totalGameNights}</div>
            </div>
            <div class="player-stat-item">
                <div class="player-stat-label">🎮 משחקים</div>
                <div class="player-stat-value">${totalMiniGames}</div>
            </div>
        </div>
    `;
    
    return playerItem;
}

// Add new player
async function addNewPlayer() {
    const firstNameInput = document.getElementById('new-player-first-name');
    const lastNameInput = document.getElementById('new-player-last-name');
    
    if (!firstNameInput || !lastNameInput) {
        showErrorToast('שגיאת מערכת', 'לא נמצאו שדות הקלט');
        return;
    }
    
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    
    if (!firstName || !lastName) {
        showErrorToast('שדות חובה חסרים', 'אנא הזן שם פרטי ושם משפחה');
        return;
    }
    
    const fullName = `${firstName} ${lastName}`;
    
    // Check if player already exists
    if (playerManagementAllPlayers.some(player => player.name === fullName)) {
        showErrorToast('שחקן כבר קיים', 'שחקן עם השם הזה כבר רשום במערכת');
        return;
    }
    
    try {
        const newPlayer = {
            name: fullName,
            goals: 0,
            assists: 0,
            wins: 0,
            totalGameNights: 0,
            totalMiniGames: 0
        };
        
        if (DEMO_MODE) {
            // In demo mode, just add to local array
            newPlayer.id = 'demo_' + Date.now();
            playerManagementAllPlayers.push(newPlayer);
            demoPlayers.push(newPlayer);
        } else {
            // Add to Firestore - use consistent field names
            const docRef = await addDoc(collection(db, 'players'), newPlayer);
            newPlayer.id = docRef.id;
            playerManagementAllPlayers.push(newPlayer);
        }
        
        // Clear form
        firstNameInput.value = '';
        lastNameInput.value = '';
        
        // Invalidate players cache
        invalidateCache('players');
        
        // Re-sort and re-render
        playerManagementAllPlayers.sort((a, b) => a.name.localeCompare(b.name, 'he'));
        
        // Refresh subscription data in case new player has subscriptions
        await loadPlayerSubscriptions();
        
        filterPlayers(); // This will re-render the list
        
        // Show success toast
        showSuccessToast('שחקן נוסף בהצלחה!', `${fullName} נוסף למערכת`);
        
    } catch (error) {
        console.error('Error adding new player:', error);
        showErrorToast('שגיאה בהוספת שחקן', 'אנא נסה שנית מאוחר יותר');
    }
}

// Edit player
function editPlayer(playerId) {
    const player = playerManagementAllPlayers.find(p => p.id === playerId);
    if (!player) return;
    
    currentEditingPlayer = player;
    
    // Handle both field naming conventions for backward compatibility
    const goals = player.goals || player.totalGoals || 0;
    const assists = player.assists || player.totalAssists || 0;
    const wins = player.wins || player.totalWins || 0;
    const totalGameNights = player.totalGameNights || 0;
    const totalMiniGames = player.totalMiniGames || 0;
    
    // Populate edit form
    document.getElementById('edit-player-first-name').value = player.name.split(' ')[0] || '';
    document.getElementById('edit-player-last-name').value = player.name.split(' ').slice(1).join(' ') || '';
    document.getElementById('edit-player-goals').value = goals;
    document.getElementById('edit-player-assists').value = assists;
    document.getElementById('edit-player-wins').value = wins;
    document.getElementById('edit-player-game-nights').value = totalGameNights;
    document.getElementById('edit-player-mini-games').value = totalMiniGames;
    
    // Update title
    document.getElementById('edit-player-title').textContent = `עריכת שחקן: ${player.name}`;
    
    // Show edit section
    showPlayerEditSection();
}

// Show player edit section
function showPlayerEditSection() {
    const playersOverview = document.getElementById('players-overview');
    const playerEditSection = document.getElementById('player-edit-section');
    
    if (playersOverview) playersOverview.style.display = 'none';
    if (playerEditSection) playerEditSection.style.display = 'block';
}

// Show players overview
function showPlayersOverview() {
    const playersOverview = document.getElementById('players-overview');
    const playerEditSection = document.getElementById('player-edit-section');
    
    if (playersOverview) playersOverview.style.display = 'block';
    if (playerEditSection) playerEditSection.style.display = 'none';
    
    currentEditingPlayer = null;
}

// Save player changes
async function savePlayerChanges() {
    if (!currentEditingPlayer) return;
    
    const firstName = document.getElementById('edit-player-first-name').value.trim();
    const lastName = document.getElementById('edit-player-last-name').value.trim();
    const goals = parseInt(document.getElementById('edit-player-goals').value) || 0;
    const assists = parseInt(document.getElementById('edit-player-assists').value) || 0;
    const wins = parseInt(document.getElementById('edit-player-wins').value) || 0;
    const totalGameNights = parseInt(document.getElementById('edit-player-game-nights').value) || 0;
    const totalMiniGames = parseInt(document.getElementById('edit-player-mini-games').value) || 0;
    
    if (!firstName || !lastName) {
        showErrorToast('שדות חובה חסרים', 'אנא הזן שם פרטי ושם משפחה');
        return;
    }
    
    const fullName = `${firstName} ${lastName}`;
    
    // Check if name already exists (but not for current player)
    if (fullName !== currentEditingPlayer.name && 
        playerManagementAllPlayers.some(player => player.name === fullName && player.id !== currentEditingPlayer.id)) {
        showErrorToast('שחקן כבר קיים', 'שחקן עם השם הזה כבר רשום במערכת');
        return;
    }
    
    try {
        const updatedPlayer = {
            name: fullName,
            goals: goals,
            assists: assists,
            wins: wins,
            totalGameNights: totalGameNights,
            totalMiniGames: totalMiniGames
        };
        
        if (DEMO_MODE) {
            // Update in demo data
            Object.assign(currentEditingPlayer, updatedPlayer);
            const demoPlayerIndex = demoPlayers.findIndex(p => p.id === currentEditingPlayer.id);
            if (demoPlayerIndex !== -1) {
                Object.assign(demoPlayers[demoPlayerIndex], updatedPlayer);
            }
        } else {
            // Update in Firestore - use consistent field names
            await updateDoc(doc(db, 'players', currentEditingPlayer.id), updatedPlayer);
            Object.assign(currentEditingPlayer, updatedPlayer);
        }
        
        // Invalidate players cache
        invalidateCache('players');
        
        // Re-sort and re-render
        playerManagementAllPlayers.sort((a, b) => a.name.localeCompare(b.name, 'he'));
        
        // Refresh subscription data in case player name changed
        await loadPlayerSubscriptions();
        
        filterPlayers(); // This will re-render the list
        
        // Show success toast
        showSuccessToast('שחקן עודכן בהצלחה!', `פרטי ${fullName} נשמרו במערכת`);
        
        // Return to overview
        showPlayersOverview();
        
    } catch (error) {
        console.error('Error saving player changes:', error);
        showErrorToast('שגיאה בשמירת השינויים', 'אנא נסה שנית מאוחר יותר');
    }
}

// Delete player
function deletePlayer(playerId) {
    const player = playerManagementAllPlayers.find(p => p.id === playerId);
    if (!player) return;
    
    showPlayerDeleteModal(player);
}

// Show player delete confirmation modal
function showPlayerDeleteModal(player) {
    const modal = document.getElementById('player-delete-confirmation-modal');
    const message = document.getElementById('player-delete-modal-message');
    
    if (!modal || !message) return;
    
    message.innerHTML = `
        <p><strong>האם אתה בטוח שברצונך למחוק את השחקן "${player.name}"?</strong></p>
        <p>השחקן יימחק מכל המשחקים והסטטיסטיקות שלו יאבדו לצמיתות.</p>
    `;
    
    // Store player ID for deletion
    modal.dataset.playerId = player.id;
    
    modal.style.display = 'flex';
}

// Hide player delete modal
function hidePlayerDeleteModal() {
    const modal = document.getElementById('player-delete-confirmation-modal');
    if (modal) {
        modal.style.display = 'none';
        delete modal.dataset.playerId;
    }
}

// Confirm player deletion
async function confirmPlayerDelete() {
    const modal = document.getElementById('player-delete-confirmation-modal');
    const playerId = modal?.dataset.playerId;
    
    if (!playerId) return;
    
    const player = playerManagementAllPlayers.find(p => p.id === playerId);
    if (!player) return;
    
    try {
        if (DEMO_MODE) {
            // Remove from demo data
            const playerIndex = playerManagementAllPlayers.findIndex(p => p.id === playerId);
            if (playerIndex !== -1) {
                playerManagementAllPlayers.splice(playerIndex, 1);
            }
            
            const demoPlayerIndex = demoPlayers.findIndex(p => p.id === playerId);
            if (demoPlayerIndex !== -1) {
                demoPlayers.splice(demoPlayerIndex, 1);
            }
        } else {
            // Delete from Firestore
            await deleteDoc(doc(db, 'players', playerId));
            
            // Remove from local array
            const playerIndex = playerManagementAllPlayers.findIndex(p => p.id === playerId);
            if (playerIndex !== -1) {
                playerManagementAllPlayers.splice(playerIndex, 1);
            }
        }
        
        // Invalidate players cache
        invalidateCache('players');
        
        // Refresh subscription data in case deleted player had subscriptions
        await loadPlayerSubscriptions();
        
        // Re-render list
        filterPlayers();
        
        // Show success toast
        showSuccessToast('שחקן נמחק בהצלחה!', `${player.name} הוסר מהמערכת`);
        
        // Hide modal
        hidePlayerDeleteModal();
        
    } catch (error) {
        console.error('Error deleting player:', error);
        showErrorToast('שגיאה במחיקת השחקן', 'אנא נסה שנית מאוחר יותר');
    }
}

// Show player status message
function showPlayerStatusMessage(message, type) {
    const statusMessage = document.getElementById('player-status-message');
    if (!statusMessage) return;
    
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);
}

// Make functions globally available
window.editPlayer = editPlayer;
window.deletePlayer = deletePlayer;

// ===== ADMIN MANAGEMENT FUNCTIONS =====

// Global variables for admin management
let adminManagementAllAdmins = [];
let currentUserEmail = '';
let currentUserRole = '';

// Make current user role available globally
window.currentUserRole = currentUserRole;

// Cache management
let gamesCache = {
    data: null,
    timestamp: 0,
    duration: 5 * 60 * 1000 // 5 minutes cache
};

let adminsCache = {
    data: null,
    timestamp: 0,
    duration: 10 * 60 * 1000 // 10 minutes cache
};

let playersCache = {
    data: null,
    timestamp: 0,
    duration: 15 * 60 * 1000 // 15 minutes cache for players
};

// Flag to prevent multiple simultaneous updates
let isUpdatingExpiredGames = false;

// Cached function to load all players
async function loadAllPlayersFromCache() {
    const now = Date.now();
    
    // Return cached data if still valid
    if (playersCache.data && (now - playersCache.timestamp) < playersCache.duration) {
        console.log('Using cached players data');
        return playersCache.data;
    }
    
    console.log('Loading fresh players data from Firestore');
    
    if (DEMO_MODE) {
        playersCache.data = [...demoPlayers];
    } else {
        // Load from Firestore
        const playersSnapshot = await getDocs(collection(db, 'players'));
        
        playersCache.data = [];
        playersSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.name) { // Only include players with names
                playersCache.data.push({
                    id: doc.id,
                    ...data
                });
            }
        });
    }
    
    playersCache.timestamp = now;
    console.log(`Loaded ${playersCache.data.length} players into cache`);
    return playersCache.data;
}

// Function to invalidate caches when data changes
function invalidateCache(cacheType = 'all') {
    if (cacheType === 'all' || cacheType === 'games') {
        gamesCache.timestamp = 0;
        console.log('Games cache invalidated');
    }
    if (cacheType === 'all' || cacheType === 'admins') {
        adminsCache.timestamp = 0;
        console.log('Admins cache invalidated');
    }
    if (cacheType === 'all' || cacheType === 'players') {
        playersCache.timestamp = 0;
        console.log('Players cache invalidated');
    }
}

// Initialize admin management
async function initializeAdminManagement() {
    console.log('Initializing admin management...');
    
    try {
        // Get current user email
        const user = auth.currentUser;
        if (user) {
            currentUserEmail = user.email;
        }
        
        // Show loading
        showAdminManagementLoading(true);
        
        // Load all admins
        await loadAllAdminsForManagement();
        
        // Setup event listeners
        setupAdminManagementEventListeners();
        
        // Hide loading and show content
        showAdminManagementLoading(false);
        showAdminManagementSections();
        
        console.log('Admin management initialized successfully');
    } catch (error) {
        console.error('Error initializing admin management:', error);
        showAdminStatusMessage('שגיאה בטעינת ממשק ניהול המנהלים', 'error');
        showAdminManagementLoading(false);
    }
}

// Load all admins from Firestore
async function loadAllAdminsForManagement() {
    try {
        if (DEMO_MODE) {
            // Demo mode - use hardcoded admin list
            adminManagementAllAdmins = [
                {
                    email: 'admin@example.com',
                    role: 'super-admin',
                    addedAt: new Date('2024-01-01'),
                    addedBy: 'system'
                },
                {
                    email: 'manager@example.com', 
                    role: 'admin',
                    addedAt: new Date('2024-01-15'),
                    addedBy: 'admin@example.com'
                }
            ];
        } else {
            // Use cached data for admin management
            const cachedAdmins = await loadAllAdminsFromCache();
            adminManagementAllAdmins = cachedAdmins.map(admin => ({
                id: admin.email, // Use email as ID
                ...admin,
                addedAt: admin.addedAt || new Date()
            }));
        }
        
        // Render admins list
        renderAdminsList();
        
        console.log(`Loaded ${adminManagementAllAdmins.length} admins`);
    } catch (error) {
        console.error('Error loading admins:', error);
        throw error;
    }
}

// Setup event listeners for admin management
function setupAdminManagementEventListeners() {
    // Add admin button
    const addAdminBtn = document.getElementById('add-admin-btn');
    if (addAdminBtn) {
        addAdminBtn.addEventListener('click', addNewAdmin);
    }
    
    // Enter key in email input
    const emailInput = document.getElementById('new-admin-email');
    if (emailInput) {
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addNewAdmin();
            }
        });
    }
}

// Render admins list
function renderAdminsList() {
    const adminsList = document.getElementById('admins-list');
    if (!adminsList) return;
    
    if (adminManagementAllAdmins.length === 0) {
        adminsList.innerHTML = '<div class="no-admins-message">אין מנהלים רשומים במערכת</div>';
        return;
    }
    
    adminsList.innerHTML = adminManagementAllAdmins
        .map(admin => createAdminItem(admin))
        .join('');
}

// Create admin item HTML
function createAdminItem(admin) {
    console.log("this is admin????:", admin.role)
    const isCurrentUser = admin.email === currentUserEmail;
    const roleText = admin.role === 'super-admin' ? 'מנהל על' : (admin.role === 'admin' ? 'מנהל' : 'משתמש');
    const roleBadgeClass = admin.role === 'super-admin' ? 'super-admin' : (admin.role === 'admin' ? 'admin' : 'user');
    
    // Format dates for display
    const formatDate = (date) => {
        if (!date) return 'לא זמין';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('he-IL');
    };
    
    // Player association info
    const playerInfo = admin.playerId ? 
        `<div class="admin-player-info">
            <span class="player-name">🏃 ${admin.playerName || 'שם לא זמין'}</span>
            <span class="player-id">(ID: ${admin.playerId})</span>
        </div>` : 
        '<div class="admin-player-info">לא משויך לשחקן</div>';
    
    // Registration status
    const registrationStatus = admin.isRegistered ? 
        `<span class="registration-status registered">✅ רשום</span>` : 
        `<span class="registration-status not-registered">⏳ לא רשום</span>`;
    
    return `
        <div class="admin-item ${admin.role}">
            <div class="admin-info">
                <div class="admin-email">${admin.email}</div>
                <div class="admin-role">
                    <span class="admin-role-badge ${roleBadgeClass}">${roleText}</span>
                    ${registrationStatus}
                </div>
                ${playerInfo}
                <div class="admin-dates">
                    <span class="date-info">נוסף: ${formatDate(admin.addedAt)}</span>
                    ${admin.lastLoginAt ? `<span class="date-info">כניסה אחרונה: ${formatDate(admin.lastLoginAt)}</span>` : ''}
                </div>
                ${isCurrentUser ? '<div class="current-user-indicator">זה אתה</div>' : ''}
            </div>
            <div class="admin-actions">
                ${!isCurrentUser ? `<button class="admin-action-btn remove-admin-btn" onclick="removeAdmin('${admin.email}')">הסר</button>` : ''}
            </div>
        </div>
    `;
}

// Add new admin
async function addNewAdmin() {
    const emailInput = document.getElementById('new-admin-email');
    const roleSelect = document.getElementById('admin-role');
    
    if (!emailInput || !roleSelect) return;
    
    const email = emailInput.value.trim().toLowerCase();
    const role = roleSelect.value;
    
    // Validation
    if (!email) {
        showAdminStatusMessage('נא להזין כתובת אימייל', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showAdminStatusMessage('כתובת אימייל לא תקינה', 'error');
        return;
    }
    
    // Check if admin already exists
    if (adminManagementAllAdmins.some(admin => admin.email === email)) {
        showAdminStatusMessage('מנהל עם כתובת אימייל זו כבר קיים במערכת', 'error');
        return;
    }
    
    // Don't allow adding yourself
    if (email === currentUserEmail) {
        showAdminStatusMessage('לא ניתן להוסיף את עצמך כמנהל', 'error');
        return;
    }
    
    try {
        const newAdmin = {
            email: email,
            role: role,
            addedAt: new Date(),
            addedBy: currentUserEmail
        };
        
        if (DEMO_MODE) {
            // Demo mode
            adminManagementAllAdmins.push(newAdmin);
            showAdminStatusMessage('מנהל נוסף בהצלחה (מצב דמו)', 'success');
        } else {
            // Add to Firestore
            const adminsCollection = collection(db, 'admins');
            await addDoc(adminsCollection, newAdmin);
            
            // Add to local array
            adminManagementAllAdmins.push(newAdmin);
            showAdminStatusMessage('מנהל נוסף בהצלחה', 'success');
        }
        
        // Clear form
        emailInput.value = '';
        roleSelect.value = 'admin';
        
        // Re-render list
        renderAdminsList();
        
    } catch (error) {
        console.error('Error adding admin:', error);
        showAdminStatusMessage('שגיאה בהוספת המנהל', 'error');
    }
}

// Remove admin
async function removeAdmin(email) {
    if (!confirm(`האם אתה בטוח שברצונך להסיר את המנהל ${email}?`)) {
        return;
    }
    
    try {
        if (DEMO_MODE) {
            // Demo mode
            adminManagementAllAdmins = adminManagementAllAdmins.filter(admin => admin.email !== email);
            showAdminStatusMessage('מנהל הוסר בהצלחה (מצב דמו)', 'success');
        } else {
            // Remove from Firestore
            const adminsCollection = collection(db, 'admins');
            const adminQuery = query(adminsCollection, where('email', '==', email));
            const adminSnapshot = await getDocs(adminQuery);
            
            if (!adminSnapshot.empty) {
                const adminDoc = adminSnapshot.docs[0];
                await deleteDoc(doc(db, 'admins', adminDoc.id));
                
                // Remove from local array
                adminManagementAllAdmins = adminManagementAllAdmins.filter(admin => admin.email !== email);
                showAdminStatusMessage('מנהל הוסר בהצלחה', 'success');
            }
        }
        
        // Re-render list
        renderAdminsList();
        
    } catch (error) {
        console.error('Error removing admin:', error);
        showAdminStatusMessage('שגיאה בהסרת המנהל', 'error');
    }
}

// Utility functions
function showAdminManagementLoading(show) {
    const loading = document.getElementById('admin-management-loading');
    if (loading) {
        loading.style.display = show ? 'block' : 'none';
    }
}

function showAdminManagementSections() {
    const addSection = document.getElementById('add-admin-section');
    const currentSection = document.getElementById('current-admins-section');
    
    if (addSection) addSection.classList.remove('hidden');
    if (currentSection) currentSection.classList.remove('hidden');
}

function showAdminStatusMessage(message, type) {
    const statusElement = document.getElementById('admin-status-message');
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
    
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Global function exposure for admin management
window.removeAdmin = removeAdmin;

// Custom Alert and Confirm Functions
function showCustomAlert(message, type = 'info') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'custom-alert-modal';
        
        const iconMap = {
            'info': '💡',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️'
        };
        
        const colorMap = {
            'info': '#3498db',
            'success': '#28a745',
            'error': '#dc3545',
            'warning': '#ffc107'
        };
        
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header" style="border-bottom: 3px solid ${colorMap[type]};">
                    <h3 style="color: ${colorMap[type]}; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.2em;">${iconMap[type]}</span>
                        הודעה
                    </h3>
                </div>
                <div class="modal-body">
                    <p style="font-size: 1.1em; line-height: 1.6; margin: 0; text-align: center;">${message}</p>
                </div>
                <div class="modal-actions">
                    <button class="primary-btn ok-btn">אישור</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const okBtn = modal.querySelector('.ok-btn');
        const backdrop = modal.querySelector('.modal-backdrop');
        
        const cleanup = () => {
            document.body.removeChild(modal);
            resolve();
        };
        
        okBtn.addEventListener('click', cleanup);
        backdrop.addEventListener('click', cleanup);
        
        // Add escape key support
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    });
}

function showCustomConfirm(message, options = {}) {
    return new Promise((resolve) => {
        const {
            title = 'אישור פעולה',
            confirmText = 'אישור',
            cancelText = 'ביטול',
            type = 'warning',
            danger = false
        } = options;
        
        const modal = document.createElement('div');
        modal.className = 'custom-confirm-modal';
        
        const iconMap = {
            'info': '💡',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'question': '❓'
        };
        
        const colorMap = {
            'info': '#3498db',
            'success': '#28a745',
            'error': '#dc3545',
            'warning': '#ffc107',
            'question': '#6c757d'
        };
        
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header" style="border-bottom: 3px solid ${colorMap[type]};">
                    <h3 style="color: ${colorMap[type]}; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.2em;">${iconMap[type]}</span>
                        ${title}
                    </h3>
                </div>
                <div class="modal-body">
                    <p style="font-size: 1.1em; line-height: 1.6; margin: 0; text-align: center; white-space: pre-line;">${message}</p>
                </div>
                <div class="modal-actions">
                    <button class="secondary-btn cancel-btn">${cancelText}</button>
                    <button class="primary-btn confirm-btn ${danger ? 'danger-btn' : ''}">${confirmText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const confirmBtn = modal.querySelector('.confirm-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');
        const backdrop = modal.querySelector('.modal-backdrop');
        
        const cleanup = () => {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', handleKeydown);
        };
        
        const handleConfirm = () => {
            cleanup();
            resolve(true);
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        backdrop.addEventListener('click', handleCancel);
        
        // Add keyboard support
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
            } else if (e.key === 'Enter') {
                handleConfirm();
            }
        };
        document.addEventListener('keydown', handleKeydown);
    });
}

// Toast notification functions
function showToast(title, message, type = 'success', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '✓' : '✕';
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="removeToast(this.parentElement)">×</button>
        <div class="toast-progress"></div>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Start progress bar animation
    const progressBar = toast.querySelector('.toast-progress');
    setTimeout(() => {
        progressBar.style.width = '100%';
        progressBar.style.transition = `width ${duration}ms linear`;
    }, 100);
    
    // Auto remove after duration
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

function removeToast(toast) {
    if (!toast || !toast.parentElement) return;
    
    toast.classList.remove('show');
    setTimeout(() => {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
    }, 300);
}

function showSuccessToast(title, message) {
    showToast(title, message, 'success');
}

function showErrorToast(title, message) {
    showToast(title, message, 'error');
}

// Make toast functions globally available
window.removeToast = removeToast;

// Add retroactive fields to existing players and normalize field names
// Check for edit parameter in URL
function checkForEditParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const editGameId = urlParams.get('edit');
    
    if (editGameId) {
        console.log('Edit parameter found in URL:', editGameId);
        
        // Clear the URL parameter
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Wait for authentication and then edit the game
        if (window.currentUser) {
            // User is already authenticated, edit immediately
            editGameDay(editGameId);
        } else {
            // Wait for authentication
            const authCheckInterval = setInterval(() => {
                if (window.currentUser) {
                    clearInterval(authCheckInterval);
                    editGameDay(editGameId);
                }
            }, 500);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(authCheckInterval);
                console.log('Authentication timeout for edit parameter');
            }, 10000);
        }
    }
}

async function addRetroactiveFieldsToPlayers() {
    try {
        console.log('Adding retroactive fields and normalizing field names for all players...');
        
        if (DEMO_MODE) {
            console.log('Demo mode: Fields already added to demo data');
            return;
        }
        
        const playersSnapshot = await getDocs(collection(db, 'players'));
        const batch = writeBatch(db);
        let updateCount = 0;
        
        playersSnapshot.forEach((docSnapshot) => {
            const playerData = docSnapshot.data();
            const playerRef = doc(db, 'players', docSnapshot.id);
            const updates = {};
            
            // Normalize field names - convert totalGoals/totalAssists/totalWins to goals/assists/wins
            if (playerData.hasOwnProperty('totalGoals') && !playerData.hasOwnProperty('goals')) {
                updates.goals = playerData.totalGoals || 0;
            }
            if (playerData.hasOwnProperty('totalAssists') && !playerData.hasOwnProperty('assists')) {
                updates.assists = playerData.totalAssists || 0;
            }
            if (playerData.hasOwnProperty('totalWins') && !playerData.hasOwnProperty('wins')) {
                updates.wins = playerData.totalWins || 0;
            }
            
            // Add missing fields with default values
            if (!playerData.hasOwnProperty('goals') && !playerData.hasOwnProperty('totalGoals')) {
                updates.goals = 0;
            }
            if (!playerData.hasOwnProperty('assists') && !playerData.hasOwnProperty('totalAssists')) {
                updates.assists = 0;
            }
            if (!playerData.hasOwnProperty('wins') && !playerData.hasOwnProperty('totalWins')) {
                updates.wins = 0;
            }
            if (!playerData.hasOwnProperty('totalGameNights')) {
                updates.totalGameNights = 0;
            }
            if (!playerData.hasOwnProperty('totalMiniGames')) {
                updates.totalMiniGames = 0;
            }
            
            // Only update if there are changes
            if (Object.keys(updates).length > 0) {
                batch.update(playerRef, updates);
                updateCount++;
            }
        });
        
        if (updateCount > 0) {
            await batch.commit();
            console.log(`Successfully normalized and added fields to ${updateCount} players`);
        } else {
            console.log('All players already have the required fields in correct format');
        }
        
    } catch (error) {
        console.error('Error adding retroactive fields to players:', error);
        throw error;
    }
}