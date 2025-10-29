/**
 * RBAC middleware helpers
 * - authorize(allowedRoles): middleware that allows only users whose role is in allowedRoles
 * - checkCaretakerScope(req, apartmentId): helper that verifies a caretaker is assigned to the apartment/estate
 */
const { models } = require('../db');

const ROLES = { LANDLORD: 'landlord', CARETAKER: 'caretaker', TENANT: 'tenant' };

function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) return res.status(401).json({ error: 'Unauthorized' });
    if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
      // normalize allowed roles to lowercase for safe comparison
      const normalized = allowedRoles.map(r => (r || '').toString().toLowerCase());
      if (!normalized.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

/**
 * checkCaretakerScope
 * - verifies that a caretaker (req.user.role === 'caretaker') is assigned to the apartment or estate
 * - apartmentId may be supplied; if omitted we attempt to read from req.params.apartmentId, req.body.apartment or req.query.apartmentId
 * - returns true when user is not a caretaker
 */
async function checkCaretakerScope(req, apartmentId) {
  if (!req.user) throw new Error('Unauthorized');
  if (req.user.role !== ROLES.CARETAKER) return true;

  const aptId = apartmentId || req.params?.apartmentId || req.body?.apartment || req.query?.apartmentId;
  if (!aptId) return false;

  const me = await models.Caretaker.findByPk(req.user.refId);
  if (!me) return false;
  const apt = await models.Apartment.findByPk(aptId);
  if (!apt) return false;
  const est = await models.Estate.findByPk(apt.estateId);
  const allowed = (me.apartmentId && String(me.apartmentId) === String(apt.id)) || (me.estateId && est && String(me.estateId) === String(est.id));
  return !!allowed;
}

module.exports = { authorize, checkCaretakerScope, ROLES };
