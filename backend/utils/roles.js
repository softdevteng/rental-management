// Role helpers for backend: keep aliases backward-compatible
function displayRole(role) {
  if (!role) return '';
  if (role === 'landlord' || role === 'owner') return 'owner';
  if (role === 'caretaker' || role === 'property_manager') return 'property_manager';
  if (role === 'tenant') return 'tenant';
  return String(role).toLowerCase();
}

function isOwner(role) {
  return role === 'landlord' || role === 'owner';
}

function isPropertyManager(role) {
  return role === 'caretaker' || role === 'property_manager';
}

function isTenant(role) {
  return role === 'tenant';
}

module.exports = { displayRole, isOwner, isPropertyManager, isTenant };
