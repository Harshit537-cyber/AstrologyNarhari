const axios = require('axios');
const config = require('../config/astrology');

const VISION_BASE_URL = 'https://vision.astrologyapi.com/palmistry/';

const getPalmId = async (imageBuffer, mimeType, hand) => {
    try {
        const base64Image = imageBuffer.toString('base64');
        const imageData = `data:${mimeType || 'image/jpeg'};base64,${base64Image}`;

        const response = await axios.post(
            `${VISION_BASE_URL}get-palm-id`,
            {
                image: imageData,
                hand: hand
            },
            {
                headers: {
                    'x-astrologyapi-key': config.accessToken,
                    'Content-Type': 'application/json'
                }
            }
        );
        return { ok: true, data: response.data };
    } catch (error) {
        console.error('get-palm-id error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        return { ok: false, status: error.response?.status || 500, data: error.response?.data || null, message: error.message };
    }
};

const getPalmReading = async (category, palmId) => {
    try {
        const response = await axios.post(
            `${VISION_BASE_URL}${category}`,
            { palm_id: palmId },
            {
                headers: {
                    'x-astrologyapi-key': config.accessToken,
                    'Content-Type': 'application/json'
                }
            }
        );
        return { ok: true, data: response.data };
    } catch (error) {
        console.error(`palmistry/${category} error:`, {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        return { ok: false, status: error.response?.status || 500, data: error.response?.data || null, message: error.message };
    }
};

module.exports = { getPalmId, getPalmReading };