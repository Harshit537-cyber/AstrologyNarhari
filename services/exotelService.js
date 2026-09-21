const axios = require("axios");
const exotelConfig = require("../config/exotel"); 

const triggerExotelCall = async (
  partnerMobile,
  userMobile,
  timeLimitSec,
  requestId,
) => {
  try {
    const url = exotelConfig.getCallUrl();

    // Indian mobile number ko exact 10 digits me clean karne ka standard function
    const cleanMobileNumber = (num) => {
      if (!num) return "";
      let clean = String(num).replace(/\D/g, ""); // saare non-numeric characters hatayein
      
      // Agar 12 digits hai aur 91 se start hai (+91)
      if (clean.length === 12 && clean.startsWith("91")) {
        return clean.substring(2);
      }
      // Agar 11 digits hai aur 0 se start hai (09876...)
      if (clean.length === 11 && clean.startsWith("0")) {
        return clean.substring(1);
      }
      // Agar already 10 digits hai
      if (clean.length === 10) {
        return clean;
      }
      return clean;
    };

    const from = cleanMobileNumber(partnerMobile); 
    const to = cleanMobileNumber(userMobile); 

    // ExoPhone me se sirf hyphen aur space hatayein, koi extra '0' mat lagaiye
    let callerId = String(exotelConfig.EXOPHONE || "")
      .split(",")[0]
      .replace(/[\s-]/g, "")
      .trim();

    const baseUrl = process.env.BACKEND_URL || "";
    let callbackUrl = "";
    // Sirf tabhi callback bhejein agar backend public URL ho (localhost na ho)
    if (baseUrl && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1")) {
      callbackUrl = `${baseUrl}/api/call/webhook?requestId=${requestId}&auth=${exotelConfig.INTERNAL_KEY}`;
    }

    console.log(">>>> EXOTEL FINAL PAYLOAD <<<<");
    console.log("FROM (Partner):", from);
    console.log("TO (User):", to);
    console.log("CALLER ID (ExoPhone):", callerId);
    console.log("TIME LIMIT (SEC):", Math.floor(timeLimitSec || 300));
    console.log("CALLBACK URL:", callbackUrl || "None (Localhost/No Public URL)");
    console.log(">>>> END PAYLOAD <<<<");

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

    console.log("✅ Exotel Call Initiated:", response.data);

    return {
      success: true,
      callSid: response.data?.Call?.Sid,
      status: response.data?.Call?.Status,
    };
  } catch (error) {
    console.error(
      "❌ Exotel Service Error:",
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

module.exports = {
  triggerExotelCall,
};