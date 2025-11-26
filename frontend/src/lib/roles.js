export function displayRole(role) {
  if (!role) return '';
  if (role === 'landlord' || role === 'owner') return 'Owner';
  if (role === 'caretaker' || role === 'property_manager') return 'Property Manager';
  if (role === 'tenant') return 'Tenant';
  // fallback: title case
  return String(role).replace(/_/g,' ').replace(/\b\w/g, (m)=>m.toUpperCase());
}

export function isOwner(role) {
  return role === 'landlord' || role === 'owner';
}

export function isPropertyManager(role) {
  return role === 'caretaker' || role === 'property_manager';
}

// Backwards-compatible alias used by some components
export const roleLabel = displayRole;
