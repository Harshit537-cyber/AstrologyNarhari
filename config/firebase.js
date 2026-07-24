const { initializeApp, getApps, cert } = require('firebase-admin/app');
const admin = require('firebase-admin');

// getApps() humesha array [] deta hai, isliye ab 'length' ka error KABHI nahi aayega
if (getApps().length === 0) {
  try {
    // .env se JSON parse kar rahe hain
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    // Private key fix kar rahe hain
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    initializeApp({
      credential: cert(serviceAccount)
    });

    console.log("✅ Firebase Admin successfully connected!");
  } catch (error) {
    console.error("❌ Firebase Init Error:", error.message);
  }
}

module.exports = admin;