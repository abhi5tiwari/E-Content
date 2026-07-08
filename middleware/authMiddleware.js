const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'exam-library-secret-key-2026';

function authenticateJWT(req, res, next) {
  // Check token in cookies or authorization header
  let token = req.cookies.token;

  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
}

function verifyRole(roles = []) {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden. Insufficient permissions.' });
    }

    next();
  };
}

module.exports = {
  authenticateJWT,
  verifyRole,
  JWT_SECRET
};
