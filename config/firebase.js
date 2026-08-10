// config/firebase.js
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');
const { getDatabase } = require('firebase-admin/database');

let app;

if (getApps().length === 0) {
  try {
    let serviceAccount;

    if (typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string') {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    }

    if (serviceAccount && serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    const dbUrl = process.env.FIREBASE_DATABASE_URL || (serviceAccount?.project_id ? `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com` : undefined);

    app = initializeApp({
      credential: cert(serviceAccount),
      databaseURL: dbUrl
    });

    console.log("✅ Firebase Admin successfully connected!");
  } catch (error) {
    console.error("❌ Firebase Init Error:", error.message);
  }
} else {
  app = getApps()[0];
}

const authService = app ? getAuth(app) : null;
const messagingService = app ? getMessaging(app) : null;
const databaseService = app ? getDatabase(app) : null;

module.exports = {
  auth: () => authService,
  messaging: () => messagingService,
  database: () => databaseService
};