// Import Firebase functions
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

// Global variables
let allPlayers = [];
let allSubscriptions = {};
let currentDay = '';
let currentSubscription = [];
let filteredPlayers = [];

// Day names mapping
const DAY_NAMES = {
    'sunday': 'ראשון',
    'monday': 'שני',
    'tuesday': 'שלישי',
    'wednesday': 'רביעי',
    'thursday': 'חמישי',
    'friday': 'שישי',
    'saturday': 'שבת'
};

// DOM Elements
const loader = document.getElementById('loader');
const mainContent = document.getElementById('main-content');
const daysOverview = document.getElementById('days-overview');
const daysGrid = document.getElementById('days-grid');
const playerManagement = document.getElementById('player-management');
const currentDayTitle = document.getElementById('current-day-title');
const backToOverviewBtn = document.getElementById('back-to-overview-btn');
const playerSearch = document.getElementById('player-search');
const selectedCount = document.getElementById('selected-count');
const playersGrid = document.getElementById('players-grid');
const copyFromDay = document.getElementById('copy-from-day');
const copySubscriptionBtn = document.getElementById('copy-subscription-btn');
const saveSubscriptionBtn = document.getElementById('save-subscription-btn');
const deleteSubscriptionBtn = document.getElementById('delete-subscription-btn');
const statusMessage = document.getElementById('status-message');

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialData();
    setupEventListeners();
    renderDaysOverview();
});

// Load all players and subscriptions
async function loadInitialData() {
    try {
        loader.style.display = 'flex';
        
        // Load all players
        console.log('Loading players...');
        const playersSnapshot = await getDocs(collection(db, 'players'));
        allPlayers = [];
        playersSnapshot.forEach((doc) => {
            allPlayers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort players by name
        allPlayers.sort((a, b) => a.name.localeCompare(b.name, 'he'));
        
        // Load all subscriptions
        console.log('Loading subscriptions...');
        await loadAllSubscriptions();
        
        // Populate copy selector
        populateCopySelector();
        
        loader.style.display = 'none';
        mainContent.style.display = 'block';
        
        console.log(`Loaded ${allPlayers.length} players and ${Object.keys(allSubscriptions).length} subscriptions`);
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        showStatusMessage('שגיאה בטעינת הנתונים: ' + error.message, 'error');
        loader.style.display = 'none';
    }
}

// Load all subscriptions from Firestore
async function loadAllSubscriptions() {
    allSubscriptions = {};
    
    for (const day of Object.keys(DAY_NAMES)) {
        try {
            const subscriptionDoc = await getDoc(doc(db, 'subscriptions', day));
            if (subscriptionDoc.exists()) {
                allSubscriptions[day] = subscriptionDoc.data().playerIds || [];
            }
        } catch (error) {
            console.error(`Error loading subscription for ${day}:`, error);
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    backToOverviewBtn.addEventListener('click', showDaysOverview);
    playerSearch.addEventListener('input', handlePlayerSearch);
    copyFromDay.addEventListener('change', handleCopyFromDayChange);
    copySubscriptionBtn.addEventListener('click', copySubscription);
    saveSubscriptionBtn.addEventListener('click', saveSubscription);
    deleteSubscriptionBtn.addEventListener('click', deleteSubscription);
}

// Show days overview
function showDaysOverview() {
    daysOverview.style.display = 'block';
    playerManagement.style.display = 'none';
    currentDay = '';
    currentSubscription = [];
    
    // Clear search
    playerSearch.value = '';
}

// Show player management for a specific day
function showPlayerManagement(day) {
    currentDay = day;
    // Create a copy to avoid modifying the original subscription
    currentSubscription = [...(allSubscriptions[day] || [])];
    
    // Update UI
    daysOverview.style.display = 'none';
    playerManagement.style.display = 'block';
    currentDayTitle.textContent = `עריכת מנוי ליום ${DAY_NAMES[day]}`;
    
    // Show/hide delete button based on existing subscription
    if (allSubscriptions[day] && allSubscriptions[day].length > 0) {
        deleteSubscriptionBtn.style.display = 'inline-block';
    } else {
        deleteSubscriptionBtn.style.display = 'none';
    }
    
    renderPlayersList();
    updateSelectedCount();
    updateActionButtons();
    
    // Clear search
    playerSearch.value = '';
}

// Render days overview
function renderDaysOverview() {
    daysGrid.innerHTML = Object.keys(DAY_NAMES).map(day => {
        const dayName = DAY_NAMES[day];
        const subscription = allSubscriptions[day] || [];
        const hasSubscription = subscription.length > 0;
        
        let actionsHTML = '';
        if (hasSubscription) {
            actionsHTML = `
                <div class="day-actions">
                    <button class="day-action-btn edit-subscription-btn" onclick="showPlayerManagement('${day}')" title="עריכה">
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
                    <button class="day-action-btn add-subscription-btn" onclick="showPlayerManagement('${day}')" title="הוסף מנוי">
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

// Global functions for onclick handlers
window.showPlayerManagement = showPlayerManagement;
window.confirmDeleteSubscription = confirmDeleteSubscription;

// Handle player search
function handlePlayerSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    if (searchTerm) {
        filteredPlayers = allPlayers.filter(player => 
            player.name.toLowerCase().includes(searchTerm)
        );
    } else {
        filteredPlayers = [...allPlayers];
    }
    
    renderPlayersList();
}

// Render players list (using same style as game night creation)
function renderPlayersList() {
    const playersToShow = filteredPlayers.length > 0 ? filteredPlayers : allPlayers;
    
    playersGrid.innerHTML = playersToShow.map(player => {
        const isSelected = currentSubscription.includes(player.id);
        const isDisabled = !isSelected && currentSubscription.length >= 21;
        
        return `
            <div class="player-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}" 
                 onclick="togglePlayerSelection('${player.id}')" 
                 style="${isDisabled ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                <input type="checkbox" 
                       id="player-${player.id}" 
                       ${isSelected ? 'checked' : ''}
                       ${isDisabled ? 'disabled' : ''}
                       style="pointer-events: none;">
                <label for="player-${player.id}" style="pointer-events: none;">
                    <span class="player-name">${player.name}</span>
                </label>
            </div>
        `;
    }).join('');
}

// Toggle player selection (with 21-player limit)
window.togglePlayerSelection = function(playerId) {
    const index = currentSubscription.indexOf(playerId);
    
    if (index === -1) {
        // Adding player - check limit
        if (currentSubscription.length >= 21) {
            showStatusMessage('ניתן לבחור עד 21 שחקנים בלבד', 'error');
            return;
        }
        currentSubscription.push(playerId);
    } else {
        // Removing player
        currentSubscription.splice(index, 1);
    }
    
    updateSelectedCount();
    updateActionButtons();
    renderPlayersList(); // Re-render to update disabled state
};

// Update selected count display (using same format as game night creation)
function updateSelectedCount() {
    const count = currentSubscription.length;
    selectedCount.textContent = `נבחרו: ${count}/21`;
    
    if (count === 21) {
        selectedCount.style.color = '#28a745'; // Green for optimal
    } else if (count > 21) {
        selectedCount.style.color = '#dc3545'; // Red for over limit
    } else {
        selectedCount.style.color = '#ffc107'; // Yellow for under limit
    }
}

// Removed selectAllPlayers and clearAllPlayers functions as they're no longer needed

// Populate copy selector
function populateCopySelector() {
    const options = ['<option value="">-- בחר יום להעתקה --</option>'];
    
    Object.keys(DAY_NAMES).forEach(day => {
        if (allSubscriptions[day] && allSubscriptions[day].length > 0) {
            const dayName = DAY_NAMES[day];
            const playerCount = allSubscriptions[day].length;
            options.push(`<option value="${day}">${dayName} (${playerCount} שחקנים)</option>`);
        }
    });
    
    copyFromDay.innerHTML = options.join('');
}

// Handle copy from day change
function handleCopyFromDayChange(event) {
    const selectedDay = event.target.value;
    copySubscriptionBtn.disabled = !selectedDay || selectedDay === currentDay;
}

// Copy subscription from another day
function copySubscription() {
    const fromDay = copyFromDay.value;
    
    if (!fromDay || fromDay === currentDay) {
        showStatusMessage('בחר יום תקין להעתקה', 'error');
        return;
    }
    
    const fromSubscription = allSubscriptions[fromDay];
    if (!fromSubscription || fromSubscription.length === 0) {
        showStatusMessage('אין מנוי ביום הנבחר', 'error');
        return;
    }
    
    // Confirm action
    const fromDayName = DAY_NAMES[fromDay];
    const currentDayName = DAY_NAMES[currentDay];
    
    if (confirm(`האם אתה בטוח שברצונך להעתיק ${fromSubscription.length} שחקנים מיום ${fromDayName} ליום ${currentDayName}?`)) {
        currentSubscription = [...fromSubscription];
        updateSelectedCount();
        updateActionButtons();
        renderPlayersList();
        showStatusMessage(`הועתקו ${fromSubscription.length} שחקנים מיום ${fromDayName}`, 'success');
    }
}

// Update action buttons state
function updateActionButtons() {
    const hasPlayers = currentSubscription.length > 0;
    
    // Simply enable the save button if we have players selected
    // The validation will happen in the save function
    saveSubscriptionBtn.disabled = !hasPlayers;
}

// Save subscription
async function saveSubscription() {
    if (!currentDay || currentSubscription.length === 0) {
        showStatusMessage('בחר יום ושחקנים לשמירה', 'error');
        return;
    }
    
    if (currentSubscription.length !== 21) {
        showStatusMessage('יש לבחור בדיוק 21 שחקנים', 'error');
        return;
    }
    
    // Check if this is an edit of existing subscription
    const originalSubscription = allSubscriptions[currentDay] || [];
    const isEditMode = originalSubscription.length > 0;
    
    if (isEditMode) {
        // Show confirmation popup with changes
        const confirmed = await showEditConfirmation(originalSubscription, currentSubscription);
        if (!confirmed) {
            return; // User cancelled
        }
    }
    
    try {
        saveSubscriptionBtn.disabled = true;
        saveSubscriptionBtn.textContent = 'שומר...';
        
        // Save to Firestore
        await setDoc(doc(db, 'subscriptions', currentDay), {
            playerIds: currentSubscription,
            lastUpdated: new Date().toISOString()
        });
        
        // Update local data
        allSubscriptions[currentDay] = [...currentSubscription];
        
        showStatusMessage(`מנוי ליום ${DAY_NAMES[currentDay]} נשמר בהצלחה`, 'success');
        
        // Go back to overview and refresh
        showDaysOverview();
        renderDaysOverview();
        populateCopySelector();
        
    } catch (error) {
        console.error('Error saving subscription:', error);
        showStatusMessage('שגיאה בשמירת המנוי: ' + error.message, 'error');
    } finally {
        saveSubscriptionBtn.disabled = false;
        saveSubscriptionBtn.textContent = 'שמור מנוי';
        updateActionButtons();
    }
}

// Show edit confirmation popup
async function showEditConfirmation(originalPlayerIds, newPlayerIds) {
    // Find added and removed players
    const addedPlayerIds = newPlayerIds.filter(id => !originalPlayerIds.includes(id));
    const removedPlayerIds = originalPlayerIds.filter(id => !newPlayerIds.includes(id));
    
    // Get player names
    const getPlayerName = (playerId) => {
        const player = allPlayers.find(p => p.id === playerId);
        return player ? player.name : playerId;
    };
    
    const addedPlayerNames = addedPlayerIds.map(getPlayerName);
    const removedPlayerNames = removedPlayerIds.map(getPlayerName);
    
    // Show custom modal
    return showCustomConfirmation(addedPlayerNames, removedPlayerNames);
}

// Show custom confirmation modal
function showCustomConfirmation(addedPlayerNames, removedPlayerNames) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmation-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const changesSummary = document.getElementById('changes-summary');
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');
        
        // Set title and message
        modalTitle.textContent = `אישור שינויים למנוי יום ${DAY_NAMES[currentDay]}`;
        modalMessage.textContent = 'האם אתה בטוח שברצונך לשמור את השינויים הבאים?';
        
        // Build changes summary
        let summaryHTML = '';
        
        if (addedPlayerNames.length > 0) {
            summaryHTML += `
                <div class="change-section added">
                    <h4>שחקנים שנוספו (${addedPlayerNames.length}):</h4>
                    <ul class="change-list">
                        ${addedPlayerNames.map(name => `
                            <li class="change-item added">
                                <span class="change-icon">+</span>
                                <span>${name}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (removedPlayerNames.length > 0) {
            summaryHTML += `
                <div class="change-section removed">
                    <h4>שחקנים שהוסרו (${removedPlayerNames.length}):</h4>
                    <ul class="change-list">
                        ${removedPlayerNames.map(name => `
                            <li class="change-item removed">
                                <span class="change-icon">-</span>
                                <span>${name}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (addedPlayerNames.length === 0 && removedPlayerNames.length === 0) {
            summaryHTML = '<div style="text-align: center; color: #666; font-style: italic;">לא נמצאו שינויים</div>';
        }
        
        changesSummary.innerHTML = summaryHTML;
        
        // Show modal
        modal.style.display = 'flex';
        
        // Handle button clicks
        const handleConfirm = () => {
            modal.style.display = 'none';
            cleanup();
            resolve(true);
        };
        
        const handleCancel = () => {
            modal.style.display = 'none';
            cleanup();
            resolve(false);
        };
        
        const handleOverlayClick = (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        };
        
        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            modal.removeEventListener('click', handleOverlayClick);
        };
        
        // Add event listeners
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        modal.addEventListener('click', handleOverlayClick);
    });
}

// Delete subscription (from player management view)
async function deleteSubscription() {
    if (!currentDay || !allSubscriptions[currentDay]) {
        showStatusMessage('אין מנוי למחיקה', 'error');
        return;
    }
    
    const dayName = DAY_NAMES[currentDay];
    const playerCount = allSubscriptions[currentDay].length;
    
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המנוי ליום ${dayName} (${playerCount} שחקנים)?`)) {
        return;
    }
    
    await deleteSubscriptionForDay(currentDay);
    
    // Go back to overview
    showDaysOverview();
    renderDaysOverview();
}

// Confirm deletion from overview
async function confirmDeleteSubscription(day) {
    const dayName = DAY_NAMES[day];
    const playerCount = allSubscriptions[day]?.length || 0;
    if (confirm(`האם אתה בטוח שברצונך למחוק את המנוי ליום ${dayName} (${playerCount} שחקנים)?`)) {
        await deleteSubscriptionForDay(day);
    }
}

// Delete subscription for a specific day
async function deleteSubscriptionForDay(day) {
    try {
        // Delete from Firestore
        await deleteDoc(doc(db, 'subscriptions', day));
        
        // Update local data
        delete allSubscriptions[day];
        
        showStatusMessage(`מנוי ליום ${DAY_NAMES[day]} נמחק בהצלחה`, 'success');
        
        // Refresh overview and copy selector
        renderDaysOverview();
        populateCopySelector();
        
    } catch (error) {
        console.error('Error deleting subscription:', error);
        showStatusMessage('שגיאה במחיקת המנוי: ' + error.message, 'error');
    }
}

// Show status message
function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}

// Add the confirmDeleteSubscription to global scope
window.confirmDeleteSubscription = confirmDeleteSubscription; 