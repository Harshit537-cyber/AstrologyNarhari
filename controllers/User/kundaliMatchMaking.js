const User = require('../../models/User');
const { getMatchMakingReport } = require('../../utils/astrologyService');

exports.checkCompatibility = async (req, res) => {
    try {
        const { partnerDetails } = req.body;
        
        console.log("Logged in User ID from Token:", req.user ? req.user.id : "No User ID found");

const currentUser = await User.findById(req.user.id || req.user._id || req.userId);
        console.log("User Data from DB:", currentUser);

        if (!currentUser) {
            return res.status(404).json({ success: false, message: "User not found in database" });
        }

        if (!currentUser.dateOfBirth || !currentUser.timeOfBirth) {
            return res.status(400).json({ 
                success: false, 
                message: "Complete your profile (DOB and Time of Birth are required)",
                db_data: { 
                    dob: currentUser.dateOfBirth, 
                    tob: currentUser.timeOfBirth 
                } 
            });
        }

        const formatForAPI = (dob, tob, lat, lon) => {
            const dateObj = new Date(dob);
            const [hour, min] = tob.split(':');
            return {
                day: dateObj.getDate(),
                month: dateObj.getMonth() + 1,
                year: dateObj.getFullYear(),
                hour: parseInt(hour),
                min: parseInt(min),
                lat: parseFloat(lat || 28.61),
                lon: parseFloat(lon || 77.20),
                tzone: 5.5
            };
        };

        let maleData, femaleData;
        const userLat = currentUser.lat || 28.61; 
        const userLon = currentUser.lon || 77.20;

        if (currentUser.gender === 'Male') {
            maleData = formatForAPI(currentUser.dateOfBirth, currentUser.timeOfBirth, userLat, userLon);
            femaleData = formatForAPI(partnerDetails.dateOfBirth, partnerDetails.timeOfBirth, partnerDetails.lat, partnerDetails.lon);
        } else {
            femaleData = formatForAPI(currentUser.dateOfBirth, currentUser.timeOfBirth, userLat, userLon);
            maleData = formatForAPI(partnerDetails.dateOfBirth, partnerDetails.timeOfBirth, partnerDetails.lat, partnerDetails.lon);
        }

        const apiPayload = {
            m_day: maleData.day, m_month: maleData.month, m_year: maleData.year,
            m_hour: maleData.hour, m_min: maleData.min, m_lat: maleData.lat, m_lon: maleData.lon, m_tzone: 5.5,
            f_day: femaleData.day, f_month: femaleData.month, f_year: femaleData.year,
            f_hour: femaleData.hour, f_min: femaleData.min, f_lat: femaleData.lat, f_lon: femaleData.lon, f_tzone: 5.5
        };

        const report = await getMatchMakingReport(apiPayload);

        res.status(200).json({
            success: true,
            score: report.total.received_points,
            conclusion: report.total.conclusion,
            fullReport: report
        });

    } catch (error) {
        console.error("Error Detail:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};