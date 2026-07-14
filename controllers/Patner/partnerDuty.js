const Partner = require("../../models/Partner/Partner");

const dutyOn = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(
      req.user.id,
      { isOnline: true },
      { new: true },
    ).select("-otp -otpExpiry");

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Duty turned on successfully",
      partner,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const dutyOff = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(
      req.user.id,
      { isOnline: false },
      { new: true },
    ).select("-otp -otpExpiry");

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Duty turned off successfully",
      partner,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getDutyStatus = async (req, res) => {
  try {
    const partner = await Partner.findById(req.user.id).select("isOnline");

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }
    res.status(200).json({
      success: true,
      isOnline: partner.isOnline,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports = {
    dutyOn,
    dutyOff,
    getDutyStatus
};