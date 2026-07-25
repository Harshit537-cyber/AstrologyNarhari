const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');


if (getApps().length === 0) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

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


const authService = getAuth();

module.exports = {
  auth: () => authService
};