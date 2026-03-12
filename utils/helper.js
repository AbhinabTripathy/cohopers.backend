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

transporter.verify((err, success) => {
  if (err) {
    console.error("SMTP Error:", err.message);
  } else {
    console.log("Zoho SMTP Connected Successfully");
  }
});

async function sendMail(to, subject, html, options = {}) {
  try {
    const mailOptions = {
      from: `"CoHopers" <${process.env.ADMIN_EMAIL}>`,
      to,
      subject,
      html,
      ...options,
    };

    await transporter.sendMail(mailOptions);
    console.log("Mail sent successfully");
  } catch (error) {
    console.error("Mail send error:", error.message);
  }
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

      console.log("Firebase initialized using service account file");
    }

    // OPTION 2: GOOGLE_APPLICATION_CREDENTIALS
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });

      console.log("Firebase initialized using application default credentials");
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

        console.log("Firebase initialized using environment variables");
      } else {
        console.warn("Firebase credentials not found");
      }
    }
  } catch (error) {
    console.error("Firebase initialization error:", error.message);
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

    return await app.messaging().send(payload);
  } catch (error) {
    console.error("Push token error:", error.message);
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

    return await app.messaging().send(payload);
  } catch (error) {
    console.error("Push topic error:", error.message);
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
    return await app.messaging().subscribeToTopic([token], topic);
  } catch (error) {
    console.error("Subscribe topic error:", error.message);
  }
}

/**
 * Unsubscribe token from topic
 */
async function unsubscribeTokenFromTopic(token, topic) {
  try {
    const app = initFirebase();
    return await app.messaging().unsubscribeFromTopic([token], topic);
  } catch (error) {
    console.error("Unsubscribe topic error:", error.message);
  }
}

module.exports = {
  initFirebase,
  sendPushToToken,
  sendPushToTopic,
  sendPushToUserTopic,
  subscribeTokenToTopic,
  unsubscribeTokenFromTopic,
};