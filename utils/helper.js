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

// Firebase push utilities
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
function initFirebase() {
  if (admin.apps.length) return admin;
  try {
    const saPath = path.join(__dirname, '..', 'config', 'firebase-service-account.json');
    if (fs.existsSync(saPath)) {
      const serviceAccount = require(saPath);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (projectId && clientEmail && privateKey) {
        privateKey = privateKey.replace(/\\n/g, '\n');
        admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
      }
    }
  } catch (e) {
    console.error('Firebase admin init error:', e.message);
  }
  return admin;
}

async function sendPushToTopic(topic, message) {
  const app = initFirebase();
  if (!app?.messaging) return null;
  const safeData = message.data ? Object.fromEntries(Object.entries(message.data).map(([k, v]) => [k, String(v)])) : undefined;
  return await app.messaging().send({ topic, notification: message.notification, data: safeData });
}

async function sendPushToUserTopic(userId, message) {
  return sendPushToTopic(`user_${userId}`, message);
}

async function sendPushToToken(token, message) {
  const app = initFirebase();
  if (!app?.messaging) return null;
  const safeData = message.data ? Object.fromEntries(Object.entries(message.data).map(([k, v]) => [k, String(v)])) : undefined;
  return await app.messaging().send({ token, notification: message.notification, data: safeData });
}

async function subscribeTokenToTopic(token, topic) {
  const app = initFirebase();
  if (!app?.messaging) return;
  await app.messaging().subscribeToTopic([token], topic);
}

async function unsubscribeTokenFromTopic(token, topic) {
  const app = initFirebase();
  if (!app?.messaging) return;
  await app.messaging().unsubscribeFromTopic([token], topic);
}

module.exports = { sendMail, sendPushToTopic, sendPushToUserTopic, sendPushToToken, subscribeTokenToTopic, unsubscribeTokenFromTopic };
