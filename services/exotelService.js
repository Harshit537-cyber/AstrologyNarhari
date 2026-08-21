const axios = require("axios");
const exotelConfig = require("../config/exotel"); // Adjust path as per your folder structure

const triggerExotelCall = async (
  partnerMobile,
  userMobile,
  timeLimitSec,
  requestId,
) => {
  try {
    const url = exotelConfig.getCallUrl();

    // Exotel ke liye Number Format Cleaning Logic (Adds leading '0')
    const cleanNumber = (num) => {
      if (!num) return "";
      let clean = String(num).replace(/\D/g, "");
      if (clean.length === 10) return "0" + clean;
      if (clean.length === 12 && clean.startsWith("91"))
        return "0" + clean.substring(2);
      return clean;
    };

    const from = cleanNumber(partnerMobile); // Pehle Astro Partner ka phone bajega
    const to = cleanNumber(userMobile); // Astro ke uthate hi User ka phone connect hoga

    // Raw Exophone format cleaning
    let rawExophone = String(exotelConfig.EXOPHONE || "")
      .split(",")[0]
      .split("-")
      .join("")
      .trim();
    const callerId = cleanNumber(rawExophone);

    const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const callbackUrl = `${baseUrl}/api/v1/calls/webhook?requestId=${requestId}&auth=${exotelConfig.INTERNAL_KEY}`;

    console.log(">>>> EXOTEL FINAL PAYLOAD <<<<");
    console.log("FROM (Partner):", from);
    console.log("TO (User):", to);
    console.log("CALLER ID:", callerId);
    console.log("TIME LIMIT (SEC):", Math.floor(timeLimitSec));
    console.log("CALLBACK URL:", callbackUrl);
    console.log(">>>> END PAYLOAD <<<<");

    const params = new URLSearchParams();
    params.append("From", from);
    params.append("To", to);
    params.append("CallerId", callerId);
    params.append("TimeLimit", Math.floor(timeLimitSec || 300)); // Default 5 mins if not provided
    params.append("Record", "true");

    if (callbackUrl.startsWith("http")) {
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
      callSid: response.data.Call.Sid,
      status: response.data.Call.Status,
    };
  } catch (error) {
    console.error(
      "Exotel Service Error:",
      error.response
        ? JSON.stringify(error.response.data, null, 2)
        : error.message,
    );
    return {
      success: false,
      error: error.response?.data?.RestException?.Message || error.message,
    };
  }
};

const terminateExotelCall = async (callSid) => {
  try {
    const url = `https://${exotelConfig.SUBDOMAIN || "api.exotel.com"}/v1/Accounts/${exotelConfig.SID}/Calls/${callSid}.json`;

    const params = new URLSearchParams();
    params.append("Status", "completed");

    const response = await axios.post(url, params, {
      headers: {
        Authorization: exotelConfig.getAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return { success: true, data: response.data };
  } catch (error) {
    const errorData = error.response ? error.response.data : error.message;
    console.error("Exotel Terminate Error:", errorData);
    return { success: false, error: errorData };
  }
};

module.exports = {
  triggerExotelCall,
  terminateExotelCall,
};
