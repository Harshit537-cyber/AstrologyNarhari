const axios = require('axios');
const moment = require('moment-timezone');

const EVENTS_URL = 'https://server2.pearl-developer.com/namohastro-crm/public/api/integration/events';

const formatBookingDate = (date, time) => {
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

    return bookingDate.format('DD MMM, h:mm A');
};

const sendBookingConfirmedEvent = async ({
    eventId,
    user,
    service,
    astrologer,
    date,
    time,
    amount,
    paymentLink = null
}) => {
    const apiKey = process.env.BOOKING_EVENTS_API_KEY;
    if (!apiKey) {
        throw new Error('BOOKING_EVENTS_API_KEY is not configured');
    }

    if (!user?.mobile) {
        throw new Error('User phone number is required for the booking event');
    }

    await axios.post(EVENTS_URL, {
        event: 'booking.confirmed',
        event_id: eventId,
        phone: user.mobile,
        name: user.fullName || user.name || 'User',
        data: {
            service,
            astrologer,
            date: formatBookingDate(date, time),
            amount: String(amount),
            payment_link: paymentLink
        }
    }, {
        headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json'
        },
        timeout: 8000
    });
};

module.exports = { sendBookingConfirmedEvent };
