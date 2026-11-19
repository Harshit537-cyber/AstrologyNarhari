const axios = require('axios');
const moment = require('moment-timezone');

const EVENTS_URL = process.env.CRM_EVENTS_URL ||
    'https://server2.pearl-developer.com/namohastro-crm/public/api/integration/events';

const parseBookingDate = (date, time) => {
    let bookingDate;

    if (time && date) {
        const datePart = moment(date).tz('Asia/Kolkata').format('YYYY-MM-DD');
        bookingDate = moment.tz(
            `${datePart} ${time}`,
            ['YYYY-MM-DD h:mm A', 'YYYY-MM-DD HH:mm'],
            'Asia/Kolkata'
        );
    } else {
        bookingDate = moment(date).tz('Asia/Kolkata');
    }

    if (!bookingDate || !bookingDate.isValid()) {
        throw new Error('A valid booking date is required for the booking event');
    }

    return bookingDate;
};

const sendCrmEvent = ({ event, eventId, ref, user, data }) => {
    const apiKey = process.env.BOOKING_EVENTS_API_KEY;
    if (!apiKey) {
        console.error('CRM event was not sent: BOOKING_EVENTS_API_KEY is not configured');
        return false;
    }

    const phone = user?.mobile?.replace(/\D/g, '');
    if (!phone) {
        console.error(`CRM event ${eventId} was not sent: user phone number is missing`);
        return false;
    }

    axios.post(EVENTS_URL, {
        event,
        event_id: eventId,
        ref: ref || eventId,
        phone,
        name: user.fullName || user.name || 'User',
        data
    }, {
        headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json'
        },
        timeout: 8000
    }).then((response) => {
        if (response.data?.status === 'failed') {
            console.error(`CRM reported event ${eventId} as failed`);
        }
    }).catch((error) => {
        console.error(`CRM event ${eventId} delivery failed:`, error.message);
    });

    return true;
};

const sendBookingConfirmedEvent = async ({
    eventId,
    ref,
    user,
    service,
    astrologer,
    date,
    time,
    amount,
    paymentLink = null
}) => {
    const bookingDate = parseBookingDate(date, time);

    return sendCrmEvent({
        event: 'booking.confirmed',
        eventId,
        ref,
        user,
        data: {
            service,
            astrologer,
            date: bookingDate.format('DD MMM, h:mm A'),
            event_time: bookingDate.format('YYYY-MM-DD HH:mm'),
            amount: String(amount),
            payment_link: paymentLink
        }
    });
};

module.exports = { sendBookingConfirmedEvent, sendCrmEvent };
