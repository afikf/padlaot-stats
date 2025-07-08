// auth-manager.js - Central Authentication Manager
import { auth, db, googleProvider } from './firebase-config.js';
import { 
    signInWithPopup, 
    onAuthStateChanged,
    signOut as firebaseSignOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    collection, 
    doc, 
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    serverTimestamp,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Auth States
export const AuthState = {
    INITIALIZING: 'initializing',
    LOGGED_OUT: 'logged_out',
    NEEDS_PLAYER_LINK: 'needs_player_link',
    READY: 'ready'
};

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.currentState = AuthState.INITIALIZING;
        this.stateListeners = new Set();
        this.userDoc = null;
        this.playerDoc = null;
        
        // Initialize auth state monitoring
        this.initAuthStateMonitoring();
    }
    
    // Initialize auth state monitoring
    initAuthStateMonitoring() {
        onAuthStateChanged(auth, async (user) => {
            console.log('Auth state changed:', user ? user.email : 'No user');
            
            try {
                if (!user) {
                    await this.handleLoggedOutState();
                    return;
                }
                
                await this.processUserAuth(user);
            } catch (error) {
                console.error('Error in auth state change:', error);
                await this.handleLoggedOutState();
            }
        });
    }
    
    // Process authenticated user
    async processUserAuth(user) {
        this.currentUser = user;
        this.updateState(AuthState.INITIALIZING);
        
        try {
            // First check if there's an existing admin document with this email
            const adminsRef = collection(db, 'admins');
            const emailQuery = query(adminsRef, where('email', '==', user.email));
            const existingAdminSnap = await getDocs(emailQuery);
            
            if (!existingAdminSnap.empty) {
                // Found existing admin document with this email
                const existingAdmin = existingAdminSnap.docs[0];
                const existingData = existingAdmin.data();
                
                if (existingAdmin.id !== user.uid) {
                    // We found an admin doc with matching email but different ID
                    // Update the existing document with the new auth UID
                    await runTransaction(db, async (transaction) => {
                        // Delete the document with the new UID if it exists
                        const newUidDocRef = doc(db, 'admins', user.uid);
                        const newUidDoc = await transaction.get(newUidDocRef);
                        if (newUidDoc.exists()) {
                            transaction.delete(newUidDocRef);
                        }
                        
                        // Update the existing admin document with the new UID
                        const existingDocRef = doc(db, 'admins', existingAdmin.id);
                        const updatedData = {
                            ...existingData,
                            lastLoginAt: serverTimestamp()
                        };
                        // Create new document with user.uid
                        transaction.set(doc(db, 'admins', user.uid), updatedData);
                        // Delete old document
                        transaction.delete(existingDocRef);
                    });
                } else {
                    // Just update the last login time
                    await updateDoc(doc(db, 'admins', user.uid), {
                        lastLoginAt: serverTimestamp()
                    });
                }
                
                this.userDoc = existingData;
                
                // Check if user needs to link player
                if (!this.userDoc.isRegistered || !this.userDoc.playerId) {
                    this.updateState(AuthState.NEEDS_PLAYER_LINK);
                    return;
                }
                
                // Get player document
                if (this.userDoc.playerId) {
                    const playerDocRef = doc(db, 'players', this.userDoc.playerId);
                    const playerDocSnap = await getDoc(playerDocRef);
                    if (playerDocSnap.exists()) {
                        this.playerDoc = playerDocSnap.data();
                    }
                }
                
                this.updateState(AuthState.READY);
                return;
            }
            
            // No existing admin found with this email, proceed with normal flow
            const userDocRef = doc(db, 'admins', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (!userDocSnap.exists()) {
                // Create new user document
                await this.createNewUserDocument(user);
                this.updateState(AuthState.NEEDS_PLAYER_LINK);
                return;
            }
            
            // Update last login time
            await updateDoc(userDocRef, {
                lastLoginAt: serverTimestamp()
            });
            
            this.userDoc = userDocSnap.data();
            
            // Check if user needs to link player
            if (!this.userDoc.isRegistered || !this.userDoc.playerId) {
                this.updateState(AuthState.NEEDS_PLAYER_LINK);
                return;
            }
            
            // Get player document
            if (this.userDoc.playerId) {
                const playerDocRef = doc(db, 'players', this.userDoc.playerId);
                const playerDocSnap = await getDoc(playerDocRef);
                if (playerDocSnap.exists()) {
                    this.playerDoc = playerDocSnap.data();
                }
            }
            
            this.updateState(AuthState.READY);
        } catch (error) {
            console.error('Error processing user auth:', error);
            throw error;
        }
    }
    
    // Create new user document
    async createNewUserDocument(user) {
        const userDocRef = doc(db, 'admins', user.uid);
        const userData = {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: 'user',
            isRegistered: false,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            playerId: null,
            playerName: null
        };
        
        await setDoc(userDocRef, userData);
        this.userDoc = userData;
    }
    
    // Handle logged out state
    async handleLoggedOutState() {
        this.currentUser = null;
        this.userDoc = null;
        this.playerDoc = null;
        this.updateState(AuthState.LOGGED_OUT);
    }
    
    // Update auth state
    updateState(newState) {
        console.log('Auth state updating to:', newState);
        this.currentState = newState;
        this.notifyStateListeners();
    }
    
    // Add state listener
    addStateListener(listener) {
        this.stateListeners.add(listener);
        // Immediately notify new listener of current state
        listener(this.currentState, this.getStateData());
    }
    
    // Remove state listener
    removeStateListener(listener) {
        this.stateListeners.delete(listener);
    }
    
    // Get current state data
    getStateData() {
        return {
            user: this.currentUser,
            userDoc: this.userDoc,
            playerDoc: this.playerDoc
        };
    }
    
    // Notify all state listeners
    notifyStateListeners() {
        const stateData = this.getStateData();
        for (const listener of this.stateListeners) {
            listener(this.currentState, stateData);
        }
    }
    
    // Sign in with Google
    async signInWithGoogle() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (error) {
            console.error('Google sign-in error:', error);
            throw error;
        }
    }
    
    // Sign out
    async signOut() {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }
    
    // Link player to user
    async linkPlayerToUser(playerId) {
        if (!this.currentUser) throw new Error('No authenticated user');
        
        try {
            // Get player document first to verify it exists
            const playerDocRef = doc(db, 'players', playerId);
            const playerDocSnap = await getDoc(playerDocRef);
            
            if (!playerDocSnap.exists()) {
                throw new Error('Selected player does not exist');
            }
            
            const playerData = playerDocSnap.data();
            
            // Use transaction to update both documents atomically
            await runTransaction(db, async (transaction) => {
                // Update admin document
                const userDocRef = doc(db, 'admins', this.currentUser.uid);
                transaction.update(userDocRef, {
                    playerId: playerId,
                    playerName: playerData.name,
                    isRegistered: true,
                    registeredAt: serverTimestamp(),
                    lastLoginAt: serverTimestamp()
                });
                
                // Update player document
                transaction.update(playerDocRef, {
                    uid: this.currentUser.uid
                });
            });
            
            // Refresh auth state
            await this.processUserAuth(this.currentUser);
        } catch (error) {
            console.error('Error linking player:', error);
            throw error;
        }
    }
    
    // Get available players for linking
    async getAvailablePlayers() {
        try {
            // Get all players
            const playersSnapshot = await getDocs(collection(db, 'players'));
            const players = [];
            
            // Get all admin documents to check which players are already linked
            const adminsSnapshot = await getDocs(collection(db, 'admins'));
            const linkedPlayerIds = new Set(
                adminsSnapshot.docs
                    .map(doc => doc.data().playerId)
                    .filter(id => id)
            );
            
            // Filter and map players
            playersSnapshot.forEach(doc => {
                if (!linkedPlayerIds.has(doc.id)) {
                    players.push({
                        id: doc.id,
                        ...doc.data()
                    });
                }
            });
            
            return players.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            console.error('Error getting available players:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const authManager = new AuthManager(); 