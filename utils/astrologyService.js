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
        throw new Error(error.response?.data?.msg || "Astrology API Error");
    }
};



module.exports = { getMatchMakingReport,getAstrologyData };