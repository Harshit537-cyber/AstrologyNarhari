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


module.exports = { getMatchMakingReport,getAstrologyData,getPdfReport,getFestivalData ,getTithiEvent,
    daysInMonth,
    pad,
    buildDate,
  getHoroscopeData,
    validZodiacSigns };