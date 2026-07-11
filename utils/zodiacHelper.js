const getZodiacSign = (dateString) => {
    const d = new Date(dateString);
    const month = d.getMonth(); 
    const day = d.getDate();

    const days = [21, 20, 21, 21, 22, 22, 23, 24, 24, 24, 23, 22];
    const signs = ["Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius"];

    if (month === 0 && day <= 20) return signs[0];
    return day < days[month] ? signs[month] : signs[(month + 1) % 12];
};

module.exports = getZodiacSign;