const axios = require('axios');
const config = require('../config/astrology');

const getMatchMakingReport =async (endpoint, data) => {
    const authString = `${config.userId}:${config.apiKey}`;
    const encodedAuth = Buffer.from(authString).toString('base64');

    try {
        const response = await axios.post(
            `${config.baseUrl}${endpoint}`, 
            data, 
            {
                headers: {
                    'Authorization': `Basic ${encodedAuth}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data; 
    } catch (error) {
        if (error.response) {
            console.error("API Response Error:", error.response.data);
            throw new Error(`Astrology API Error: ${error.response.data.msg || 'Invalid Request'}`);
        } else {
            throw new Error("Astrology API is not responding");
        }
    }
};

const getAstrologyData = async (endpoint, data) => {
    const auth = Buffer.from(`${config.userId}:${config.apiKey}`).toString('base64');
    try {
        const response = await axios.post(`${config.baseUrl}${endpoint}`, data, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            console.log("--- API ERROR DETAILS ---");
            console.log("Status:", error.response.status);
            console.log("Message from API:", error.response.data); 
        }
        throw new Error(error.response?.data?.msg || "Astrology API Error");
    }
};

const getPdfReport = async (endpoint, data) => {
    try {
        const PDF_BASE_URL = "https://pdf.astrologyapi.com/v1/";
        
        const response = await axios.post(`${PDF_BASE_URL}${endpoint}`, data, {
            headers: {
                'Authorization': `Basic ${config.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.log(`PDF API Error (${endpoint}):`, error.response?.data || error.message);
        return null; 
    }
};

const getFestivalData = async (endpoint, payload) => {
    try {
        const auth = Buffer.from(`${config.userId}:${config.apiKey}`).toString('base64');
        const response = await axios.post(`${config.baseUrl}${endpoint}`, payload, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept-Language': 'en'
            }
        });
        return { ok: true, data: response.data };
    } catch (error) {
        console.error(`Error in ${endpoint}:`, {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        return { ok: false, status: error.response?.status || 500, data: error.response?.data || null, message: error.message };
    }
};

const getTithiEvent = (tithiNum) => {
    if (tithiNum === 15) return 'Purnima';
    if (tithiNum === 30) return 'Amavasya';
    if (tithiNum === 11 || tithiNum === 26) return 'Ekadashi';
    return null;
};

const daysInMonth = (month, year) => new Date(year, month, 0).getDate();
const pad = (n) => String(n).padStart(2, '0');
const buildDate = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;


const getHoroscopeData = async (endpoint, payload) => {
    try {
        const auth = Buffer.from(`${config.userId}:${config.apiKey}`).toString('base64');
        const response = await axios.post(`${config.baseUrl}${endpoint}`, payload, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept-Language': 'en'
            }
        });
        return { ok: true, data: response.data };
    } catch (error) {
        console.error(`Error in ${endpoint}:`, {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        return { ok: false, status: error.response?.status || 500, data: error.response?.data || null, message: error.message };
    }
};

const validZodiacSigns = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra',
    'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
];

const buildAuthHeader = () => {
    const { userId, apiKey } = config;

    if (!userId || !apiKey) {
        throw new Error('Missing ASTROLOGY_API_USER_ID or ASTROLOGY_API_PASSWORD in environment.');
    }

    const raw = `${userId}:${apiKey}`;
    return `Basic ${Buffer.from(raw).toString('base64')}`;
};
// getDetailedData
 const getDetailedHoroscopeData = async (type, zodiac, timezone) => {
    let endpoint = '';
    const tz = timezone !== undefined && timezone !== null && timezone !== '' ? timezone : 5.5;
    const zodiacName = zodiac.toLowerCase();

    switch (type.toLowerCase()) {
        case 'daily':
            endpoint = `/sun_sign_prediction/daily/next/${zodiacName}`;
            break;
        case 'weekly':
            endpoint = `/horoscope_prediction/weekly/${zodiacName}`;
            break;
        case 'monthly':
            endpoint = `/horoscope_prediction/monthly/${zodiacName}`;
            break;
        default:
            throw new Error('Invalid horoscope type. Choose daily, weekly, or monthly.');
    }

    const finalUrl = `${config.baseUrl}${endpoint}`;

    console.log(`[Horoscope Service] Calling ${finalUrl} | timezone: ${tz}`);

    try {
        const response = await axios.post(
            finalUrl,
            { timezone: tz },
            {
                headers: {
                    'x-astrologyapi-key': config.accessToken,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`[Service Success] Fetched data for zodiac: ${zodiacName}`);
        return response.data;

    } catch (error) {
        console.error(`[Service Error] Astrology API Failed!`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Response Data:`, JSON.stringify(error.response.data));
        } else {
            console.error(`Error Message: ${error.message}`);
        }
        throw new Error(error.response?.data?.message || 'Failed to fetch horoscope data');
    }
};
module.exports = { getMatchMakingReport,getAstrologyData,getPdfReport,getFestivalData ,getTithiEvent,
    daysInMonth,
    pad,
    buildDate,
  getHoroscopeData,
    validZodiacSigns,
getDetailedHoroscopeData };