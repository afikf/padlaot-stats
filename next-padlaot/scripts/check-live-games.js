const admin = require('firebase-admin');
const cron = require('node-cron');

// Initialize Firebase Admin
const serviceAccount = require('../path-to-your-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Check for live game nights from yesterday and mark them as not completed
 */
async function checkLiveGameNights() {
  try {
    console.log('Starting daily check for live game nights...');
    
    // Get yesterday's date
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Format yesterday's date as YYYY-MM-DD for comparison
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    console.log(`Checking for live game nights from: ${yesterdayStr}`);
    
    // Query for live game nights from yesterday
    const liveGameNightsQuery = db.collection('gameDays')
      .where('status', '==', 2) // 2 = live
      .where('date', '==', yesterdayStr);
    
    const liveGameNightsSnapshot = await liveGameNightsQuery.get();
    
    if (liveGameNightsSnapshot.empty) {
      console.log('No live game nights found from yesterday');
      return;
    }
    
    console.log(`Found ${liveGameNightsSnapshot.size} live game night(s) from yesterday`);
    
    // Batch update to mark them as not completed
    const batch = db.batch();
    const updatedGameNights = [];
    
    liveGameNightsSnapshot.forEach((doc) => {
      const gameNightRef = doc.ref;
      batch.update(gameNightRef, {
        status: 4, // 4 = not completed
        autoCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        autoCompletedReason: 'Game night was still live after midnight (local script)'
      });
      updatedGameNights.push(doc.id);
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log(`Successfully marked ${updatedGameNights.length} game night(s) as not completed:`, updatedGameNights);
    
  } catch (error) {
    console.error('Error in checkLiveGameNights function:', error);
  }
}

// Schedule the task to run daily at 00:01 Israel time
// '1 0 * * *' = Every day at 00:01
cron.schedule('1 0 * * *', () => {
  console.log('Running scheduled check for live game nights...');
  checkLiveGameNights();
}, {
  timezone: 'Asia/Jerusalem'
});

console.log('Scheduled task started. Will run daily at 00:01 Israel time.');
console.log('Press Ctrl+C to stop.');

// Keep the process running
process.on('SIGINT', () => {
  console.log('Stopping scheduled task...');
  process.exit(0);
}); 