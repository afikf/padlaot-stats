// Import the database instance from our config file, and the necessary Firestore functions
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

export { db };

document.addEventListener('DOMContentLoaded', () => {
    // --- Form Elements ---
    const form = document.getElementById('stats-form');
    const playerNameSelect = document.getElementById('player-name');
    // ... (other elements will be defined when we re-implement the form logic)

    /**
     * Fetches the full player list from the 'players' collection in Firestore
     * and populates the dropdown select menu.
     */
    async function populatePlayerDropdown() {
        try {
            console.log("DEBUG: Script loaded. Attempting to fetch players...");
            
            // Check if the db object was imported correctly
            if (!db) {
                throw new Error("Firestore database instance (db) is not available. Check firebase-config.js.");
            }
            console.log("DEBUG: Firestore db object is available.");

            // Get all documents from the 'players' collection
            const playersCollectionRef = collection(db, "players");
            console.log("DEBUG: Created collection reference for 'players'.");

            const querySnapshot = await getDocs(playersCollectionRef);
            console.log("DEBUG: getDocs snapshot received. Is empty:", querySnapshot.empty);
            
            const players = [];
            querySnapshot.forEach((doc) => {
                // For each document, we push an object with its unique ID and name
                const playerData = doc.data();
                if (playerData.name) {
                    players.push({
                        id: doc.id,
                        name: playerData.name 
                    });
                } else {
                    console.warn("DEBUG: Document found without a 'name' field, skipping. ID:", doc.id);
                }
            });

            if (players.length === 0) {
                 console.warn("DEBUG: No players found in the 'players' collection or no documents have a 'name' field.");
                 playerNameSelect.innerHTML = '<option value="">לא נמצאו שחקנים</option>';
                 return; // Stop execution if no players are found
            }

            // Sort players alphabetically by name (in Hebrew)
            players.sort((a, b) => a.name.localeCompare(b.name, 'he'));

            // Populate the dropdown
            playerNameSelect.innerHTML = '<option value="">בחר את שמך...</option>';
            players.forEach(player => {
                const option = document.createElement('option');
                // The value will now be the unique Player ID
                option.value = player.id; 
                option.textContent = player.name;
                playerNameSelect.appendChild(option);
            });
            
            console.log(`DEBUG: Successfully populated dropdown with ${players.length} players.`);

        } catch (error) {
            console.error("FINAL ERROR fetching players from Firestore:", error);
            playerNameSelect.innerHTML = `<option value="">שגיאה בטעינת שחקנים</option>`;
        }
    }

    // --- All old logic is temporarily disabled ---
    // We will re-implement the form submission and editing logic in the next steps.
    // For now, the old event listeners are commented out or removed.
    
    // Call the function to populate the players when the page loads
    populatePlayerDropdown();
});
