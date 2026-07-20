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
            return res.status(400).json({ success: false, message: "month and year are required" });
        }

       
        const payload = {
            day: 1,
            month: Number(month),
            year: Number(year),
            hour: 12,
            min: 0,
            lat: Number(lat || 28.6139),
            lon: Number(lon || 77.2090),
            tzone: Number(timezone || 5.5) 
        };

        console.log('Sending Payload to Vedic Rishi:', payload);

        
        let festivalsList;
        try {
            festivalsList = await getAstrologyData('major_festivals', payload);
        } catch (e) {
            console.log("Retrying with backup endpoint...");
            festivalsList = await getAstrologyData('festival_calendar', payload);
        }

        if (!Array.isArray(festivalsList)) {
            return res.status(200).json({ success: true, festivals: [], summary: { total: 0 } });
        }

        const calendarDots = {};
        const formatted = festivalsList.map(f => {
            const dateKey = f.date ? f.date.split(' ')[0] : `${f.year}-${String(f.month).padStart(2, '0')}-${String(f.day).padStart(2, '0')}`;
            if (!calendarDots[dateKey]) calendarDots[dateKey] = [];
            calendarDots[dateKey].push(f.name);
            return { name: f.name, date: dateKey, desc: f.description || "" };
        });

        res.status(200).json({
            success: true,
            summary: { total: formatted.length, calendarDots },
            festivals: formatted
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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


exports.getDetailedHoroscope =  async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user || !user.zodiac || user.zodiac === "Auto-calculated") {
            return res.status(400).json({
                success: false,
                message: "Please set your zodiac sign in profile first"
            });
        }

        const period = req.query.period || "daily";
        const zodiacSign = user.zodiac.toLowerCase();

        const endpoint = `horoscope_prediction/${period}/${zodiacSign}`;
console.log("Endpoint:", endpoint);
        const response = await getAstrologyData(endpoint, {
            timezone: 5.5,
        });

        console.log("API RAW DATA:", JSON.stringify(response, null, 2));

        let forecast = "";

        if (typeof response.prediction === "object") {
            forecast = Object.values(response.prediction).join(" ");
        } else {
            forecast = response.prediction || "";
        }

        res.status(200).json({
            success: true,
            data: {
                zodiac: user.zodiac,
                date:
                    response.prediction_date ||
                    response.date ||
                    response.week_range ||
                    response.month_name ||
                    response.year ||
                    "",

                ratings: {
                    love: response.rating?.love
                        ? `${response.rating.love * 20}%`
                        : null,
                    career: response.rating?.career
                        ? `${response.rating.career * 20}%`
                        : null,
                    health: response.rating?.health
                        ? `${response.rating.health * 20}%`
                        : null,
                    finance: response.rating?.finance
                        ? `${response.rating.finance * 20}%`
                        : null,
                },

                forecast: {
                    title: `${period.toUpperCase()} FORECAST`,
                    content: forecast,
                },

                lucky: {
                    color: response.lucky_color || null,
                    number: response.lucky_number || null,
                    time:
                        response.lucky_time ||
                        response.lucky_hour ||
                        null,
                },
            },
        });
    } catch (error) {
        console.error("HOROSCOPE API ERROR:", error);

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};