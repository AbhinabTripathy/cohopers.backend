const jwt = require('jsonwebtoken');

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.APP_SUPER_SECRET_KEY || 'your-secret-key');
      req.user = decoded;
    }
  } catch (_) {}
  next();
};

module.exports = optionalAuth;
