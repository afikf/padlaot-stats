# **Detailed Development Plan: Admin Game Management System**

## **Phase 1: Foundation & Data Structure Setup**
**Goal:** Establish the new Firestore data model and create basic admin page structure

### **Files to Create/Modify:**
- **Create:** `admin.html` - Admin interface page
- **Create:** `admin.js` - Admin functionality logic
- **Modify:** `style.css` - Add admin-specific styles
- **Modify:** `index.html` - Add navigation link to admin page

### **Key Tasks:**
1. **Design Firestore Data Structure:**
   ```javascript
   // gameDays collection structure:
   {
     date: "2024-01-15",
     participants: ["playerId1", "playerId2", ...], // 21 player IDs
     teams: {
       A: ["playerId1", "playerId2", ...], // 7 players
       B: ["playerId8", "playerId9", ...], // 7 players  
       C: ["playerId15", "playerId16", ...] // 7 players
     },
     miniGames: [
       {
         teamA: "A", teamB: "B", scoreA: 3, scoreB: 2, winner: "A"
       }
     ],
     playerStats: {
       "playerId1": { goals: 2, assists: 1, wins: 1 },
       // ... for all 21 players
     },
     status: "draft" // draft, in-progress, completed
   }
   ```

2. **Create Basic Admin HTML Structure:**
   - Header with navigation
   - Multi-step form container
   - Progress indicator
   - Basic responsive layout

3. **Initialize Admin JavaScript:**
   - Import Firebase functions
   - Set up basic DOM manipulation
   - Create utility functions for player management

---

## **Phase 2: Player Selection & Team Assignment**
**Goal:** Build the interface for selecting 21 players and dividing them into teams

### **Files to Modify:**
- **admin.js** - Add player selection and team assignment logic
- **admin.html** - Add player selection UI components
- **style.css** - Add styles for drag-and-drop or selection interface

### **Key Functions to Build:**
1. **`fetchAllPlayers()`** - Get all active players from Firestore
2. **`renderPlayerSelection()`** - Display checkboxes/list for 21 player selection
3. **`validatePlayerCount()`** - Ensure exactly 21 players selected
4. **`renderTeamAssignment()`** - Interface for dividing into 3 teams of 7
5. **`saveGameDayDraft()`** - Save initial game day structure to Firestore

### **UI Components:**
- Player selection grid with search/filter
- Team assignment interface (drag-and-drop or dropdown-based)
- "Auto-assign teams" button for random distribution
- Validation messages and progress indicators

---

## **Phase 3: Mini-Game Management System**
**Goal:** Create interface for logging mini-game results with automatic win calculation

### **Files to Modify:**
- **admin.js** - Add mini-game logging and win calculation logic
- **admin.html** - Add mini-game results interface
- **style.css** - Style mini-game input forms

### **Key Functions to Build:**
1. **`generateMiniGameSlots()`** - Create empty mini-game entries
2. **`renderMiniGameForm()`** - Form for each mini-game (Team A vs Team B, scores)
3. **`calculateWinsFromMiniGames()`** - Auto-calculate wins per player based on team results
4. **`updateGameDayMiniGames()`** - Save mini-game results to Firestore
5. **`validateMiniGameScores()`** - Ensure valid score entries

### **UI Components:**
- Dynamic mini-game entry forms
- Team vs Team dropdowns (A vs B, B vs C, A vs C, etc.)
- Score input fields with validation
- Real-time win calculation display
- Add/remove mini-game buttons

---

## **Phase 4: Individual Stats Entry System**
**Goal:** Build interface for entering goals and assists for each of the 21 players

### **Files to Modify:**
- **admin.js** - Add individual stats entry logic
- **admin.html** - Add stats entry interface
- **style.css** - Style stats entry forms

### **Key Functions to Build:**
1. **`renderPlayerStatsForm()`** - Grid/list of all 21 players with goals/assists inputs
2. **`validateStatsEntry()`** - Ensure non-negative numbers
3. **`calculateTotalStats()`** - Show summary of total goals/assists for the day
4. **`updatePlayerStats()`** - Save individual stats to game day document
5. **`previewFinalStats()`** - Show summary before final submission

### **UI Components:**
- Player stats entry grid (Name | Goals | Assists)
- Bulk entry helpers (set all to 0, copy from previous game)
- Real-time totals and validation
- Search/filter for quick player finding

---

## **Phase 5: Final Submission & Database Updates**
**Goal:** Implement the final submission process that updates both game day and player career totals

### **Files to Modify:**
- **admin.js** - Add final submission and database update logic
- **admin.html** - Add final review and submission interface

### **Key Functions to Build:**
1. **`generateFinalSummary()`** - Create comprehensive game day summary
2. **`submitGameDay()`** - Main submission function that:
   - Updates game day status to "completed"
   - Creates playerStats subcollection entries
   - Updates career totals in players collection using Firestore increment
3. **`updateCareerTotals()`** - Batch update all 21 player documents
4. **`handleSubmissionErrors()`** - Error handling and rollback logic
5. **`redirectToSuccess()`** - Post-submission success handling

### **UI Components:**
- Final review screen with all data
- Confirmation dialog with summary
- Loading states during submission
- Success/error messaging
- Navigation back to main app

---

## **Phase 6: Enhancement & Polish**
**Goal:** Add advanced features and improve user experience

### **Additional Features:**
1. **Edit Existing Game Days** - Ability to modify completed game days
2. **Game Day Templates** - Save common team configurations
3. **Bulk Operations** - Import/export game day data
4. **Advanced Validation** - Cross-reference with player availability
5. **Responsive Design** - Mobile-friendly admin interface
6. **Admin Authentication** - Secure admin access (if needed)

---

## **Technical Implementation Notes:**

### **Firestore Security Rules:**
```javascript
// Add to firestore.rules
match /gameDays/{gameId} {
  allow read, write: if request.auth != null; // Adjust based on your auth needs
  match /playerStats/{playerId} {
    allow read, write: if request.auth != null;
  }
}
```

### **Error Handling Strategy:**
- Implement comprehensive try-catch blocks
- Use Firestore transactions for atomic updates
- Provide clear user feedback for all error states
- Include data validation at multiple levels

### **Performance Considerations:**
- Use Firestore batch operations for bulk updates
- Implement loading states for all async operations
- Cache player data to minimize repeated queries
- Use pagination if player list grows large

---

## **Next Steps:**
1. **Start with Phase 1** - Set up the basic structure and data model
2. **Test each phase thoroughly** before moving to the next
3. **Maintain backward compatibility** with existing functionality
4. **Document all new functions** for future maintenance

---

## **Project Context & Current Architecture**
We have built a web app for a community soccer group to track player statistics. The project is built with HTML, CSS, and modern vanilla JavaScript (ESM). We have successfully migrated our backend from Google Sheets to Firebase Firestore.

Our current Firestore data model is as follows:

**players collection:**
- Each document represents a single player, with a Firestore auto-generated ID.
- Each document contains fields like name (string), totalGoals (number), totalWins (number), isActive (boolean), etc.
- This collection is already populated with all our players.

## **New Requirements Overview**
This is the core of our new direction. Here's how our games work in reality:

- **Game Days:** We play 2-3 times a week. Each event is a "Game Day".
- **Participants:** For each Game Day, a group of 21 players participates. This group is not always the same.
- **Team Division:** Right before the games start, the 21 players are divided into 3 teams (Team A, Team B, Team C).
- **Mini-Games:** Throughout the evening, these 3 teams play several short "mini-games" against each other (e.g., A vs B, B vs C, A vs C).
- **Stats to Track:** We need to track individual stats (goals, assists, wins) for each player per Game Day, and also maintain their overall career totals.

## **The Goal: An Admin-Only Game Management App**
Instead of having each player submit their own stats, we want to build a new, admin-only interface within our app. This interface will allow a game manager to set up, manage, and finalize the stats for an entire Game Day.

This new feature should be built within a new page, admin.html, with its corresponding admin.js.

The desired workflow for the admin page is:

1. **Create Game Day:** The admin selects a date and then selects the 21 players who are participating on that day from a list of all players (fetched from the players collection).

2. **Set Teams:** After selecting the players, the admin assigns them to 3 teams (A, B, C), perhaps using a drag-and-drop interface or dropdowns.

3. **Log Mini-Game Results:** The admin logs the score of each mini-game (e.g., "Team A vs Team B: 5-3"). This will be used to automatically calculate wins for each player.

4. **Enter Individual Stats:** The admin enters the number of goals and assists for each of the 21 players for that entire Game Day.

5. **Finalize & Submit:** A final "Submit" button will trigger a function that:
   - Calculates the number of wins for each player based on the mini-game results.
   - Writes the final stats (wins, goals, assists) for each of the 21 players to the gameDays/{date}/playerStats sub-collection.
   - Updates the career totals (totalWins, totalGoals, etc.) for each of the 21 players in the main players collection using a Firestore increment. 