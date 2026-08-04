const moment = require('moment');

const validateBookingTime = (date, timeSlot) => {
    const formattedDate = moment(date).format('YYYY-MM-DD');
    const start = moment(`${formattedDate} ${timeSlot}`, 'YYYY-MM-DD hh:mm A');
    const now = moment();

    if (!start.isValid()) {
        return { isValid: false, message: 'Invalid Date or Time Slot format' };
    }
    if (start.isBefore(now)) {
        return { 
            isValid: false, 
            message: "Back-date or Past-time not allowed." 
        };
    }
  if (start.isBefore(moment().add(2, 'minutes'))) {
        return { 
            isValid: false, 
            message: 'Booking with less than 2-minute , buffer not allowed.' 
        };
    }
    return { isValid: true, start }; 
};

module.exports = { validateBookingTime };