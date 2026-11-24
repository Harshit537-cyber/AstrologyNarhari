const crypto = require('crypto');
const razorpayInstance = require('../config/razorpay');

const isValidSignature = (orderId, paymentId, signature) => {
    if (
        !process.env.RAZORPAY_KEY_SECRET ||
        typeof orderId !== 'string' ||
        typeof paymentId !== 'string' ||
        typeof signature !== 'string' ||
        !orderId ||
        !paymentId ||
        !/^[a-f\d]{64}$/i.test(signature)
    ) {
        return false;
    }

    const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest();

    let received;
    try {
        received = Buffer.from(signature, 'hex');
    } catch {
        return false;
    }

    return received.length === expected.length && crypto.timingSafeEqual(received, expected);
};

const verifyCapturedPayment = async ({ paymentId, expectedAmountPaise, expectedOrderId }) => {
    if (
        typeof paymentId !== 'string' ||
        !paymentId ||
        !Number.isSafeInteger(expectedAmountPaise) ||
        expectedAmountPaise < 1
    ) {
        return false;
    }

    const payment = await razorpayInstance.payments.fetch(paymentId);

    if (
        payment.status !== 'captured' ||
        payment.currency !== 'INR' ||
        payment.amount !== expectedAmountPaise ||
        (expectedOrderId && payment.order_id !== expectedOrderId)
    ) {
        return false;
    }

    if (!payment.order_id) {
        return false;
    }

    const order = await razorpayInstance.orders.fetch(payment.order_id);
    return order.status === 'paid' &&
        order.currency === 'INR' &&
        order.amount === expectedAmountPaise;
};

const verifyRazorpayWebhookSignature = (rawBody, signature, secret) => {
    const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (
        !webhookSecret ||
        !rawBody ||
        typeof signature !== 'string' ||
        !/^[a-f\d]{64}$/i.test(signature)
    ) {
        return false;
    }

    const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest();

    let received;
    try {
        received = Buffer.from(signature, 'hex');
    } catch {
        return false;
    }

    return received.length === expected.length && crypto.timingSafeEqual(received, expected);
};
//..
module.exports = { isValidSignature, verifyCapturedPayment, verifyRazorpayWebhookSignature };
