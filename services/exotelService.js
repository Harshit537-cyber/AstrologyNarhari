const axios = require('axios');
const exotelConfig = require('../config/exotel');

const triggerExotelCall = async (partnerMobile, userMobile, timeLimitSec, bookingId) => {
    try {
        const url = exotelConfig.getCallUrl();

        const cleanNumber = (num) => {
            if (!num) return "";
            let clean = num.replace(/\D/g, ''); 
            if (clean.length === 10) return "0" + clean;
            if (clean.length === 12 && clean.startsWith('91')) return "0" + clean.substring(2);
            return clean;
        };

        const from = cleanNumber(partnerMobile);
        const to = cleanNumber(userMobile);
      let rawExophone = String(exotelConfig.EXOPHONE).split(',')[0].split('-').join('').trim();
        const callerId = cleanNumber(rawExophone);

        const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000'; 
        const callbackUrl = `${baseUrl}/api/v1/calls/webhook?bookingId=${bookingId}&auth=${exotelConfig.INTERNAL_KEY}`;

        console.log(">>>> EXOTEL FINAL PAYLOAD <<<<");
        console.log("FROM:", from);
        console.log("TO:", to);
        console.log("CALLERID:", callerId);
        console.log("CALLBACK:", callbackUrl);
        console.log(">>>> END PAYLOAD <<<<");

        const params = new URLSearchParams();
        params.append('From', from);
        params.append('To', to);
        params.append('CallerId', callerId);
        params.append('TimeLimit', Math.floor(timeLimitSec));
        params.append('Record', 'true');
        
  
        if (callbackUrl.startsWith('http')) {
            params.append('StatusCallback', callbackUrl);
        }

        const response = await axios.post(url, params, {
            headers: {
                'Authorization': exotelConfig.getAuthHeader(),
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        return { success: true, callSid: response.data.Call.Sid };
    } catch (error) {
        console.error("Exotel Service Error:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        return { success: false, error: error.response?.data || error.message };
    }
};


const terminateExotelCall =  async (callSid) => {
    try {
        const url = `https://api.exotel.com/v1/Accounts/${exotelConfig.SID}/Calls/${callSid}.json`;

        const params = new URLSearchParams();
        params.append('Status', 'completed');

        const response = await axios.post(url, params, {
            headers: {
                'Authorization': exotelConfig.getAuthHeader(),
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        return { success: true };
    } catch (error) {
        const errorData = error.response ? error.response.data : error.message;
        console.error("DEBUG ERROR:", errorData);
        return { success: false, error: errorData };
    }
};
module.exports = { triggerExotelCall,terminateExotelCall };