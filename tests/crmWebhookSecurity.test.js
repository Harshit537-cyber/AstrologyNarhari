const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifyWebhookSignature } = require('../utils/crmWebhookSecurity');

const secret = 'test-webhook-secret';
const nowSeconds = 1763300000;
const timestamp = String(nowSeconds);
const rawBody = Buffer.from('{"id":"evt-1","event":"lead.created","data":{}}');

const signatureFor = (body = rawBody, signedTimestamp = timestamp) =>
    `sha256=${crypto.createHmac('sha256', secret)
        .update(signedTimestamp)
        .update('.')
        .update(body)
        .digest('hex')}`;

test('accepts a correctly signed webhook within the five-minute window', () => {
    assert.equal(verifyWebhookSignature({
        timestamp,
        signature: signatureFor(),
        rawBody,
        secret,
        nowSeconds
    }), true);
});

test('rejects altered bodies and stale timestamps', () => {
    assert.equal(verifyWebhookSignature({
        timestamp,
        signature: signatureFor(),
        rawBody: Buffer.from('{"different":true}'),
        secret,
        nowSeconds
    }), false);

    const staleTimestamp = String(nowSeconds - 300);
    assert.equal(verifyWebhookSignature({
        timestamp: staleTimestamp,
        signature: signatureFor(rawBody, staleTimestamp),
        rawBody,
        secret,
        nowSeconds
    }), false);
});

test('rejects malformed or incomplete signature inputs', () => {
    assert.equal(verifyWebhookSignature({
        timestamp,
        signature: 'sha256=invalid',
        rawBody,
        secret,
        nowSeconds
    }), false);
});
