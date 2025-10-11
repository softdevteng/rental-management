const jwt = require('jsonwebtoken');
const { models } = require('../db');

module.exports = async function authMiddleware(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
  const user = await models.User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
  req.user = user; // includes id, role, refId
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};
