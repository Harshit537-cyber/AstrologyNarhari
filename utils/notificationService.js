const admin = require('firebase-admin');
const sendPushNotification = async (token, data = {}, notification = null) => {
    try {
        const message = {
            token: token,
            data: data, 
        };
        if (notification) {
            message.notification = {
                title: notification.title,
                body: notification.body,
            };
        }
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
        return response;
    } catch (error) {
        console.error('Error sending push notification:', error);
        return null;
    }
};

module.exports = sendPushNotification;