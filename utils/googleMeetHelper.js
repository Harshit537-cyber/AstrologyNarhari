const { google } = require('googleapis');
const path = require('path');

const KEYFILEPATH = path.join(__dirname, '../config/google-service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

const calendar = google.calendar({ version: 'v3', auth });

const createGoogleMeet = async (summary, startIsoTime, durationInMinutes = 30) => {
    try {
        const startTime = new Date(startIsoTime || Date.now());
        const endTime = new Date(startTime.getTime() + durationInMinutes * 60000);

        const event = {
            summary: summary || 'Ritual Pooja Session',
            description: 'Online Pooja Session with Pandit ji',
            start: {
                dateTime: startTime.toISOString(),
                timeZone: 'Asia/Kolkata',
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: 'Asia/Kolkata',
            },
            conferenceData: {
                createRequest: {
                    requestId: 'meet-' + Date.now(),
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            }
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            conferenceDataVersion: 1,
        });

        return response.data.hangoutLink;
    } catch (error) {
        return `https://meet.jit.si/PoojaBooking_${Date.now()}`;
    }
};

module.exports = createGoogleMeet;