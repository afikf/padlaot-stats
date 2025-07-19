# Generic Tournament Feature Plan

## Key Principles & Requirements

- **Permissions:**
  - Only super-admins can create, edit, or delete tournaments.
  - **Live tournament management (viewing, adding goals, managing mini-games, etc.) is accessible to all users, just like live game night management today.**
- **Generic & Configurable:**
  - Admin sets number of teams, players per team, and number of pitches (parallel mini-games).
- **Manual Mini-Game Management:**
  - Admin/user adds mini-games manually, as in game night.
- **UI/UX Consistency:**
  - Tournament creation and live management closely mirror the current game night flow, but support more teams and parallel games.
- **Single-Day, Round Robin:**
  - Tournaments are single-day, round-robin only (for now).
- **Team Captain & Naming:**
  - Each team must have a captain, and the team’s name is the captain’s name (as in game night).

---

## Data Model Changes

- **Firestore:**
  - New `tournaments` collection (similar to `gameDays`).
  - Each tournament document:
    - `id`, `name`, `date`, `createdBy`, `status`, `settings` (number of teams, players per team, pitches), `participants`, `teams`, `miniGames`, etc.
  - Teams: `{ [teamKey]: { players: string[], captain: string } }` (dynamic team keys, e.g., A-F; captain is required; team name = captain’s name).
  - Mini-games: Each with `id`, `teamA`, `teamB`, `scoreA`, `scoreB`, `goals`, `status`, `pitchNumber`, `startTime`, `endTime`.

---

## Tournament Creation Flow (Admin UI)

- **Step 1: Tournament Details**
  - Name, date, number of teams (default 6), players per team, number of pitches.
- **Step 2: Player Selection**
  - Select players (enforce total = teams × players per team).
- **Step 3: Team Assignment**
  - Assign players to teams (dynamic number of teams, e.g., A-F).
  - Assign a captain for each team (as in game night).
  - Team’s display name is the captain’s name.
  - Support random/smart/manual assignment (reuse logic from game night, but generic for N teams).
- **Step 4: Review & Create**
  - Review all settings, teams, and players.
  - Create tournament (Firestore doc).

---

## Live Tournament Management (Accessible to All Users)

- **Tournament Live Page:**
  - **UI/UX:** Should be almost identical to the live game night management page, but:
    - Support dynamic number of teams (not just A/B/C).
    - Support multiple pitches (parallel mini-games).
  - List all teams and their players (team name = captain’s name).
  - List all mini-games, grouped by pitch.
  - “Create Mini-Game” dialog: select two teams, assign to pitch (enforce no team in two games at once, no pitch double-booking).
  - For each mini-game:
    - Start/stop, add goals, edit scores, assign scorers/assisters (reuse mini-game logic from game night).
    - Mark as complete.
  - Stats summary: wins, goals, assists, games played per team/player.
  - **All users can access and interact with the live tournament page, just like with live game nights.**

---

## Dashboard Integration

- **Main Dashboard:**
  - Show upcoming/active tournaments alongside game nights.
  - Each tournament should have a clear “Tournament” badge.
  - Display number of pitches (parallel games) for tournaments.
  - “Go to Tournament” button links to the live management page.
  - UI for tournaments should be visually distinct but consistent with game nights.

---

## Generic Logic & Refactoring

- **Team Management:**
  - Refactor team assignment logic to support dynamic number of teams (not just A/B/C).
  - Captain selection and team naming logic must be generic.
- **Mini-Game Management:**
  - Refactor mini-game creation and management to support dynamic teams and multiple pitches.
- **Component Reuse:**
  - Extract shared components (team assignment, mini-game dialog, goal dialog) for use in both game night and tournament flows.

---

## Permissions & Routing

- **Permissions:**  
  - Super-admin only for tournament CRUD.
  - **Live management page is accessible to all users.**
- **Routing:**  
  - `/admin/tournaments` (list, create, edit, delete)
  - `/tournaments/[tournamentId]/live` (live management, public for all users)
  - Dashboard: show tournaments with badge and pitch info

---

## Step-by-Step Implementation Plan

1. **Data Model & Firestore**
   - Add `tournaments` collection with the new schema.
   - Update team and mini-game sub-objects to be generic.

2. **Tournament CRUD UI**
   - Create admin-only tournament management page.
   - Implement creation wizard (steps as above).

3. **Team Assignment Logic**
   - Refactor to support N teams, dynamic team keys, and variable players per team.
   - Captain selection and team naming.

4. **Live Tournament Page**
   - Build live management UI for tournaments (accessible to all users):
     - List teams, mini-games, and pitches.
     - Allow manual mini-game creation (enforce constraints).
     - Reuse goal/score logic.

5. **Dashboard Integration**
   - Update dashboard to show tournaments with badge and pitch info.
   - “Go to Tournament” button.

6. **Component Refactoring**
   - Extract and generalize team assignment and mini-game management components.

7. **Permissions**
   - Enforce super-admin checks for CRUD, but live page is public.

8. **Testing**
   - Test with various tournament configurations (teams, players, pitches).

---

## Summary Table

| Step                | Description                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| Data Model          | Add `tournaments` collection, generic teams/mini-games                      |
| CRUD UI             | Admin-only, multi-step creation wizard                                      |
| Team Assignment     | Dynamic, supports N teams, captain selection, team name = captain           |
| Live Management     | List teams, mini-games, pitches; manual mini-game creation; like game night; accessible to all users |
| Dashboard           | Show tournaments with badge and pitch info; “Go to Tournament” button       |
| Component Reuse     | Refactor team/mini-game/goal logic for generic use                          |
| Permissions         | Super-admin only for tournament management; live page public                |
| Testing             | Validate with different tournament configs                                  | 