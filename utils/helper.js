const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// SMTP Email disabled - using push notifications only
console.log("  Email notifications disabled - Push notifications active only");
console.log("  All notifications will be sent via Firebase Cloud Messaging (FCM)");

async function sendMail(to, subject, html, options = {}) {
  // Email notifications disabled - only push notifications active
  console.log(`  [Email Disabled] Would have sent email to: ${to} | Subject: ${subject}`);
  return { skipped: true, reason: "Email notifications disabled" };
}
///////// Push notification ////// 
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

/**
 * Initialize Firebase Admin SDK
 */
function initFirebase() {
  if (admin.apps.length > 0) {
    console.log("✓ Firebase already initialized");
    return admin;
  }

  try {
    const saPath = path.join(__dirname, "..", "config", "firebase-service-account.json");

    // OPTION 1: Service account JSON file
    if (fs.existsSync(saPath)) {
      const serviceAccount = require(saPath);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log("✓ Firebase initialized using service account file");
      console.log(`✓ Firebase Project ID: ${serviceAccount.project_id}`);
    }

    // OPTION 2: GOOGLE_APPLICATION_CREDENTIALS
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });

      console.log("✓ Firebase initialized using GOOGLE_APPLICATION_CREDENTIALS env variable");
    }

    // OPTION 3: Environment variables
    else {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (projectId && clientEmail && privateKey) {
        privateKey = privateKey.replace(/\\n/g, "\n");

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });

        console.log("✓ Firebase initialized using environment variables");
        console.log(`✓ Firebase Project ID: ${projectId}`);
        console.log(`✓ Firebase Client Email: ${clientEmail}`);
      } else {
        const missing = [];
        if (!projectId) missing.push("FIREBASE_PROJECT_ID");
        if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
        if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");
        
        console.error("✗ Firebase credentials not found. Missing environment variables:", missing.join(", "));
        console.error("✗ Please configure one of:");
        console.error("  1. config/firebase-service-account.json file");
        console.error("  2. GOOGLE_APPLICATION_CREDENTIALS environment variable");
        console.error("  3. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY environment variables");
        throw new Error("Firebase credentials not configured");
      }
    }
  } catch (error) {
    console.error("✗ Firebase initialization error:", error.message);
    throw error; // Throw to make failure visible at startup
  }

  return admin;
}

/**
 * Send notification to a specific device token
 */
async function sendPushToToken(token, message) {
  try {
    const app = initFirebase();

    const safeData = message.data
      ? Object.fromEntries(
          Object.entries(message.data).map(([k, v]) => [k, String(v)])
        )
      : undefined;

    const payload = {
      token: token,
      notification: message.notification,
      data: safeData,
    };

    const response = await app.messaging().send(payload);
    console.log(`✓ Push notification sent to token: ${token}`, { response });
    return response;
  } catch (error) {
    console.error(`✗ Push token error for ${token}:`, { 
      message: error.message, 
      code: error.code,
      tokenLength: token?.length,
      timestamp: new Date().toISOString()
    });
    throw error; // Re-throw to allow callers to handle
  }
}

/**
 * Send notification to a topic
 */
async function sendPushToTopic(topic, message) {
  try {
    const app = initFirebase();

    const safeData = message.data
      ? Object.fromEntries(
          Object.entries(message.data).map(([k, v]) => [k, String(v)])
        )
      : undefined;

    const payload = {
      topic: topic,
      notification: message.notification,
      data: safeData,
    };

    const response = await app.messaging().send(payload);
    console.log(`✓ Push notification sent to topic: ${topic}`, { response });
    return response;
  } catch (error) {
    console.error(`✗ Push topic error for topic '${topic}':`, { 
      message: error.message, 
      code: error.code,
      timestamp: new Date().toISOString()
    });
    throw error; // Re-throw to allow callers to handle
  }
}

/**
 * Send notification to a specific user's topic
 */
async function sendPushToUserTopic(userId, message) {
  return sendPushToTopic(`user_${userId}`, message);
}

/**
 * Subscribe token to topic
 */
async function subscribeTokenToTopic(token, topic) {
  try {
    const app = initFirebase();
    const response = await app.messaging().subscribeToTopic([token], topic);
    console.log(`✓ Token subscribed to topic '${topic}'`, { response });
    return response;
  } catch (error) {
    console.error(`✗ Subscribe topic error for topic '${topic}':`, { 
      message: error.message, 
      code: error.code,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Unsubscribe token from topic
 */
async function unsubscribeTokenFromTopic(token, topic) {
  try {
    const app = initFirebase();
    const response = await app.messaging().unsubscribeFromTopic([token], topic);
    console.log(`✓ Token unsubscribed from topic '${topic}'`, { response });
    return response;
  } catch (error) {
    console.error(`✗ Unsubscribe topic error for topic '${topic}':`, { 
      message: error.message, 
      code: error.code,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

module.exports = {
  initFirebase,
  sendPushToToken,
  sendPushToTopic,
  sendPushToUserTopic,
  subscribeTokenToTopic,
  unsubscribeTokenFromTopic,
  sendMail
};