const User = require('../../models/User');
const { getMatchMakingReport ,getAstrologyData} = require('../../utils/astrologyService');

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


exports.generateKundli =  async (req, res) => {
    try {
        const { dateOfBirth, timeOfBirth, lat, lon, timezone, fullName, gender } = req.body;

        const dob = new Date(dateOfBirth);
        const [hour, min] = timeOfBirth.split(':');

        const payload = {
            day: dob.getDate(),
            month: dob.getMonth() + 1,
            year: dob.getFullYear(),
            hour: parseInt(hour),
            min: parseInt(min),
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            tzone: parseFloat(timezone || 5.5)
        };

        const [planets, astroDetails, panchang] = await Promise.all([
            getAstrologyData('planets', payload),
            getAstrologyData('astro_details', payload),
            getAstrologyData('basic_panchang', payload)
        ]);

        res.status(200).json({
            success: true,
            data: {
                profile: { fullName, gender },
                basic_panchang: panchang,
                astrological_details: astroDetails,
                planetary_positions: planets
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


exports.getFestivalCalendar =  async (req, res) => {
    try {
        const { month, year, lat, lon, timezone } = req.body;

        if (!month || !year) {
            return res.status(400).json({
                success: false,
                message: "month and year are required"
            });
        }

        const payload = {
            day: 1,
            month: parseInt(month),
            year: parseInt(year),
            hour: 12,   // required field by the API — defaulting to noon
            min: 0,     // required field by the API
            lat: parseFloat(lat || 28.6139),
            lon: parseFloat(lon || 77.2090),
            tzone: parseFloat(timezone || 5.5)
        };

        console.log('Festival payload being sent:', payload);

        let festivalsList;
        try {
            festivalsList = await getAstrologyData('major_festivals', payload);
        } catch (apiErr) {
            console.error('Festival API call failed with payload:', payload, 'Error:', apiErr.message);
            throw apiErr;
        }

        const monthFestivals = festivalsList.filter(f => {
            const date = new Date(f.date);
            return (date.getMonth() + 1) === parseInt(month) && date.getFullYear() === parseInt(year);
        });

        const calendarDots = {};
        monthFestivals.forEach(f => {
            const dateKey = f.date.split('T')[0];
            if (!calendarDots[dateKey]) calendarDots[dateKey] = [];
            calendarDots[dateKey].push(f.name);
        });

        const today = new Date();
        const upcomingHighlights = festivalsList
            .filter(f => new Date(f.date) >= today)
            .slice(0, 5);

        res.status(200).json({
            success: true,
            meta: { month, year },
            summary: {
                totalFestivals: monthFestivals.length,
                calendarDots: calendarDots
            },
            festivals: monthFestivals,
            upcomingHighlights: upcomingHighlights
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch festival calendar",
            error: error.message
        });
    }
};

exports.getDailyBasisDashboardHoroscope = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user || !user.zodiac || user.zodiac === "Auto-calculated") {
            return res.status(400).json({ 
                success: false, 
                message: "Please set your zodiac sign in profile first" 
            });
        }

        const zodiacSign = user.zodiac.toLowerCase();
        const predictionData = await getAstrologyData(`sun_sign_prediction/daily/${zodiacSign}`, {});

        res.status(200).json({
            success: true,
            data: {
                zodiac: user.zodiac,
                tagline: "The stars are aligning for you today",
                prediction: predictionData.prediction,
                alignment: `${predictionData.prediction_points || 88}% Alignment`,
                lucky_color: predictionData.lucky_color,
                lucky_number: predictionData.lucky_number,
                date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


exports.getDetailedHoroscope = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user || !user.zodiac || user.zodiac === "Auto-calculated") {
            return res.status(400).json({ success: false, message: "Please set your zodiac sign" });
        }

        const zodiacSign = user.zodiac.toLowerCase();
        const [basicPred, analysis, remedy] = await Promise.all([
            getAstrologyData(`sun_sign_prediction/daily/${zodiacSign}`, {}),
            getAstrologyData(`daily_prediction_analysis/${zodiacSign}`, {}),
            getAstrologyData(`daily_remedies/${zodiacSign}`, {})
        ]);

        res.status(200).json({
            success: true,
            data: {
                zodiac: user.zodiac,
                date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                
                ratings: {
                    love: analysis.rating.love * 20 + "%", 
                    career: analysis.rating.career * 20 + "%",
                    health: analysis.rating.health * 20 + "%",
                    finance: analysis.rating.finance * 20 + "%"
                },

                forecast: basicPred.prediction,
                lucky_color: basicPred.lucky_color,
                lucky_number: `Number ${basicPred.lucky_number}`,
                remedy: remedy.remedies?.[0] || "Maintain a positive mindset today", 
                is_premium_unlocked: false 
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};