const express = require('express');
const router = express.Router();
const { models } = require('../db');

// List estates (minimal fields for pickers)
router.get('/estates', async (req, res) => {
  const estates = await models.Estate.findAll({ attributes: ['id','name'] });
  res.json(estates);
});

// List apartments for an estate (minimal fields)
router.get('/estates/:id/apartments', async (req, res) => {
  const apts = await models.Apartment.findAll({ where: { estateId: req.params.id }, attributes: ['id','number'] });
  res.json(apts);
});

module.exports = router;
