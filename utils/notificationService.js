const { getMessaging } = require('firebase-admin/messaging');

const sendPushNotification = async (token, data = {}, notification = null) => {
    try {
        if (!token) {
            return null;
        }

        const stringifiedData = {};
        Object.keys(data).forEach(key => {
            stringifiedData[key] = String(data[key]);
        });

        const message = {
            token: token,
            data: stringifiedData,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    defaultSound: true,
                    priority: 'max',
                    visibility: 'public',
                    channelId: (notification && notification.channelId) ? notification.channelId : 'call_notification_channel'
                }
            },
            apns: {
                headers: {
                    'apns-priority': '10'
                },
                payload: {
                    aps: {
                        sound: 'default',
                        contentAvailable: true
                    }
                }
            }
        };

        if (notification) {
            message.notification = {
                title: notification.title,
                body: notification.body
            };
        }

        const response = await getMessaging().send(message);
        return response;
    } catch (error) {
        console.error('Error sending push notification:', error.message);
        return null;
    }
};

module.exports = sendPushNotification;