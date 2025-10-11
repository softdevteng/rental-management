const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');

const uploadDir = path.join(__dirname, '..', 'uploads');
function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
}
ensureDir(uploadDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = 'pf_' + Date.now() + '_' + Math.round(Math.random()*1e9);
    cb(null, base + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) return cb(new Error('Only image uploads are allowed'));
  cb(null, true);
};

const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 }, fileFilter }); // 2MB limit

// Upload a profile photo, returns { url }
router.post('/profile', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const relative = `/uploads/${req.file.filename}`;
  const base = process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  const fileUrl = `${base}${relative}`;
  res.status(201).json({ url: fileUrl, path: relative });
});

module.exports = router;
