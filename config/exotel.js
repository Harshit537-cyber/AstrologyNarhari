require('dotenv').config();

const exotelConfig = {
    SID: process.env.EXOTEL_SID,
    API_KEY: process.env.EXOTEL_API_KEY,
    API_TOKEN: process.env.EXOTEL_API_TOKEN,
    EXOPHONE: process.env.EXOPHONE,
    SUBDOMAIN: process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com',
    INTERNAL_KEY: process.env.MY_INTERNAL_API_KEY,
    
    getCallUrl: function() {
        return `https://${this.SUBDOMAIN}/v1/Accounts/${this.SID}/Calls/connect.json`;
    },

    getAuthHeader: function() {
        const auth = Buffer.from(`${this.API_KEY}:${this.API_TOKEN}`).toString('base64');
        return `Basic ${auth}`;
    }
};

module.exports = exotelConfig;