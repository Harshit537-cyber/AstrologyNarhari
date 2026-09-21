const axios = require("axios");
const exotelConfig = require("../config/exotel");

const triggerExotelCall = async (
  partnerMobile,
  userMobile,
  timeLimitSec,
  requestId
) => {
  try {
    const url = exotelConfig.getCallUrl();

    const cleanMobileNumber = (num) => {
      if (!num) return "";
      let clean = String(num).replace(/\D/g, "");
      if (clean.length === 12 && clean.startsWith("91")) {
        return clean.substring(2);
      }
      if (clean.length === 11 && clean.startsWith("0")) {
        return clean.substring(1);
      }
      if (clean.length === 10) {
        return clean;
      }
      return clean;
    };

    const from = cleanMobileNumber(partnerMobile);
    const to = cleanMobileNumber(userMobile);

    let callerId = String(exotelConfig.EXOPHONE || "")
      .split(",")[0]
      .replace(/[\s-]/g, "")
      .trim();

    const baseUrl = process.env.BACKEND_URL || "";
    let callbackUrl = "";

    if (baseUrl && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1")) {
      callbackUrl = `${baseUrl}/api/call/webhook?requestId=${requestId}&auth=${exotelConfig.INTERNAL_KEY}`;
    }

    const params = new URLSearchParams();
    params.append("From", from);
    params.append("To", to);
    params.append("CallerId", callerId);
    params.append("TimeLimit", Math.floor(timeLimitSec || 300));
    params.append("Record", "true");

    if (callbackUrl) {
      params.append("StatusCallback", callbackUrl);
    }

    const response = await axios.post(url, params, {
      headers: {
        Authorization: exotelConfig.getAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return {
      success: true,
      callSid: response.data?.Call?.Sid,
      status: response.data?.Call?.Status,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.RestException?.Message || error.message,
    };
  }
};

module.exports = {
  triggerExotelCall,
};