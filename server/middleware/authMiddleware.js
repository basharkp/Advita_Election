const jwt = require('jsonwebtoken');

const verifyAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        console.warn("[AuthMiddleware] No token provided in request header.");
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.adminIdx = decoded.id; // Store admin ID if needed
        next();
    } catch (error) {
        console.error("[AuthMiddleware] Token verification failed:", error.message);
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = { verifyAdmin };
