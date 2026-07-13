const getDailyHoroscope = (zodiac) => {
    const predictions = [
        "The Sun in your sign grants you unparalleled creative vitality today. Trust your intuition in matters of the heart.",
        "A cosmic alignment suggests a meaningful encounter is on the horizon. Radiate confidence, but remain grounded.",
        "Expect a boost in your professional life today. Your hard work is finally catching the eyes of those who matter.",
        "Financial stability is coming your way. It's a good day to plan your future investments.",
        "The stars suggest you take a moment for self-care. Recharging your energy will lead to a breakthrough tomorrow.",
        "A surprise communication might brighten your day. Keep an open mind and a warm heart."
    ];

    const colors = ["Celestial Gold", "Mystic Purple", "Deep Azure", "Ruby Red", "Emerald Green", "Silver Moonlight"];
    
    const today = new Date().toISOString().slice(0, 10); 
    const seed = today + zodiac; 
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }

    const pIndex = Math.abs(hash) % predictions.length;
    const cIndex = Math.abs(hash) % colors.length;
    const luckyNumber = (Math.abs(hash) % 90) + 10; 
    const alignment = (Math.abs(hash) % 30) + 70; 

    return {
        prediction: predictions[pIndex],
        luckyColor: colors[cIndex],
        luckyNumber: luckyNumber,
        alignment: `${alignment}% Alignment`
    };
};

module.exports = getDailyHoroscope;