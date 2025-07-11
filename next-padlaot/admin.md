# Detailed Development Plan: Admin Game Night Creation System

## **Phase 1: Core Infrastructure & Admin Access**

### **1.1 Admin Authentication & Authorization**
- **AdminGuard Component:** Reusable guard that checks user role (admin/super admin)
- **AdminContext:** Manage admin permissions, state, and actions
- **Role System:** Extend user types to include role field (user/admin/super admin)
- **Admin Route Protection:** Protect all admin routes with AdminGuard

### **1.2 Admin Navigation & Layout**
- **Admin Layout:** Dedicated layout with sidebar navigation for admin tools
- **Admin Header:** Show admin user info, logout, and navigation to main app
- **Sidebar Navigation:** 
  - Dashboard (live/upcoming games overview)
  - Create Game Night (wizard)
  - Player Management (future)
  - User Management (super admin only)
  - System Settings (future)
- **Main Dashboard Integration:** Add "Admin Panel" button in header for admin users

### **1.3 Admin Dashboard Page**
- **Live Game Nights Section:** Show current live games with quick actions
- **Upcoming Game Nights Section:** Show future games with edit/delete options
- **Quick Stats:** Total game nights, active players, system health
- **Recent Activity:** Last created game nights, recent admin actions
- **Navigation to Create:** Prominent "Create New Game Night" button

## **Phase 2: Game Night Creation Wizard**

### **2.1 Wizard Infrastructure**
- **Multi-Step Form Component:** Reusable wizard with progress indicator
- **Step Navigation:** Back/Next buttons with validation
- **Progress Persistence:** Auto-save to localStorage for recovery
- **Step Validation:** Each step validates before allowing progression
- **Confirmation Dialogs:** "Are you sure?" for critical actions

### **2.2 Step 1: Date Selection**
- **Date Picker:** Calendar interface with Israel timezone
- **Date Validation:**
  - Must be today or future date
  - No conflicts with existing game nights
  - Warning if creating for today after 21:00
- **Timezone Handling:** Use `Asia/Jerusalem` timezone for accurate comparison
- **Visual Feedback:** Show selected date prominently

### **2.3 Step 2: Player Selection (21 Players)**
- **Player Cards Interface:**
  - Visual cards with player avatar/initials, name
  - Search/filter functionality (like dashboard)
  - Multi-select checkboxes
  - Drag-and-drop support
- **Selection Management:**
  - "X/21 players selected" counter
  - "Clear Selection" button
  - "Select All" button (if 21+ players available)
- **Validation:** Exactly 21 players required to proceed
- **Player List Source:** Use existing players collection with real-time updates

### **2.4 Step 3: Team Assignment (3 Teams of 7)**
- **Team Assignment Interface:**
  - Three team cards/sections
  - Drag-and-drop between teams
  - Click-to-assign functionality
  - Visual team previews
- **Captain System:**
  - First player in each team is captain by default
  - 'C' chip label on captain
  - Click any player to make them captain
  - Auto-reorder team list (captain first)
  - Smooth animations for captain changes
- **Team Validation:**
  - Real-time validation: "Team A: 7/7 ✓"
  - Prevent assignment if team is full
  - Visual feedback for valid/invalid states
- **Auto-Split Feature:**
  - "Random Split" button for quick assignment
  - Future: "Balanced Split" (when rating system is implemented)

### **2.5 Wizard Completion & Game Night Creation**
- **Final Review:** Show summary of date, players, and teams
- **Creation Process:**
  - Create game night document in Firestore
  - Set status: "live" (if today) or "upcoming" (if future)
  - Set teams structure with captain information
  - Set participants list
  - Leave miniGames array empty (to be added later)
- **Success Handling:**
  - Toast success message
  - Redirect to admin dashboard
  - Show new game night in live/upcoming section

## **Phase 3: Admin Dashboard Features**

### **3.1 Live Game Nights Management**
- **Live Games Overview:** List of current live games
- **Quick Actions:** Edit, pause, complete, view details
- **Real-time Updates:** Show live game status changes
- **Player Count:** Show how many players are currently active

### **3.2 Upcoming Game Nights Management**
- **Future Games List:** Chronological list of upcoming games
- **Edit Functionality:** Modify date, players, teams
- **Delete Functionality:** Remove game night (with confirmation)
- **Status Changes:** Change from upcoming to live when date arrives

### **3.3 Admin Actions & Audit**
- **Action Logging:** Log all admin actions (create, edit, delete)
- **Audit Trail:** View history of admin actions
- **Error Recovery:** Handle failed operations gracefully

## **Phase 4: Future Features Preparation**

### **4.1 Subscription System Foundation**
- **Subscription Collection:** Store player subscriptions for specific dates
- **Subscription Integration:** 
  - During player selection, suggest subscribed players
  - Show subscription status in player cards
  - Auto-prioritize subscribed players
- **Subscription Management:** Admin tools to manage subscriptions

### **4.2 Player Rating System Preparation**
- **Rating Data Structure:** Prepare for player rating fields
- **Balanced Team Assignment:** Future algorithm using ratings
- **Performance Tracking:** Foundation for rating calculations

### **4.3 User Management (Super Admin)**
- **User List:** View all users with their roles
- **Role Management:** Promote/demote users to admin/super admin
- **User Statistics:** View user activity and participation

## **Phase 5: Technical Implementation Details**

### **5.1 Data Structures**
```typescript
// Extended User type
interface User {
  // ... existing fields
  role: 'user' | 'admin' | 'super admin';
}

// Game Night with teams structure
interface GameNight {
  // ... existing fields
  teams: {
    A: { players: string[], captain: string },
    B: { players: string[], captain: string },
    C: { players: string[], captain: string }
  };
  participants: string[];
  status: 0 | 1 | 2 | 3 | 4; // draft, upcoming, live, completed, not completed
}

// Future: Subscription structure
interface Subscription {
  playerId: string;
  date: string;
  status: 'active' | 'cancelled';
  createdAt: Timestamp;
}
```

### **5.2 Component Architecture**
- **AdminLayout:** Main admin layout with sidebar
- **AdminGuard:** Route protection component
- **GameNightWizard:** Multi-step wizard component
- **PlayerSelection:** Step 2 component with cards and search
- **TeamAssignment:** Step 3 component with drag-drop
- **AdminDashboard:** Main admin overview page
- **AdminContext:** Admin state management

### **5.3 Error Handling & Validation**
- **Network Errors:** Retry mechanisms for failed operations
- **Validation Errors:** Clear error messages for each step
- **Permission Errors:** Handle unauthorized access gracefully
- **Data Conflicts:** Handle concurrent modifications

## **Development Order:**
1. **Admin Infrastructure** (Guard, Context, Layout)
2. **Admin Dashboard** (basic overview)
3. **Wizard Step 1** (Date selection)
4. **Wizard Step 2** (Player selection)
5. **Wizard Step 3** (Team assignment)
6. **Game Night Creation** (Firestore integration)
7. **Admin Dashboard Features** (live/upcoming management)
8. **Future Features Foundation** (subscriptions, ratings prep)

This plan provides a solid foundation for the admin system while preparing for future enhancements. 