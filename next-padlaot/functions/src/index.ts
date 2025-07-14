import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Trigger on create, update, or delete of a rating
export const aggregatePlayerRatings = functions.firestore
  .document('playerRatings/{playerId}/ratings/{raterUserId}')
  .onWrite(async (change, context) => {
    const { playerId } = context.params;
    const ratingsRef = db.collection('playerRatings').doc(playerId).collection('ratings');
    const playerDocRef = db.collection('playerRatings').doc(playerId);

    // Fetch all ratings for this player
    const snapshot = await ratingsRef.get();
    let total = 0;
    let count = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      if (typeof data.value === 'number') {
        total += data.value;
        count++;
      }
    });
    const average = count > 0 ? total / count : 0;

    // Update the player doc with new average and count
    await playerDocRef.set({
      average,
      numRatings: count
    }, { merge: true });

    return null;
  }); 