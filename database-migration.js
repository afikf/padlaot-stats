// Database Migration Script - Phase 1: Enhanced Admins Collection
// This script adds new fields to the existing admins collection for user-player mapping

import { 
    collection, 
    getDocs, 
    doc, 
    updateDoc, 
    writeBatch,
    setDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

// Migration configuration
const MIGRATION_CONFIG = {
    dryRun: false, // Set to true to test without making changes
    batchSize: 10, // Number of documents to process in each batch
    logLevel: 'verbose' // 'minimal', 'normal', 'verbose'
};

// Migration results tracking
let migrationResults = {
    totalAdmins: 0,
    adminsUpdated: 0,
    adminsSkipped: 0,
    errors: [],
    startTime: null,
    endTime: null
};

// Enhanced admin schema fields
const ENHANCED_ADMIN_FIELDS = {
    // New fields for user-player mapping
    playerId: null,              // Associated player ID (will be set during user registration)
    playerName: null,            // Player name for quick reference
    isRegistered: false,         // Has completed player association
    registeredAt: null,          // When they registered (timestamp)
    lastLoginAt: null,           // Last login time (timestamp)
    
    // Keep existing fields as they are:
    // email, role, addedAt, addedBy
};

/**
 * Log messages with different levels
 */
function logMessage(message, level = 'normal') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    
    console.log(logEntry);
    
    if (level === 'verbose' && MIGRATION_CONFIG.logLevel !== 'verbose') {
        return;
    }
    
    // Add to DOM log if exists
    const logElement = document.getElementById('migration-log');
    if (logElement) {
        logElement.textContent += logEntry + '\n';
        logElement.scrollTop = logElement.scrollHeight;
    }
}

/**
 * Update progress bar if exists
 */
function updateProgress(current, total) {
    const progressBar = document.getElementById('migration-progress');
    const progressText = document.getElementById('migration-progress-text');
    
    if (progressBar && progressText) {
        const percentage = Math.round((current / total) * 100);
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${current}/${total} (${percentage}%)`;
    }
}

/**
 * Check if admin document needs migration
 */
function needsMigration(adminDoc) {
    const data = adminDoc.data();
    
    // Check if any of the new fields are missing
    return !data.hasOwnProperty('playerId') ||
           !data.hasOwnProperty('playerName') ||
           !data.hasOwnProperty('isRegistered') ||
           !data.hasOwnProperty('registeredAt') ||
           !data.hasOwnProperty('lastLoginAt');
}

/**
 * Prepare enhanced admin document
 */
function prepareEnhancedAdmin(adminDoc) {
    const existingData = adminDoc.data();
    
    // Merge existing data with new fields
    const enhancedData = {
        ...existingData,
        ...ENHANCED_ADMIN_FIELDS,
        // Preserve existing timestamps
        addedAt: existingData.addedAt || new Date(),
        // Set migration timestamp
        migratedAt: new Date()
    };
    
    return enhancedData;
}

/**
 * Migrate a single admin document
 */
async function migrateAdminDocument(adminDoc) {
    try {
        const adminId = adminDoc.id;
        const adminData = adminDoc.data();
        
        logMessage(`Migrating admin: ${adminData.email}`, 'verbose');
        
        if (!needsMigration(adminDoc)) {
            logMessage(`Admin ${adminData.email} already migrated, skipping`, 'verbose');
            migrationResults.adminsSkipped++;
            return true;
        }
        
        const enhancedData = prepareEnhancedAdmin(adminDoc);
        
        if (MIGRATION_CONFIG.dryRun) {
            logMessage(`DRY RUN: Would update admin ${adminData.email}`, 'verbose');
            logMessage(`New fields: ${JSON.stringify(ENHANCED_ADMIN_FIELDS, null, 2)}`, 'verbose');
        } else {
            const adminRef = doc(db, 'admins', adminId);
            await updateDoc(adminRef, enhancedData);
            logMessage(`✅ Successfully migrated admin: ${adminData.email}`, 'verbose');
        }
        
        migrationResults.adminsUpdated++;
        return true;
        
    } catch (error) {
        const errorMsg = `Error migrating admin ${adminDoc.data().email}: ${error.message}`;
        logMessage(`❌ ${errorMsg}`, 'normal');
        migrationResults.errors.push(errorMsg);
        return false;
    }
}

/**
 * Migrate all admin documents
 */
async function migrateAdminsCollection() {
    try {
        logMessage('🚀 Starting admins collection migration...');
        migrationResults.startTime = new Date();
        
        // Get all admin documents
        const adminsRef = collection(db, 'admins');
        const adminsSnapshot = await getDocs(adminsRef);
        
        migrationResults.totalAdmins = adminsSnapshot.size;
        logMessage(`Found ${migrationResults.totalAdmins} admin documents to process`);
        
        if (migrationResults.totalAdmins === 0) {
            logMessage('No admin documents found to migrate');
            return;
        }
        
        // Process admins in batches
        const adminDocs = adminsSnapshot.docs;
        let processedCount = 0;
        
        for (let i = 0; i < adminDocs.length; i += MIGRATION_CONFIG.batchSize) {
            const batch = adminDocs.slice(i, i + MIGRATION_CONFIG.batchSize);
            
            logMessage(`Processing batch ${Math.floor(i / MIGRATION_CONFIG.batchSize) + 1}...`);
            
            // Process batch
            const batchPromises = batch.map(adminDoc => migrateAdminDocument(adminDoc));
            await Promise.all(batchPromises);
            
            processedCount += batch.length;
            updateProgress(processedCount, migrationResults.totalAdmins);
            
            // Small delay between batches to avoid overwhelming Firestore
            if (i + MIGRATION_CONFIG.batchSize < adminDocs.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        migrationResults.endTime = new Date();
        const duration = (migrationResults.endTime - migrationResults.startTime) / 1000;
        
        logMessage('🎉 Migration completed!');
        logMessage(`Total time: ${duration.toFixed(2)} seconds`);
        logMessage(`Total admins: ${migrationResults.totalAdmins}`);
        logMessage(`Admins updated: ${migrationResults.adminsUpdated}`);
        logMessage(`Admins skipped: ${migrationResults.adminsSkipped}`);
        logMessage(`Errors: ${migrationResults.errors.length}`);
        
        if (migrationResults.errors.length > 0) {
            logMessage('❌ Migration errors:');
            migrationResults.errors.forEach(error => logMessage(`  - ${error}`));
        }
        
    } catch (error) {
        logMessage(`❌ Critical error during migration: ${error.message}`);
        throw error;
    }
}

/**
 * Validate migration results
 */
async function validateMigration() {
    try {
        logMessage('🔍 Validating migration results...');
        
        const adminsRef = collection(db, 'admins');
        const adminsSnapshot = await getDocs(adminsRef);
        
        let validatedCount = 0;
        let invalidCount = 0;
        
        adminsSnapshot.forEach((doc) => {
            const data = doc.data();
            const hasAllFields = Object.keys(ENHANCED_ADMIN_FIELDS).every(field => 
                data.hasOwnProperty(field)
            );
            
            if (hasAllFields) {
                validatedCount++;
            } else {
                invalidCount++;
                logMessage(`❌ Admin ${data.email} missing required fields`, 'verbose');
            }
        });
        
        logMessage(`✅ Validation complete: ${validatedCount} valid, ${invalidCount} invalid`);
        return invalidCount === 0;
        
    } catch (error) {
        logMessage(`❌ Validation error: ${error.message}`);
        return false;
    }
}

/**
 * Create example user document for testing
 */
async function createExampleUserDocument() {
    try {
        logMessage('📝 Creating example user document...');
        
        const exampleUser = {
            email: 'user@example.com',
            role: 'user',
            playerId: null,              // Will be set during registration
            playerName: null,            // Will be set during registration
            isRegistered: false,         // Will be set to true after player selection
            registeredAt: null,          // Will be set during registration
            lastLoginAt: null,           // Will be updated on each login
            addedAt: new Date(),
            addedBy: 'migration-script'
        };
        
        if (MIGRATION_CONFIG.dryRun) {
            logMessage('DRY RUN: Would create example user document');
            logMessage(`Example user data: ${JSON.stringify(exampleUser, null, 2)}`);
        } else {
            const userRef = doc(db, 'admins', 'example-user');
            await setDoc(userRef, exampleUser);
            logMessage('✅ Example user document created');
        }
        
    } catch (error) {
        logMessage(`❌ Error creating example user: ${error.message}`);
    }
}

/**
 * Main migration function
 */
async function runMigration(options = {}) {
    try {
        // Update configuration
        Object.assign(MIGRATION_CONFIG, options);
        
        logMessage('🎯 Starting Phase 1: Database Schema Updates');
        logMessage(`Configuration: ${JSON.stringify(MIGRATION_CONFIG, null, 2)}`);
        
        if (MIGRATION_CONFIG.dryRun) {
            logMessage('⚠️  DRY RUN MODE - No changes will be made to the database');
        }
        
        // Step 1: Migrate existing admins
        await migrateAdminsCollection();
        
        // Step 2: Validate migration
        const isValid = await validateMigration();
        
        // Step 3: Create example user document
        await createExampleUserDocument();
        
        // Step 4: Show next steps
        if (isValid) {
            logMessage('✅ Phase 1 migration completed successfully!');
            logMessage('📋 Next steps:');
            logMessage('  1. Test the enhanced admin collection structure');
            logMessage('  2. Implement player selection interface');
            logMessage('  3. Update authentication flow');
            logMessage('  4. Add role-based access control');
        } else {
            logMessage('❌ Migration completed with validation errors');
            logMessage('Please review the errors above and run the migration again');
        }
        
        return isValid;
        
    } catch (error) {
        logMessage(`❌ Migration failed: ${error.message}`);
        throw error;
    }
}

// Export functions for use in HTML page
window.runMigration = runMigration;
window.migrationResults = migrationResults;
window.MIGRATION_CONFIG = MIGRATION_CONFIG;

// Auto-run if loaded directly
if (typeof window !== 'undefined' && window.location.pathname.includes('migration')) {
    document.addEventListener('DOMContentLoaded', () => {
        logMessage('Database migration script loaded and ready');
        logMessage('Use runMigration() to start the migration process');
    });
} 