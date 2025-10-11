const express = require('express');
const router = express.Router();
const { models } = require('../db');
const auth = require('../middleware/auth');

// Get all notices for an estate (tenant)
router.get('/estate/:id', auth, async (req, res) => {
  const notices = await models.Notice.findAll({ where: { estateId: req.params.id } });
  res.json(notices);
});

module.exports = router;
