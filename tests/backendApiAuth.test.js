const test = require('node:test');
const assert = require('node:assert/strict');
const backendApiAuth = require('../middleware/backendApiAuth');

const originalApiKey = process.env.BACKEND_API_KEY;
const originalHeader = process.env.BACKEND_API_HEADER;

const makeResponse = () => ({
    statusCode: null,
    body: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    }
});

test('requires a configured key and authenticates using the configured header', (t) => {
    t.after(() => {
        if (originalApiKey === undefined) {
            delete process.env.BACKEND_API_KEY;
        } else {
            process.env.BACKEND_API_KEY = originalApiKey;
        }
        if (originalHeader === undefined) {
            delete process.env.BACKEND_API_HEADER;
        } else {
            process.env.BACKEND_API_HEADER = originalHeader;
        }
    });

    let nextCalled = false;
    const response = makeResponse();
    process.env.BACKEND_API_KEY = 'test-api-key';
    process.env.BACKEND_API_HEADER = 'X-Test-Backend-Key';

    backendApiAuth({
        get: (name) => name === 'X-Test-Backend-Key' ? 'test-api-key' : undefined
    }, response, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);

    const unauthorized = makeResponse();
    backendApiAuth({ get: () => 'wrong-key' }, unauthorized, () => {
        assert.fail('Invalid credentials must not continue');
    });
    assert.equal(unauthorized.statusCode, 401);

    delete process.env.BACKEND_API_KEY;
    const unavailable = makeResponse();
    backendApiAuth({ get: () => 'test-api-key' }, unavailable, () => {
        assert.fail('Missing configuration must not continue');
    });
    assert.equal(unavailable.statusCode, 503);
});
