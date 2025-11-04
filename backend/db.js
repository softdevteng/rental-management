const { Sequelize, DataTypes } = require('sequelize');

// Support in-memory sqlite for tests (set NODE_ENV=test or USE_SQLITE_IN_MEMORY=true)
// Allow forcing MySQL in CI by setting FORCE_MYSQL=true. This lets CI run tests
// against a real MySQL service even though Jest sets NODE_ENV=test locally.
const forceMysql = String(process.env.FORCE_MYSQL || '').toLowerCase() === 'true';
const useSqlite = !forceMysql && (String(process.env.USE_SQLITE_IN_MEMORY || '').toLowerCase() === 'true' || process.env.NODE_ENV === 'test');
let sequelize;
if (useSqlite) {
  sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
} else {
  const DB_HOST = process.env.MYSQL_HOST || 'localhost';
  const DB_PORT = Number(process.env.MYSQL_PORT || 3306);
  const DB_USER = process.env.MYSQL_USER || 'root';
  const DB_PASS = process.env.MYSQL_PASSWORD || '';
  const DB_NAME = process.env.MYSQL_DB || 'rms';
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    logging: false,
  });
}

// Define models
const User = sequelize.define('User', {
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('tenant','landlord','caretaker'), allowNull: false },
  refId: { type: DataTypes.INTEGER, allowNull: true },
  passwordResetToken: { type: DataTypes.STRING },
  passwordResetExpires: { type: DataTypes.DATE },
});

const Tenant = sequelize.define('Tenant', {
  name: DataTypes.STRING,
  idNumber: DataTypes.STRING,
  email: { type: DataTypes.STRING, unique: true },
  tenantCode: { type: DataTypes.STRING, unique: true },
  password: DataTypes.STRING,
  phone: DataTypes.STRING,
  photoUrl: DataTypes.STRING,
  vacateDate: DataTypes.DATE,
  vacateStatus: { type: DataTypes.ENUM('none','pending','approved'), defaultValue: 'none' },
  depositRefunded: { type: DataTypes.BOOLEAN, defaultValue: false },
});

const Landlord = sequelize.define('Landlord', {
  name: DataTypes.STRING,
  idNumber: DataTypes.STRING,
  email: { type: DataTypes.STRING, unique: true },
  password: DataTypes.STRING,
  phone: DataTypes.STRING,
  photoUrl: DataTypes.STRING,
});

const Estate = sequelize.define('Estate', {
  name: DataTypes.STRING,
  address: DataTypes.STRING,
});

const Apartment = sequelize.define('Apartment', {
  number: DataTypes.STRING,
  rent: DataTypes.DECIMAL(10,2),
  deposit: DataTypes.DECIMAL(10,2),
});

// Caretaker in charge of an estate/apartment
const Caretaker = sequelize.define('Caretaker', {
  name: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, unique: true },
  idNumber: { type: DataTypes.STRING },
  passportNumber: { type: DataTypes.STRING },
  photoUrl: DataTypes.STRING,
});

const Ticket = sequelize.define('Ticket', {
  description: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('open','in-progress','closed'), defaultValue: 'open' },
  createdAt: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
  resolvedAt: DataTypes.DATE,
});

const Payment = sequelize.define('Payment', {
  amount: DataTypes.DECIMAL(10,2),
  date: DataTypes.DATE,
  status: { type: DataTypes.ENUM('pending','paid','late'), defaultValue: 'pending' },
  method: { type: DataTypes.ENUM('cash','bank','mpesa'), defaultValue: 'mpesa' },
  // M-Pesa fields (mock/sandbox)
  mpesaPhone: DataTypes.STRING,
  mpesaCheckoutRequestId: DataTypes.STRING,
  mpesaMerchantRequestId: DataTypes.STRING,
  mpesaReceipt: DataTypes.STRING,
  mpesaResultCode: DataTypes.STRING,
  mpesaResultDesc: DataTypes.STRING,
});

const Notice = sequelize.define('Notice', {
  title: DataTypes.STRING,
  message: DataTypes.TEXT,
  type: { type: DataTypes.ENUM('general','rent-reminder'), defaultValue: 'general' },
  createdAt: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
});

// Historical occupancy snapshots to track occupied/vacant state over time
const OccupancyHistory = sequelize.define('OccupancyHistory', {
  apartmentId: DataTypes.INTEGER,
  estateId: DataTypes.INTEGER,
  tenantId: DataTypes.INTEGER,
  status: { type: DataTypes.ENUM('occupied','vacant'), defaultValue: 'vacant' },
  recordedAt: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
});

// Expenses (operational costs, repairs, utilities etc.)
const Expense = sequelize.define('Expense', {
  amount: DataTypes.DECIMAL(10,2),
  date: DataTypes.DATE,
  category: DataTypes.STRING,
  notes: DataTypes.TEXT,
  estateId: DataTypes.INTEGER,
  landlordId: DataTypes.INTEGER,
});

// Caretaker invite codes created by landlord
const CaretakerInvite = sequelize.define('CaretakerInvite', {
  code: { type: DataTypes.STRING, unique: true },
  expiresAt: DataTypes.DATE,
  usedAt: DataTypes.DATE,
  landlordId: DataTypes.INTEGER,
  estateId: DataTypes.INTEGER,
  apartmentId: DataTypes.INTEGER,
});

// Associations
Landlord.hasMany(Estate, { foreignKey: 'landlordId' });
Estate.belongsTo(Landlord, { foreignKey: 'landlordId' });

Estate.hasMany(Apartment, { foreignKey: 'estateId' });
Apartment.belongsTo(Estate, { foreignKey: 'estateId' });

Apartment.belongsTo(Tenant, { foreignKey: 'tenantId' });
Tenant.hasOne(Apartment, { foreignKey: 'tenantId' });

Tenant.hasMany(Payment, { foreignKey: 'tenantId' });
Payment.belongsTo(Tenant, { foreignKey: 'tenantId' });
Payment.belongsTo(Apartment, { foreignKey: 'apartmentId' });
Apartment.hasMany(Payment, { foreignKey: 'apartmentId' });

Tenant.hasMany(Ticket, { foreignKey: 'tenantId' });
Ticket.belongsTo(Tenant, { foreignKey: 'tenantId' });
Ticket.belongsTo(Apartment, { foreignKey: 'apartmentId' });
Apartment.hasMany(Ticket, { foreignKey: 'apartmentId' });

Landlord.hasMany(Notice, { foreignKey: 'landlordId' });
Notice.belongsTo(Landlord, { foreignKey: 'landlordId' });
Estate.hasMany(Notice, { foreignKey: 'estateId' });
Notice.belongsTo(Estate, { foreignKey: 'estateId' });
Notice.belongsTo(Tenant, { foreignKey: 'tenantId' });

// Caretaker associations
Caretaker.belongsTo(Estate, { foreignKey: 'estateId' });
Estate.hasMany(Caretaker, { foreignKey: 'estateId' });
Caretaker.belongsTo(Apartment, { foreignKey: 'apartmentId' });
Apartment.hasMany(Caretaker, { foreignKey: 'apartmentId' });

// Expense associations
Estate.hasMany(Expense, { foreignKey: 'estateId' });
Expense.belongsTo(Estate, { foreignKey: 'estateId' });
Landlord.hasMany(Expense, { foreignKey: 'landlordId' });
Expense.belongsTo(Landlord, { foreignKey: 'landlordId' });

// Occupancy history associations
Apartment.hasMany(OccupancyHistory, { foreignKey: 'apartmentId' });
OccupancyHistory.belongsTo(Apartment, { foreignKey: 'apartmentId' });
Estate.hasMany(OccupancyHistory, { foreignKey: 'estateId' });
OccupancyHistory.belongsTo(Estate, { foreignKey: 'estateId' });
Tenant.hasMany(OccupancyHistory, { foreignKey: 'tenantId' });
OccupancyHistory.belongsTo(Tenant, { foreignKey: 'tenantId' });

// Hook: when an apartment's tenant assignment changes, create an occupancy snapshot
Apartment.addHook('afterUpdate', async (apartment, options) => {
  try {
    // previous() is available on instances to check prior value
    const prevTenant = apartment.previous('tenantId');
    const newTenant = apartment.tenantId;
    if (prevTenant === newTenant) return;

    const status = newTenant ? 'occupied' : 'vacant';
    // create a snapshot record; prefer transaction if provided
    const createOpts = {};
    if (options && options.transaction) createOpts.transaction = options.transaction;

    await OccupancyHistory.create({
      apartmentId: apartment.id,
      estateId: apartment.estateId,
      tenantId: newTenant || null,
      status,
      recordedAt: new Date(),
    }, createOpts);
  } catch (err) {
    // Don't throw; occupancy history is optional. Log for diagnostics.
    // eslint-disable-next-line no-console
    console.warn('Failed to write OccupancyHistory snapshot:', err && err.message ? err.message : err);
  }
});

let connected = false;
async function connectAndSync() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  connected = true;
}

function dbHealth() { return connected ? 1 : 0; }

module.exports = {
  sequelize,
  Sequelize,
  DataTypes,
  models: { User, Tenant, Landlord, Estate, Apartment, Ticket, Payment, Notice, Caretaker, CaretakerInvite, Expense, OccupancyHistory },
  connectAndSync,
  dbHealth,
};
