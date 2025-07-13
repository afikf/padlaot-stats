# Live Game Management Feature Implementation Plan

## Part 1: The Entry Point (Admin Dashboard)

**Goal:** Modify the main admin dashboard (`/admin`) to display the currently active game day and provide a button to manage it.

**Implementation Details:**
1. In the admin page component, fetch all documents from the `gameDays` collection.
2. Find the game day document where the `date` field matches today's date.
3. Display this "Live Game Day" document prominently at the top of the page in its own `<Card>` or styled section.
4. Inside this section, add a new, primary button with the text "Manage Live Game".
5. This button should link to a new dynamic route: `/admin/live/[gameId]`, where `[gameId]` is the ID of the live game day document.

**Technical Advice:**
- To get today's date for comparison, use a library like `dayjs` in the format `YYYY-MM-DD` to ensure consistency with how you store it in Firestore.

---

## Part 2: The New Live Game Page (`/admin/live/[gameId]`)

**Goal:** Create the main page for managing a live game. This page must reflect database changes in real-time.

**Implementation Details:**
1. Create a new dynamic route file at `app/admin/live/[gameId]/page.tsx`.
2. This page will be the main container for all live management components. It should fetch the single `gameDay` document based on the `gameId` from the URL.
3. The page should display the teams for the day (Team A, Team B, Team C) and a list of the mini-games that have been played or are in progress.

**Technical Advice:**
- **Crucial for UX:** Do not use a one-time `getDoc`. Instead, use a real-time listener from Firestore (`onSnapshot`).
- **Best Practice:** Create a custom hook `useLiveGame(gameId)` that encapsulates the `onSnapshot` logic. This hook will listen for changes to the `gameDays` document and return the latest data. Any component using this hook will automatically re-render when the score, goals, or game status changes, creating a seamless live experience.

---

## Part 3: "Create a New Mini-Game" Functionality

**Goal:** Allow the admin to start a new mini-game by selecting two of the three teams.

**Implementation Details:**
1. On the `LiveGamePage`, add a "Create New Mini-Game" button.
2. Clicking this button should open a Material-UI `<Dialog>` component.
3. Inside the dialog, there should be two `<Select>` dropdowns: "Team 1" and "Team 2". The options for both should be the main teams of the day (Team A, Team B, Team C). Ensure a team cannot be selected to play against itself.
4. A "Create Game" button inside the dialog will trigger the logic to create the game.
5. This action should update the `gameDays` document in Firestore by adding a new object to a `miniGames` array field.

**Technical Advice:**
- **Data Structure:** The `miniGames` array in your `gameDay` document should contain objects with a structure like this:

  ```json
  {
    "id": "some_unique_id",
    "teams": ["A", "B"],
    "score": { "A": 0, "B": 0 },
    "goals": [],
    "status": "pending", // pending -> active -> finished
    "startTime": null,
    "endTime": null
  }
  ```
- Use Firestore's `arrayUnion` to add the new mini-game object to the array atomically.

---

## Part 4: The Live Game Timer Component

**Goal:** A large, clear on-screen timer with Start, Pause, and Finish controls.

**Implementation Details:**
1. Create a new component `GameTimer.tsx`.
2. After a new mini-game is created, this component should display `00:00`.
3. It needs three buttons: "Start Game", "Pause Game", and "Finish Game".
    - "Start" should be visible initially.
    - "Pause" should only be visible after the game has started.
    - "Finish" should only be visible after the game has started.
4. The timer should visually count up (`MM:SS`) when active.

**Technical Advice:**
- Use a `useEffect` hook with `setInterval` to handle the timer logic. Remember to clear the interval in the cleanup function of the `useEffect` to prevent memory leaks.
- Manage the timer's state locally in the component (`timeInSeconds`, `isActive`, `isPaused`).
- When "Start" or "Finish" is clicked, update the `status` and `startTime`/`endTime` fields for the corresponding mini-game in Firestore.

---

## Part 5: The "Add Goal" Functionality

**Goal:** A quick and easy way to log a goal for a team, including the scorer and assister.

**Implementation Details:**
1. Near the timer/scoreboard, add an "Add Goal" button.
2. Clicking it opens a `<Dialog>`.
3. Inside the dialog:
    - Two `<Autocomplete>` components (for easy player searching).
    - The first is "Scorer" (required). Its options should only be the players from the two teams currently playing this mini-game.
    - The second is "Assister" (optional).
    - Buttons to select which team scored.
4. Submitting the dialog updates the database and closes the dialog.

**Technical Advice:**
- The function to add a goal should be `async`.
- It should perform two updates in Firestore:
    1. Update the `score` for the correct team in the mini-game object (e.g., `score.A`).
    2. Use `arrayUnion` to add a goal object to the `goals` array within the mini-game object. The goal object should look like: `{ scorerId: '...', assistId: '...', team: 'A', timestamp: serverTimestamp() }`.
- This will automatically update the UI everywhere thanks to the `useLiveGame` hook.

---

## Part 6: The Live Scoreboard Display

**Goal:** A clear display of the current score and a list of goalscorers.

**Implementation Details:**
1. Create a `Scoreboard.tsx` component.
2. It should prominently display the score, like: `Team A   2 - 1   Team B`.
3. Below the score, display two columns, one for each team.
4. In each column, list the names of the players who scored, perhaps with the time of the goal.
5. This component will receive the data for the currently active mini-game as props and will re-render automatically when the data changes.

---

## Final UX/Design Philosophy

- **Clarity Above All:** The page should be extremely easy to read at a glance. Use large fonts for the timer and score.
- **Fast & Responsive:** Actions like adding a goal must feel instant. Consider using optimistic UI updates (update the state locally first, then wait for the database confirmation).
- **Minimal Clicks:** Design the flow to require the fewest clicks possible to perform common actions.
- **Visual Feedback:** Use skeleton loaders when data is first loading. Use subtle animations to confirm actions (e.g., a green flash when a goal is added). 