const crypto = require('node:crypto');

const clean = (str) => (typeof str === 'string' ? str.replace(/^["']|["']$/g, '').trim() : '');

const backendApiAuth = (req, res, next) => {
    const secret = clean(process.env.BACKEND_API_KEY);
    const headerName = clean(process.env.BACKEND_API_HEADER) || 'X-Backend-Api-Key';

    if (!secret) {
        return res.status(503).json({
            success: false,
            message: 'Backend API authentication is not configured'
        });
    }

    const rawSuppliedKey = req.get(headerName) || 
                           req.get('X-Backend-Api-Key') || 
                           req.get('x-backend-api-key') || 
                           req.headers['x-backend-api-key'];

    const suppliedKey = clean(rawSuppliedKey);
    if (!suppliedKey) {
        return res.status(401).json({ success: false, message: 'Invalid API key: missing header' });
    }

    const expectedHash = crypto.createHash('sha256').update(secret).digest();
    const suppliedHash = crypto.createHash('sha256').update(suppliedKey).digest();
    if (!crypto.timingSafeEqual(expectedHash, suppliedHash)) {
        return res.status(401).json({ success: false, message: 'Invalid API key: key mismatch' });
    }

    return next();
};

module.exports = backendApiAuth;

module.exports = backendApiAuth;
