const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifyRazorpayWebhookSignature } = require('../utils/razorpayPayment');

const secret = 'rzp-test-secret';
const rawBody = Buffer.from(JSON.stringify({
    event: 'payment_link.paid',
    payload: {
        payment_link: {
            entity: { id: 'plink_test123', amount: 50000, status: 'paid' }
        },
        payment: {
            entity: { id: 'pay_test123', amount: 50000, status: 'captured' }
        }
    }
}));

const signatureFor = (body = rawBody, s = secret) =>
    crypto.createHmac('sha256', s).update(body).digest('hex');

test('verifyRazorpayWebhookSignature accepts a valid signature', () => {
    const signature = signatureFor();
    assert.equal(verifyRazorpayWebhookSignature(rawBody, signature, secret), true);
});

test('verifyRazorpayWebhookSignature rejects tampered body', () => {
    const signature = signatureFor();
    const tampered = Buffer.from(JSON.stringify({ event: 'payment_link.paid', tampered: true }));
    assert.equal(verifyRazorpayWebhookSignature(tampered, signature, secret), false);
});

test('verifyRazorpayWebhookSignature rejects wrong secret or malformed signature', () => {
    assert.equal(verifyRazorpayWebhookSignature(rawBody, signatureFor(rawBody, 'wrong-secret'), secret), false);
    assert.equal(verifyRazorpayWebhookSignature(rawBody, 'not-a-valid-hex-signature', secret), false);
    assert.equal(verifyRazorpayWebhookSignature(rawBody, null, secret), false);
    assert.equal(verifyRazorpayWebhookSignature(null, signatureFor(), secret), false);
});
