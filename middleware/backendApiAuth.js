const crypto = require('node:crypto');

const backendApiAuth = (req, res, next) => {
    const secret = process.env.BACKEND_API_KEY;
    const headerName = process.env.BACKEND_API_HEADER || 'X-Backend-Api-Key';

    if (!secret) {
        return res.status(503).json({
            success: false,
            message: 'Backend API authentication is not configured'
        });
    }

    if (!/^[A-Za-z0-9-]+$/.test(headerName)) {
        console.error('BACKEND_API_HEADER must be a valid HTTP header name');
        return res.status(503).json({
            success: false,
            message: 'Backend API authentication is misconfigured'
        });
    }

    const suppliedKey = req.get(headerName);
    if (typeof suppliedKey !== 'string' || !suppliedKey) {
        return res.status(401).json({ success: false, message: 'Invalid API key' });
    }

    const expectedHash = crypto.createHash('sha256').update(secret).digest();
    const suppliedHash = crypto.createHash('sha256').update(suppliedKey).digest();
    if (!crypto.timingSafeEqual(expectedHash, suppliedHash)) {
        return res.status(401).json({ success: false, message: 'Invalid API key' });
    }

    return next();
};

module.exports = backendApiAuth;
