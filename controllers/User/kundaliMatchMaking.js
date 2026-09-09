const User = require('../../models/User');
const Kundli = require('../../models/kundali/Kundali');
const { getMatchMakingReport, getAstrologyData, getPdfReport,getFestivalData,getTithiEvent,
    daysInMonth,
    buildDate ,getHoroscopeData, validZodiacSigns,getDetailedHoroscopeData } = require('../../utils/astrologyService');

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
        if (maleManglik.is_present && femaleManglik.is_present) {
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
                gana: report.gan,
                bhakoot: report.bhakut,
                nadi: report.nadi
            },

            full_report: report
        });
    } catch (error) {
        console.error("Error Detail:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.generateKundli =async (req, res) => {
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

        const pdfPayload = {
            ...payload,
            name: fullName,
            gender: gender,
            language: "hi",
            chart_style: "NORTH_INDIAN",
            footer_link: "https://yourwebsite.com",
            logo_url: "https://yourwebsite.com/logo.png",
            company_name: "Astro App",
            company_info: "Online Astrology Consultation"
        };

        const [
            planets,       
            astro,         
            panchang,       
            vDasha,         
            manglik,       
            pdfData         
        ] = await Promise.all([
            getAstrologyData('planets', payload).catch(e => null),
            getAstrologyData('astro_details', payload).catch(e => null),
            getAstrologyData('basic_panchang', payload).catch(e => null),
            getAstrologyData('major_vdasha', payload).catch(e => null),
            getAstrologyData('manglik', payload).catch(e => null),
            getPdfReport('basic_horoscope_pdf', pdfPayload)
        ]);

        res.status(200).json({
            success: true,
            message: "Complete Kundli Data Generated",
            pdf_link: pdfData ? pdfData.pdf_url : "PDF limit reached or endpoint not allowed",
            data: {
                user_profile: { fullName, gender },
                panchang: panchang,
                astrological_details: astro,
                planetary_positions: planets,
                dasha: vDasha,
                doshas: {
                    manglik: manglik,
                }
            }
        });

    } catch (error) {
        console.error("Main Controller Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getFestivalCalendar = async (req, res) => {
    try {
        const { month, year, hour, min, lat, lon, tzone } = req.body;

        const required = { month, year, hour, min, lat, lon, tzone };
        const missing = Object.entries(required)
            .filter(([, v]) => v === undefined || v === null || v === '')
            .map(([k]) => k);
        if (missing.length > 0) {
            return res.status(400).json({ success: false, message: `Missing required field(s): ${missing.join(', ')}` });
        }

        const basePayload = {
            month: parseInt(month), year: parseInt(year),
            hour: parseInt(hour), min: parseInt(min),
            lat: parseFloat(lat), lon: parseFloat(lon), tzone: parseFloat(tzone)
        };
        if (Object.values(basePayload).some(v => Number.isNaN(v))) {
            return res.status(400).json({ success: false, message: "One or more fields are not valid numbers" });
        }

        const totalDays = daysInMonth(basePayload.month, basePayload.year);

        const monthlyPanchangRes = await getFestivalData('monthly_panchang', { ...basePayload, day: 1 });
        if (!monthlyPanchangRes.ok) {
            return res.status(502).json({
                success: false,
                message: "Upstream monthly_panchang request failed",
                error: { status: monthlyPanchangRes.status, data: monthlyPanchangRes.data }
            });
        }
        const calendarGrid = Array.isArray(monthlyPanchangRes.data?.panchang) ? monthlyPanchangRes.data.panchang : [];

        const festivalCalls = [];
        for (let d = 1; d <= totalDays; d++) {
            festivalCalls.push(
                getFestivalData('panchang_festival', { ...basePayload, day: d })
                    .then(result => ({ day: d, result }))
            );
        }
        const festivalResults = await Promise.all(festivalCalls);

        const failed = festivalResults.filter(f => !f.result.ok);
        if (failed.length > 0) {
            console.error(`${failed.length}/${totalDays} panchang_festival calls failed`, failed.map(f => f.day));
        }

        const religious = [];
        const auspicious = [];
        const highlights = [];
        const today = new Date();

        calendarGrid.forEach(entry => {
            const eventName = getTithiEvent(entry.tithi);
            if (eventName) {
                auspicious.push({
                    date: buildDate(basePayload.year, basePayload.month, entry.day),
                    day: entry.day,
                    tithi: entry.tithi,
                    event: eventName
                });
            }
        });

        festivalResults.forEach(({ day, result }) => {
            if (!result.ok) return;
            const festivalsField = result.data?.festivals;
            if (!Array.isArray(festivalsField) || festivalsField.length === 0) return;

            const names = festivalsField
                .flatMap(str => String(str).split(','))
                .map(n => n.trim())
                .filter(Boolean);

            const dateStr = buildDate(basePayload.year, basePayload.month, day);
            names.forEach(name => {
                const festObj = { name, date: dateStr, day };
                religious.push(festObj);
                if (new Date(dateStr) >= today) highlights.push(festObj);
            });
        });

        highlights.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.status(200).json({
            success: true,
            calendarGrid,
            tabs: { all_events: religious, religious, auspicious },
            upcoming_highlights: highlights.slice(0, 5),
            meta: failed.length > 0 ? { warning: `${failed.length} day(s) failed to load festival data` } : undefined
        });

    } catch (error) {
        console.error("Dashboard Error:", error.message);
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


exports.getWeeklyHoroscope = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('zodiac');
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (!user.zodiac) {
            return res.status(400).json({ success: false, message: "Zodiac sign not set on user profile" });
        }

        const zodiacName = user.zodiac.toLowerCase(); // "Virgo" -> "virgo"
        if (!validZodiacSigns.includes(zodiacName)) {
            return res.status(400).json({ success: false, message: "Invalid zodiac sign stored on user profile" });
        }

        const { timezone } = req.body;
        if (timezone === undefined || timezone === null || timezone === '') {
            return res.status(400).json({ success: false, message: "timezone is required for weekly horoscope" });
        }
        const tz = parseFloat(timezone);
        if (Number.isNaN(tz)) {
            return res.status(400).json({ success: false, message: "timezone must be a valid number" });
        }

        const result = await getHoroscopeData(`horoscope_prediction/weekly/${zodiacName}`, { timezone: tz });
        if (!result.ok) {
            return res.status(502).json({ success: false, message: "Upstream weekly horoscope request failed", error: { status: result.status, data: result.data } });
        }
 
        
        res.status(200).json({ success: true, zodiacName, horoscope: result.data });

    } catch (error) {
        console.error("Weekly Horoscope Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getYearlyHoroscope = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('zodiac');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        
        if (!user.zodiac) {
            return res.status(400).json({
                success: false,
                message: "Zodiac sign not set on user profile"
            });
        }

        const zodiacName = user.zodiac.toLowerCase();

        if (!validZodiacSigns.includes(zodiacName)) {
            return res.status(400).json({
                success: false,
                message: "Invalid zodiac sign stored on user profile"
            });
        }

        const { timezone } = req.body;

        if (timezone === undefined || timezone === null || timezone === '') {
            return res.status(400).json({
                success: false,
                message: "timezone is required for yearly horoscope"
            });
        }

        const tz = parseFloat(timezone);

        if (Number.isNaN(tz)) {
            return res.status(400).json({
                success: false,
                message: "timezone must be a valid number"
            });
        }

        const result = await getHoroscopeData(
            `horoscope_prediction/yearly/${zodiacName}`,
            { timezone: tz }
        );

        if (!result.ok) {
            return res.status(502).json({
                success: false,
                message: "Upstream yearly horoscope request failed",
                error: {
                    status: result.status,
                    data: result.data
                }
            });
        }

        res.status(200).json({
            success: true,
            zodiacName,
            horoscope: result.data
        });

    } catch (error) {
        console.error("Yearly Horoscope Error:", error.message);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getMonthlyHoroscope = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('zodiac');
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (!user.zodiac) {
            return res.status(400).json({ success: false, message: "Zodiac sign not set on user profile" });
        }

        const zodiacName = user.zodiac.toLowerCase();
        if (!validZodiacSigns.includes(zodiacName)) {
            return res.status(400).json({ success: false, message: "Invalid zodiac sign stored on user profile" });
        }

        let tz = 5.5;
        const { timezone } = req.body;
        if (timezone !== undefined && timezone !== null && timezone !== '') {
            tz = parseFloat(timezone);
            if (Number.isNaN(tz)) {
                return res.status(400).json({ success: false, message: "timezone must be a valid number" });
            }
        }

        const result = await getHoroscopeData(`horoscope_prediction/monthly/${zodiacName}`, { timezone: tz });
        if (!result.ok) {
            return res.status(502).json({ success: false, message: "Upstream monthly horoscope request failed", error: { status: result.status, data: result.data } });
        }

        res.status(200).json({ success: true, zodiacName, horoscope: result.data });

    } catch (error) {
        console.error("Monthly Horoscope Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getUserKundli = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select(
            "fullName gender profileImage dateOfBirth timeOfBirth birthPlace zodiac kundli"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (!user.kundli) {
            return res.status(404).json({
                success: false,
                message: "Kundli not generated yet."
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                profile: {
                    id: user._id,
                    fullName: user.fullName,
                    gender: user.gender,
                    profileImage: user.profileImage,
                    dateOfBirth: user.dateOfBirth,
                    timeOfBirth: user.timeOfBirth,
                    birthPlace: user.birthPlace,
                    zodiac: user.zodiac
                },
                kundli: user.kundli
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



exports.getDetailedHoroscope = async (req, res) => {
    try {
        const { type } = req.params;
        const { timezone } = req.query;

        if (!req.user) {
            console.error("[Controller Error] No user object found in request. Check your verifyToken middleware.");
            return res.status(401).json({ success: false, message: "Unauthorized: User not found." });
        }

        const userId = req.user._id || req.user.id;
        const userData = await User.findById(userId);

        console.log(`[Horoscope Controller] Processing request for User: ${userId}, Zodiac Found: ${userData?.zodiac}`);

        const userZodiac = userData?.zodiac;

        if (!userZodiac || userZodiac === "Auto-calculated") {
            return res.status(400).json({
                success: false,
                message: "Zodiac sign is missing from your profile. Please update your profile first."
            });
        }

        const allowedTypes = ['daily', 'weekly', 'monthly'];
        if (!type || !allowedTypes.includes(type.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: "Invalid prediction type. Use daily, weekly, or monthly."
            });
        }

        const data = await getDetailedHoroscopeData(type, userZodiac, timezone);

        return res.status(200).json({
            success: true,
            predictionType: type,
            zodiacUsed: userZodiac,
            data: data
        });

    } catch (error) {
        console.error(`[Controller Error] API Error: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.generateMyOwnKundli =  async (req, res) => {
    try {
        const userId = req.user.id || req.user._id  ; 

        const { lat, lon, timezone } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const { firebaseUid, dateOfBirth, timeOfBirth, fullName, gender } = user;
        
        const dobDate = new Date(dateOfBirth);
        const [hour, min] = timeOfBirth.split(':');

        const payload = {
            day: dobDate.getDate(),
            month: dobDate.getMonth() + 1,
            year: dobDate.getFullYear(),
            hour: parseInt(hour),
            min: parseInt(min),
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            tzone: parseFloat(timezone || 5.5)
        };

        const pdfPayload = {
            ...payload,
            name: fullName,
            gender: gender,
            language: "hi",
            chart_style: "NORTH_INDIAN",
            footer_link: "https://yourwebsite.com",
            logo_url: "https://yourwebsite.com/logo.png",
            company_name: "Astro App",
            company_info: "Online Astrology Consultation"
        };

        const [
            planets,       
            astro,         
            panchang,       
            vDasha,         
            manglik,       
            pdfData         
        ] = await Promise.all([
            getAstrologyData('planets', payload).catch(e => null),
            getAstrologyData('astro_details', payload).catch(e => null),
            getAstrologyData('basic_panchang', payload).catch(e => null),
            getAstrologyData('major_vdasha', payload).catch(e => null),
            getAstrologyData('manglik', payload).catch(e => null),
            getPdfReport('basic_horoscope_pdf', pdfPayload).catch(e => null)
        ]);

        const pdfUrl = pdfData ? pdfData.pdf_url : "PDF limit reached or endpoint not allowed";

        const responseData = {
            user_profile: { fullName, gender },
            panchang: panchang,
            astrological_details: astro,
            planetary_positions: planets,
            dasha: vDasha,
            doshas: {
                manglik: manglik,
            }
        };

        const updatedKundli = await Kundli.findOneAndUpdate(
            { firebaseUid: firebaseUid }, 
            {
                userId: user._id,
                firebaseUid: firebaseUid,
                fullName: fullName,
                gender: gender,
                dob: dobDate,
                tob: timeOfBirth,
                lat: parseFloat(lat),
                lon: parseFloat(lon),
                timezone: parseFloat(timezone || 5.5),
                pdf_link: pdfUrl,
                data: responseData 
            },
            { upsert: true, new: true } 
        );

        res.status(200).json({
            success: true,
            message: "Complete Kundli Data Generated and Saved",
            userId: updatedKundli.userId,
            pdf_link: pdfUrl,
            data: updatedKundli.data 
        });

    } catch (error) {
        console.error("Main Controller Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getKundliByUid = async (req, res) => {
    try {
        const { firebaseUid } = req.params;

        const kundli = await Kundli.findOne({ firebaseUid: firebaseUid });

        if (!kundli) {
            return res.status(404).json({
                success: false,
                message: "No Kundli found for this user."
            });
        }

        res.status(200).json({
            success: true,
            message: "Kundli Data Fetched Successfully",
            userId: kundli.userId,       
            firebaseUid: kundli.firebaseUid,
            fullName: kundli.fullName,
            gender: kundli.gender,
            dob: kundli.dob,
            tob: kundli.tob,
            lat: kundli.lat,
            lon: kundli.lon,
            pdf_link: kundli.pdf_link,
            data: kundli.data 
        });

    } catch (error) {
        console.error("Get Kundli Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};