# StatsPad Dashboard Implementation Plan

## 1. Overview & Goal
The main dashboard is the heart of the application. It serves as the central hub for registered users to view all community game statistics. The page must be visually appealing, intuitive, and provide users with both an overview of all games and detailed player statistics.

## 2. Core Principles & Tech Stack
- **UI/UX:** Top priority. Must look professional, clean, and be highly usable, especially on mobile.
- **Component Library:** MUI (Material-UI) for all UI components (Tabs, Tables, Cards, Buttons, etc.)
- **Color Palette:** Blue & White theme. Primary blue for interactive elements, dark navy/charcoal for text and headers, light airy background.

## 3. Authentication & Routing Logic (Feature 1)
- **For registered and linked users only.**
- **Entry Point:** `/dashboard` is the default for logged-in, linked users.
- **New User Flow:** New users go to "Link Player" first, then are redirected to dashboard.
- **Auth Guard:** Protects the page. Unauthenticated users go to `/login`.

## 4. Header & User Display (Feature 2)
- Show logged-in user's email and linked player name.
- Prominent "Logout" button.

## 5. Main Content: Tabbed Interface (Feature 3 & 4)
- **Tabs:**
  - Tab 1: "Game Nights" (chronological overview)
    - **Quick Stats Summary:** Stat cards for total game nights, mini-games, goals, top scorer, top assister.
    - **Game Night List:** MUI Accordion for each night (date as summary).
    - **Mini-Game Details:** Inside accordion, show mini-games, scores, team names, and goal/assist breakdown.
    - **Data Source:** `gameDays` collection in Firestore.
  - Tab 2: "Player Statistics"
    - **Players Table:** MUI Table with columns: Player Name, Game Nights Played, Mini-Games Played, Wins, Goals, Assists.
    - **Default Sort:** By "Goals" (desc). All numeric columns sortable.
    - **Highlight:** Current user's row.

## 6. Personalized View Filter (Feature 5)
- **Show My Stats Only:** MUI Switch or toggle button, visible in both tabs.
- **Functionality:**
  - OFF: Show all community data.
  - ON: Filter to only user's data in both tabs.

## 7. Data Fetching, Caching, and Real-Time Updates
### Goals
- Minimize unnecessary Firestore reads.
- Always show up-to-date data when DB changes.
- Fast initial loads and background updates.

### Approach
- **Local Cache Layer:** Use React Context or custom hooks for in-memory cache. Optionally persist with IndexedDB/localStorage.
- **Firestore Real-Time Listeners:** Use `onSnapshot` for `gameDays` and `players`. Update cache and UI only on changes.
- **Stale-While-Revalidate:** On push update, optionally re-fetch changed docs. Revalidate cache on tab focus or after interval.
- **Avoid Unnecessary Reads:** No polling. Listeners set up once per session. Remove listeners on unmount.
- **Error Handling:** Show cached data with warning if Firestore is unavailable. Show error if cache is empty and Firestore fails.

---

# Detailed Development Steps

## 1. Project Setup & Structure
- Create `dashboard` directory under `src/components/` for dashboard components.
- Create `src/hooks/` for custom hooks (data fetching, caching).
- Ensure Firestore SDK and MUI are installed and configured.

## 2. Authentication & Routing Guard
- In `dashboard/page.tsx`, check:
  - If user is not authenticated: redirect to `/login`.
  - If authenticated but not linked: redirect to `/link-player`.
  - Only render dashboard if both checks pass.
- Add loading and error states for guard logic.

## 3. Data Caching & Real-Time Updates
- **Design cache context or hooks** (e.g., `useGameNightsCache`, `usePlayerStatsCache`).
- **Initial Data Load:** Check cache, use if present, else fetch from Firestore and populate cache.
- **Set up Firestore listeners** (`onSnapshot`) for `gameDays` and `players`. Update cache and UI on changes.
- **Stale-While-Revalidate:** Revalidate cache on tab focus or after interval.
- **Cleanup:** Remove listeners on unmount.

## 4. Header & User Display
- Create `Header.tsx` to show user email, player name, and logout button. Style for mobile/desktop.

## 5. Tabbed Interface
- Use MUI `Tabs` and `TabPanel` in dashboard page. State for current tab. Ensure accessibility and responsiveness.

## 6. Show My Stats Only Toggle
- Create `ShowMyStatsSwitch.tsx` (MUI Switch/Toggle). State managed in dashboard page, passed to both tabs. Prominent and accessible.

## 7. Game Nights Tab
- **StatsSummary.tsx:** Compute and display stat cards (total nights, mini-games, goals, top scorer, top assister).
- **GameNightsAccordion.tsx:** List all/filtered game nights as MUI Accordions. Accordion summary: date. Details: mini-games, scores, team names, goal/assist breakdown. Use cache and real-time updates. Handle empty/loading states.

## 8. Player Statistics Tab
- **PlayerStatsTable.tsx:** Display all/filtered players in MUI Table. Columns: Name, Game Nights, Mini-Games, Wins, Goals, Assists. Default sort: Goals (desc). Sorting for all numeric columns. Highlight current user. Use cache and real-time updates. Handle empty/loading states.

## 9. Styling, Responsiveness, and Accessibility
- Use blue/white theme. Responsive props for all layouts. Add aria-labels and keyboard navigation. Test on different screen sizes.

## 10. Error Handling & Edge Cases
- Show loading spinners while fetching. Show error messages if fetch fails. Show empty states if no data. If Firestore unavailable, show cached data with warning.

## 11. Testing & QA
- Test all flows: auth guard, data loading, real-time updates, filtering, sorting, mobile/desktop, logout/re-login. Check Firestore read counts. Code review and QA before deployment. 