const User = require('../../models/User');
const { getMatchMakingReport ,getAstrologyData} = require('../../utils/astrologyService');

exports.checkCompatibility = async (req, res) => {
    try {
        const { boyDetails, girlDetails } = req.body;
        
        const formatForAPI = (details) => {
            const dateObj = new Date(details.dob); 
            let [hour, min] = details.tob.split(':').map(Number); 

            if (details.ampm === "PM" && hour < 12) hour += 12;
            if (details.ampm === "AM" && hour === 12) hour = 0;

            return {
                day: dateObj.getDate(),
                month: dateObj.getMonth() + 1,
                year: dateObj.getFullYear(),
                hour: hour,
                min: min,
                lat: parseFloat(details.lat),
                lon: parseFloat(details.lon),
                tzone: 5.5
            };
        };

        const mData = formatForAPI(boyDetails);
        const fData = formatForAPI(girlDetails);

        const apiPayload = {
            m_day: mData.day, m_month: mData.month, m_year: mData.year,
            m_hour: mData.hour, m_min: mData.min, m_lat: mData.lat, m_lon: mData.lon, m_tzone: 5.5,
            f_day: fData.day, f_month: fData.month, f_year: fData.year,
            f_hour: fData.hour, f_min: fData.min, f_lat: fData.lat, f_lon: fData.lon, f_tzone: 5.5
        };

        const [report, maleManglik, femaleManglik] = await Promise.all([
            getMatchMakingReport('match_ashtakoot_points', apiPayload),
            getMatchMakingReport('manglik', mData),
            getMatchMakingReport('manglik', fData)
        ]);

        let manglikConclusion = "";
        if(maleManglik.is_present && femaleManglik.is_present) {
            manglikConclusion = "Both are Manglik. Match is good.";
        } else if (!maleManglik.is_present && !femaleManglik.is_present) {
            manglikConclusion = "Both are Non-Manglik. Excellent match.";
        } else {
            manglikConclusion = "Manglik Dosha Mismatch. Caution required.";
        }

        res.status(200).json({
            success: true,
            boyName: boyDetails.name,
            girlName: girlDetails.name,
            score: report.total.received_points, 
            total_points: 36,
            conclusion: report.total.conclusion,
            
            manglikStatus: {
                boy: maleManglik.is_present,
                girl: femaleManglik.is_present,
                message: manglikConclusion
            },

            details: {
                varna: report.varna,
                vashya: report.vashya,
                tara: report.tara,
                yoni: report.yoni,
                maitri: report.maitri,
                gana: report.gana,
                bhakoot: report.bhakoot,
                nadi: report.nadi
            },

            full_report: report 
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
        const basicPred = await getAstrologyData(`sun_sign_prediction/daily/${zodiacSign}`, {});
console.log('basicPred OK');
const analysis = await getAstrologyData(`daily_prediction_analysis/${zodiacSign}`, {});
console.log('analysis OK');
const remedy = await getAstrologyData(`daily_remedies/${zodiacSign}`, {});
console.log('remedy OK');

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