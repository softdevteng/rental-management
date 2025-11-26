const { sequelize } = require('../db');

async function run() {
  try {
    await sequelize.authenticate();
    const dialect = sequelize.getDialect();
    console.log('Connected to DB dialect:', dialect);
    if (dialect === 'mysql') {
      console.log('Altering Users.role enum to include owner and property_manager...');
      // Be explicit about the allowed values to avoid accidental removal
      await sequelize.query("ALTER TABLE `Users` MODIFY `role` ENUM('tenant','landlord','caretaker','owner','property_manager') NOT NULL;");
      console.log('Enum altered.');
    } else {
      console.log('No enum alteration required for dialect:', dialect);
    }
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
