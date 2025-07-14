import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const aggregatePlayerRatings = onDocumentWritten(
  "playerRatings/{playerId}/ratings/{raterUserId}",
  async (event) => {
    const { playerId } = event.params;
    const ratingsRef = db.collection("playerRatings").doc(playerId).collection("ratings");
    const playerDocRef = db.collection("playerRatings").doc(playerId);

    // Fetch all ratings for this player
    const snapshot = await ratingsRef.get();
    let total = 0;
    let count = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (typeof data.rating === "number") {
        total += data.rating;
        count++;
      }
    });
    const average = count > 0 ? total / count : 0;

    // Update the player doc with new average and count
    await playerDocRef.set(
      {
        average,
        numRatings: count,
      },
      { merge: true }
    );

    return null;
  }
);