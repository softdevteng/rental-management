require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize, models, connectAndSync } = require('..//db');

// Safety: require explicit opt-in
const ALLOW = process.env.ALLOW_PURGE === 'true';

async function main() {
  if (!ALLOW) {
    console.error('Refusing to purge. Set ALLOW_PURGE=true in backend/.env to enable this action.');
    process.exit(2);
  }

  try {
    await connectAndSync();

    // Find sample estates created via dev seed (named like "Sample Estate <timestamp>")
    const sampleEstates = await models.Estate.findAll({ where: { name: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), 'LIKE', 'sample estate%') } });
    const estateIds = sampleEstates.map(e => e.id);

    // Collect related apartments
    const apartments = estateIds.length ? await models.Apartment.findAll({ where: { estateId: estateIds } }) : [];
    const apartmentIds = apartments.map(a => a.id);

    // Delete dependent rows first
    if (apartmentIds.length) {
      await models.Payment.destroy({ where: { apartmentId: apartmentIds } });
      await models.Ticket.destroy({ where: { apartmentId: apartmentIds } });
      await models.Caretaker.destroy({ where: { apartmentId: apartmentIds } });
    }

    if (estateIds.length) {
      await models.Notice.destroy({ where: { estateId: estateIds } });
      await models.Caretaker.destroy({ where: { estateId: estateIds } });
      await models.Apartment.destroy({ where: { estateId: estateIds } });
      await models.Estate.destroy({ where: { id: estateIds } });
    }

    // Clean additional obvious samples
    await models.Caretaker.destroy({ where: { name: 'Sample Caretaker' } });
    await models.Caretaker.destroy({ where: { email: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), 'LIKE', 'caretaker+%@example.com') } });
    await models.Notice.destroy({ where: { title: 'Welcome Notice' } });

    console.log('Purge complete. Removed dev-seeded sample data.');
    process.exit(0);
  } catch (err) {
    console.error('Purge failed:', err.message);
    process.exit(1);
  }
}

main();
