# 🎯 User Management System Plan

## Overview
This plan outlines the implementation of a user management system that allows players to sign in with their Google accounts and associate themselves with their player profiles in the StatsPad football management system. The system uses a unified authentication approach through the existing admins collection.

## Phase 1: Database Schema Updates

### 1.1 Enhanced Admins Collection (Unified Authentication)
```javascript
// Current admin structure
{
  email: "admin@gmail.com",
  role: "super-admin", // or "admin"
  addedAt: timestamp,
  addedBy: "creator@gmail.com"
}

// NEW enhanced structure (replaces separate user-player mapping)
{
  email: "user@gmail.com",
  role: "user",                       // NEW: "user", "admin", "super-admin"
  playerId: "player-123",             // NEW: Associated player ID
  playerName: "שם השחקן",             // NEW: Player name for quick reference
  isRegistered: true,                 // NEW: Has completed player association
  registeredAt: timestamp,            // NEW: When they registered
  lastLoginAt: timestamp,             // NEW: Last login time
  addedAt: timestamp,
  addedBy: "admin@gmail.com"
}
```

### 1.2 Role Hierarchy & Permissions
```javascript
const permissions = {
  'super-admin': [
    'admin_panel_full',        // Full admin interface
    'user_management',         // Manage all users
    'game_management_full',    // Create, edit, delete games
    'live_game_management',    // Manage live games
    'player_dashboard'         // Personal player data
  ],
  
  'admin': [
    'admin_panel_full',        // Full admin interface  
    'game_management_full',    // Create, edit, delete games
    'live_game_management',    // Manage live games
    'player_dashboard'         // Personal player data
  ],
  
  'user': [
    'admin_panel_limited',     // LIMITED admin interface (live games only)
    'live_game_management',    // Manage live games only
    'player_dashboard'         // Personal player data
  ]
};
```

## Phase 2: Authentication Flow Redesign

### 2.1 Enhanced User Journey (Unified Authentication)
```
1. User visits site
2. Google Sign-in page
3. After successful auth:
   - Check if email exists in admins collection
   - If YES: Load role and redirect based on permissions
     * super-admin/admin: Full admin panel
     * user: Limited admin panel (live games only) + player dashboard
   - If NO: Show player selection page for new user registration
4. Player selection page:
   - Show all players without email association
   - User selects their player identity
   - Create new record in admins collection with role "user"
   - Set playerId and playerName fields
5. Redirect to role-appropriate interface
```

### 2.2 Player Selection Interface
- **Search/Filter**: Search players by name
- **Player Cards**: Show player stats, recent games
- **Confirmation**: "Are you [Player Name]?" dialog
- **New Player Option**: "I'm not in the list" → Create new player

### 2.3 Role-Based Interface Routing
- **Super-Admin**: Full admin panel + player dashboard
- **Admin**: Full admin panel + player dashboard  
- **User**: Limited admin panel (live games only) + player dashboard

## Phase 3: Implementation Steps

### 3.1 Database Migration
```javascript
// Enhance existing admins collection with new fields:
// - playerId: Associated player ID
// - playerName: Player name for quick reference  
// - isRegistered: Has completed player association
// - registeredAt: When they registered
// - lastLoginAt: Last login time
// Add indexes for performance
```

### 3.2 Authentication System
```javascript
// Enhanced authentication flow:
1. Google Sign-in
2. Check admins collection by email
3. Route based on role:
   - super-admin/admin: Full admin panel
   - user: Limited admin panel (live games) + player dashboard
   - new user: Player selection page
```

### 3.3 Player Selection Page
```html
<!-- New page: player-selection.html -->
<div class="player-selection-container">
  <h2>בחר את השחקן שלך</h2>
  <div class="search-container">
    <input type="text" placeholder="חפש שחקן...">
  </div>
  <div class="players-grid">
    <!-- Player cards with stats -->
  </div>
  <button class="new-player-btn">אני לא ברשימה</button>
</div>
```

### 3.4 Enhanced Interface Design

#### 3.4.1 User Dashboard (Limited Admin Access)
```html
<!-- Enhanced admin.html with role-based visibility -->
<div class="admin-container">
  <div class="tabs">
    <button class="tab-button active" data-tab="dashboard">לוח בקרה</button>
    <!-- Only show live games for users -->
    <button class="tab-button" data-tab="player-data">הנתונים שלי</button>
  </div>
  
  <div class="dashboard-panel">
    <!-- LIMITED: Only show live games (status 1 or 2) -->
    <!-- Users can manage stopwatch, add goals, etc. -->
    <!-- NO access to create/edit/delete games -->
  </div>
  
  <div class="player-data-panel hidden">
    <!-- Personal player statistics and history -->
  </div>
</div>
```

#### 3.4.2 Admin/Super-Admin Interface
```html
<!-- Full admin.html interface -->
<div class="admin-container">
  <div class="tabs">
    <button class="tab-button active" data-tab="dashboard">לוח בקרה</button>
    <button class="tab-button" data-tab="admin-management">ניהול מנהלים</button>
    <button class="tab-button" data-tab="player-data">הנתונים שלי</button>
  </div>
  
  <!-- Full admin functionality -->
  <!-- Create, edit, delete games -->
  <!-- User management (super-admin only) -->
  <!-- Personal player dashboard -->
</div>
```

## Phase 4: User Experience Features

### 4.1 Personalized Dashboard
- **Personal Stats**: Games played, goals scored, win rate
- **Recent Games**: Last 5 games with performance
- **Upcoming Games**: Games they're registered for
- **Team History**: Teams they've played with
- **Achievement Badges**: Goals milestones, attendance streaks

### 4.2 Data Privacy & Security
- **Email Verification**: Confirm email ownership
- **Profile Management**: Update personal info
- **Privacy Settings**: Control data visibility
- **Account Deletion**: Remove association

## Phase 5: Admin Integration

### 5.1 Enhanced Admin Panel Features

#### 5.1.1 Super-Admin Only Features
```javascript
// User Management (super-admin only):
- View all user-player associations
- Promote users to admin role
- Manage admin permissions
- Send registration invitations
- User account management
- Registration analytics
```

#### 5.1.2 Admin Features
```javascript
// Game Management (admin + super-admin):
- Create, edit, delete games
- Full game history access
- Player statistics management
- Team management
```

#### 5.1.3 User Features (Limited Admin Access)
```javascript
// Live Game Management (all authenticated users):
- Manage live games (status 1 or 2)
- Stopwatch controls
- Goal logging
- Score updates
- Game status changes (start/end)
// NO access to create/edit/delete games
```

### 5.2 Role-Based Access Control
- **Super-Admin**: Full system control + user management
- **Admin**: Full game management + personal data
- **User**: Live game management + personal data only
- **Guest**: Public read-only access

## Phase 6: Technical Implementation

### 6.1 File Structure (Enhanced)
```
/
├── index.html (public game history)
├── auth.html (Google sign-in)
├── player-selection.html (choose player)
├── admin.html (unified admin interface - role-based UI)
├── js/
│   ├── auth.js (authentication logic)
│   ├── player-selection.js
│   ├── admin.js (enhanced with role-based features)
│   └── user-management.js
```

### 6.2 Enhanced Security Considerations
- **Three-Tier Role System**: Super-Admin, Admin, User
- **Granular Permissions**: Live game access for all users
- **Data Isolation**: Users see only their personal data
- **Interface Restrictions**: Role-based UI visibility
- **Email Verification**: Prevent account hijacking
- **Session Management**: Secure login/logout

## Phase 7: Migration Strategy

### 7.1 Gradual Rollout (Revised)
1. **Phase A**: Enhance admins collection with new fields
2. **Phase B**: Enable user registration with player association
3. **Phase C**: Encourage existing players to register
4. **Phase D**: Enable live game management for all users
5. **Phase E**: Promote active users to admin roles as needed

### 7.2 Backward Compatibility
- **Public Access**: Keep public game history available
- **Guest Mode**: Allow viewing without registration
- **Admin Override**: Admins can manage unregistered players
- **Progressive Enhancement**: Users get more features as they engage

## Phase 8: Future Enhancements

### 8.1 Advanced Features
- **Player Profiles**: Photos, bio, preferences
- **Social Features**: Friend connections, messaging
- **Notifications**: Email alerts for games, achievements
- **Mobile App**: Native mobile experience

### 8.2 Analytics & Insights
- **Personal Analytics**: Detailed performance metrics
- **Comparison Tools**: Compare with other players
- **Progress Tracking**: Improvement over time
- **Recommendations**: Suggested training, positions

## 🚀 Implementation Priority (Updated)

### High Priority (Phase 1-3)
1. Enhanced admins collection schema
2. Player selection interface
3. Role-based authentication flow
4. Limited admin access for users

### Medium Priority (Phase 4-5)
1. Personal player dashboard integration
2. Enhanced admin panel features
3. User registration management

### Low Priority (Phase 6-8)
1. Advanced user features
2. Mobile optimization
3. Social features
4. Advanced analytics

## 📋 Next Steps (Updated)

1. **Enhance admins collection** - Add new fields for user-player mapping
2. **Create player selection page** - Core registration functionality
3. **Implement role-based authentication** - Route users based on permissions
4. **Add limited admin access** - Enable live game management for users
5. **Test with pilot users** - Validate the complete flow
6. **Gradually roll out** - Expand to all players with promotion path

## Technical Notes (Updated)

### Database Collections
- `players` - Existing player data (unchanged)
- `admins` - Enhanced with user-player mapping fields
- `game-days` - Existing game data (unchanged)

### Authentication Flow
1. Google OAuth integration
2. Check admins collection for email
3. Role-based routing (Super-Admin/Admin/User/Guest)
4. Session management with role persistence

### User Roles (Enhanced)
- **Guest**: Public access, view-only
- **User**: Limited admin access (live games only) + personal data
- **Admin**: Full game management + personal data
- **Super-Admin**: User management + full system control

### Key Changes from Original Plan
1. **Unified Authentication**: Single admins collection instead of separate user-player mapping
2. **Enhanced User Role**: Users get limited admin access for live games
3. **Simplified Architecture**: Fewer collections, cleaner data model
4. **Progressive Access**: Users can participate in live game management

## Security Considerations

### Data Protection
- Email verification required
- Player data isolation
- Secure session management
- Privacy controls

### Access Control
- Role-based permissions
- Data scope limitations
- Admin oversight capabilities
- Audit logging

## Success Metrics

### User Adoption
- Registration completion rate
- Daily active users
- Session duration
- Feature usage

### System Performance
- Page load times
- Database query efficiency
- Error rates
- User satisfaction 