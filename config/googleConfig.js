const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

if (process.env.GOOGLE_REFRESH_TOKEN) {
    console.log("📅 Google Calendar Instance Initialized Successfully!");
} else {
    console.error("❌ Google Refresh Token is missing!");
}

module.exports = oauth2Client;