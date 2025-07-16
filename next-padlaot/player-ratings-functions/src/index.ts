import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { Resend } from "resend";

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

// For Firebase Functions v2, use environment variables for secrets
// Set RESEND_API_KEY using: firebase functions:secrets:set RESEND_API_KEY

export const sendAssignmentEmail = onDocumentCreated(
  {
    document: "rankingTasks/{taskId}",
    secrets: ["RESEND_API_KEY"],
  },
  async (event) => {
    const assignment = event.data?.data();
    const taskId = event.params.taskId;
    if (!assignment || !assignment.userId) return;

    // Fetch user info
    const userSnap = await db.collection("users").doc(assignment.userId).get();
    const user = userSnap.data();
    const userEmail = user?.email;
    if (!userEmail) return;

    // Try to get player name associated with the user
    let playerName = null;
    if (user?.playerId) {
      const playerSnap = await db.collection("players").doc(user.playerId).get();
      const player = playerSnap.data();
      if (player?.name) {
        playerName = player.name;
      }
    }
    // Fallbacks
    const userName = playerName || user?.name || userEmail || "משתמש";

    // Generate direct link
    const link = `https://padlaot.football/rate-players?taskId=${taskId}`;

    // Email HTML (insert your logo URL)
    const html = `
      <div style="max-width:480px;margin:auto;font-family:Arial,sans-serif;direction:rtl;text-align:right;border:1px solid #eee;border-radius:8px;overflow:hidden;">
        <div style="background:#f7f7f7;padding:24px 0;text-align:center;">
          <img src="https://padlaot.football/logo.jpeg" alt="לוגו פדלאות" style="height:60px;" />
        </div>
        <div style="padding:24px;">
          <h2 style="margin-top:0;">שלום ${userName},</h2>
          <p>
            כמו שאתה יודע, הקהילה שלנו בנויה על שיתוף פעולה והנאה משותפת.<br/>
            כדי שניקח את הכיף צעד קדימה ונייצר משחקים צמודים ואיכותיים יותר, החלטנו להסתמך על הכוח של כולנו - חוכמת ההמונים.
          </p>
          <p>
            נבחרת כאחד השחקנים המובילים בקהילה לעזור לנו לדרג את רמת השחקנים.<br/>
            הידע האישי שלך הוא המפתח ליצירת קבוצות מאוזנות שיבטיחו מקסימום אקשן על המגרש.
          </p>
          <p>
            הדירוג פשוט: 1 הוא שחקן בתחילת הדרך, 9 הוא כוכב-על.
          </p>
          <p>
            נשמח אם תוכל להקדיש כמה דקות מזמנך כדי לעזור לכולנו. לחץ על הלינק ודרג את מי שאתה מכיר:
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${link}" style="background:#1976d2;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:18px;display:inline-block;">
              עבור לדירוג השחקנים
            </a>
          </div>
          <p style="color:#888;font-size:13px;">
            תודה ענקית על התרומה שלך לקהילה,<br/>
            ניפגש על המגרש!
          </p>
        </div>
      </div>
    `;

    // Get API key from environment variable (Firebase Functions v2)
    const apiKey = process.env.RESEND_API_KEY;
    console.log("DEBUG: Resend API Key:", apiKey);
    if (!apiKey) {
      console.error("Resend API key is missing!");
      return null;
    }
    const resend = new Resend(apiKey);

    // Send email via Resend
    await resend.emails.send({
      from: "Padlaot <rank@padlaot.football>", // Use your verified sender
      to: userEmail,
      subject: "הוזמנת לדרג שחקנים בפדלאות",
      html,
    });
    return null;
  }
);