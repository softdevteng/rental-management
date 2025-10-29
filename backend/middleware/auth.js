const jwt = require('jsonwebtoken');
const { models } = require('../db');

/**
 * Auth middleware
 * - accepts token in Authorization: Bearer <token>, x-access-token header or ?token query
 * - verifies JWT and attaches a lightweight req.user = { id, role, refId }
 * - normalizes role to lowercase string
 */
module.exports = async function authMiddleware(req, res, next) {
  // Support Authorization: Bearer <token> or token in x-access-token header or query param
  const header = req.header('Authorization') || req.header('authorization');
  let token = header && typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : header;
  if (!token) token = req.header('x-access-token') || req.query.token;
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

  const secret = process.env.JWT_SECRET || 'secretkey';
  try {
    const decoded = jwt.verify(token, secret);
    if (!decoded || !decoded.id) return res.status(401).json({ error: 'Invalid token payload' });
    const user = await models.User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    // Normalize role to lowercase string for consistent RBAC checks
    const role = (user.role || '').toString().toLowerCase();
    req.user = { id: user.id, role, refId: user.refId };
    return next();
  } catch (err) {
    // Token errors are common; log minimally to avoid leaking secrets
    console.error('Auth middleware error:', err && err.message ? err.message : err);
    return res.status(401).json({ error: 'Token is not valid' });
  }
};
