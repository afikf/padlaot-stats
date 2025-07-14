# Player Rating Feature Plan

## 1. Data Model

### Firestore Structure

#### A. Ratings Collection (Recommended)
- **Collection:** `playerRatings`
- **Document ID:** `{playerId}` (one doc per player)
- **Fields:**
  - `average`: number (current average rating, updated on each new/updated rating)
  - `numRatings`: number (how many users have rated this player)
- **Subcollection:** `ratings`
  - **Document ID:** `{raterUserId}`
  - **Fields:**
    - `value`: number (1–9)
    - `timestamp`: Firestore timestamp (when the rating was submitted)

**Example:**
```
playerRatings/
  player123/
    average: 7.2
    numRatings: 5
    ratings/
      userA: { value: 8, timestamp: ... }
      userB: { value: 7, timestamp: ... }
      ...
```

#### B. User Rating Tasks
- **Collection:** `ratingTasks`
- **Document ID:** `{taskId}` (auto-generated)
- **Fields:**
  - `assignedBy`: userId (super-admin who assigned)
  - `assignedTo`: userId (user who needs to rate)
  - `status`: 'pending' | 'completed' | 'expired'
  - `createdAt`: timestamp
  - `completedAt`: timestamp (if completed)
  - `playersToRate`: array of playerIds (optional, or just rate all active players)

**Example:**
```
ratingTasks/
  task456/
    assignedBy: superAdminId
    assignedTo: userC
    status: 'pending'
    createdAt: ...
    completedAt: null
    playersToRate: [player123, player456, ...]
```

---

## 2. Admin (Super-Admin) Flows & UI

### A. Assign Rating Task
- **Access:** Admin panel, new “Player Ratings” section.
- **UI:**  
  - List of users (with search/filter).
  - Button: “Assign rating task.”
  - Select which players to rate (or default: all active players).
  - Confirm assignment.
- **Result:**  
  - Creates a `ratingTasks` doc for the user.
  - User receives a notification or dashboard prompt.

### B. Track Rating Progress
- **UI:**  
  - List of all rating tasks (filter by status: pending/completed).
  - For each task: assigned user, assigned date, status, completed date.
  - See which users have not completed their tasks.

### C. Reset Ratings
- **UI:**  
  - For each player, see all received ratings (user, value, timestamp).
  - Button to “Reset all ratings” for a player.
  - Button to “Delete rating” for a specific user’s rating for a player.

### D. View Ratings
- **UI:**  
  - For each player: show average, number of ratings, and breakdown (who rated what, when).
  - Only visible to super-admins.

---

## 3. User Flows & UI

### A. Rating Prompt
- **Access:**  
  - On dashboard, if user has a pending `ratingTask`, show a prominent prompt/banner:  
    “You have been asked to rate players. Click here to start.”
- **UI:**  
  - List of players to rate (with photo/name).
  - For each: 1–9 selector (slider, radio buttons, or dropdown).
  - Option to skip players they don’t know (optional).
  - Progress indicator (“12/18 rated”).
  - Submit button (disabled until all required ratings are filled).
- **After submit:**  
  - Mark `ratingTask` as completed.
  - Store each rating in `playerRatings/{playerId}/ratings/{userId}` with timestamp.

---

## 4. Integration Points in Current UI

- **Admin Panel:**  
  - New “Player Ratings” section/tab for all rating management.
- **Dashboard (for users):**  
  - If user has a pending rating task, show a banner or modal at the top.
  - “Rate Players” page accessible from the prompt.
- **Player Profile (for super-admin):**  
  - Show average rating, number of ratings, and breakdown.
- **Team Creation (future):**  
  - Use average ratings to suggest balanced teams.

---

## 5. Security & Permissions

- Only super-admins can:
  - Assign rating tasks
  - View averages and breakdowns
  - Reset/delete ratings
- Only assigned users can submit ratings, and only for the players in their task.
- Regular users cannot see any ratings or averages.

---

## 6. Future Extensions

- **Rating history:** Store all past ratings with timestamps for trend analysis.
- **Anonymous feedback:** (if ever needed, can be added as a field).
- **Automated reminders:** Notify users if they haven’t completed their rating task after X days.

---

## 7. Summary of Pages/Components

- **Admin Panel:**
  - Player Ratings Dashboard (assign, track, reset, view)
  - Player Profile (with ratings breakdown)
- **User Dashboard:**
  - Rating Prompt/Banner
  - Rate Players Page (task-based)
- **Shared:**
  - Team Balancer (future, uses ratings) 