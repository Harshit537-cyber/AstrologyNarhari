// 1. Modular messaging function import karein
const { getMessaging } = require('firebase-admin/messaging');

const sendPushNotification = async (token, data = {}, notification = null) => {
    try {
        if (!token) {
            console.log("FCM Token missing, skipping notification");
            return null;
        }
        const stringifiedData = {};
        Object.keys(data).forEach(key => {
            stringifiedData[key] = String(data[key]);
        });

        const message = {
            token: token,
            data: stringifiedData,
        };

        if (notification) {
            message.notification = {
                title: notification.title,
                body: notification.body,
            };
        }

        
        const response = await getMessaging().send(message);
        console.log('Successfully sent message:', response);
        return response;
    } catch (error) {
        console.error('Error sending push notification:', error.message);
        return null;
    }
};

module.exports = sendPushNotification;