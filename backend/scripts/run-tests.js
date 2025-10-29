const assert = require('assert');
console.log('Running lightweight backend checks...');
try {
  const rbac = require('../middleware/rbac');
  const auth = require('../middleware/auth');
  const receipts = require('../utils/receipts');
  const mpesa = require('../utils/mpesa');
  assert(typeof rbac.authorize === 'function', 'rbac.authorize missing');
  assert(typeof rbac.checkCaretakerScope === 'function', 'rbac.checkCaretakerScope missing');
  assert(typeof rbac.ROLES === 'object', 'rbac.ROLES missing');
  assert(typeof auth === 'function', 'auth middleware missing');
  assert(typeof receipts.generateReceipt === 'function', 'generateReceipt missing');
  assert(typeof mpesa.initiateSTKPush === 'function', 'mpesa.initiateSTKPush missing');
  console.log('All lightweight checks passed');
  process.exit(0);
} catch (err) {
  console.error('Tests failed:', err && err.message ? err.message : err);
  process.exit(2);
}
