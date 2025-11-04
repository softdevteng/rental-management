const { sequelize, DataTypes } = require('../db');

async function up() {
  try {
    // If running in sqlite in-memory dev/test mode, use sync to ensure model tables exist
    if (String(process.env.USE_SQLITE_IN_MEMORY || '').toLowerCase() === 'true' || process.env.NODE_ENV === 'test') {
      console.log('Running sequelize.sync for in-memory sqlite (dev/test mode)...');
      await sequelize.sync({ alter: true });
      console.log('Sync complete.');
      return;
    }

    await sequelize.authenticate();
    const qi = sequelize.getQueryInterface();
    const tableName = 'Expenses';
    const tables = await qi.showAllTables();
    if (tables.includes(tableName) || tables.includes(tableName.toLowerCase())) {
      console.log(`${tableName} already exists, skipping creation.`);
      return;
    }

    await qi.createTable(tableName, {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
      date: { type: DataTypes.DATE, allowNull: false },
      category: { type: DataTypes.STRING },
      notes: { type: DataTypes.TEXT },
      estateId: { type: DataTypes.INTEGER },
      landlordId: { type: DataTypes.INTEGER },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    });
    console.log(`${tableName} created successfully.`);
  } catch (err) {
    console.error('Failed to create Expense table:', err);
    process.exit(1);
  } finally {
    try { await sequelize.close(); } catch (e) {}
  }
}

if (require.main === module) up();

module.exports = { up };
