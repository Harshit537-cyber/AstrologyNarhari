require('dotenv').config();

module.exports = {
    userId: process.env.ASTROLOGY_API_USER_ID,
    apiKey: process.env.ASTROLOGY_API_PASSWORD,
    baseUrl: process.env.ASTROLOGY_API_BASE_URL 
};