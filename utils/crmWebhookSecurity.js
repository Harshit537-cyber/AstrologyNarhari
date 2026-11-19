const crypto = require('node:crypto');

const verifyWebhookSignature = ({
    timestamp,
    signature,
    rawBody,
    secret,
    nowSeconds = Math.floor(Date.now() / 1000)
}) => {
    if (
        typeof timestamp !== 'string' ||
        !/^\d{1,12}$/.test(timestamp) ||
        typeof signature !== 'string' ||
        !/^sha256=[a-f0-9]{64}$/i.test(signature) ||
        !Buffer.isBuffer(rawBody) ||
        typeof secret !== 'string' ||
        !secret
    ) {
        return false;
    }

    const timestampSeconds = Number(timestamp);
    if (!Number.isSafeInteger(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) >= 300) {
        return false;
    }

    const expected = crypto
        .createHmac('sha256', secret)
        .update(timestamp)
        .update('.')
        .update(rawBody)
        .digest();
    const supplied = Buffer.from(signature.slice('sha256='.length), 'hex');

    return supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
};

module.exports = { verifyWebhookSignature };
