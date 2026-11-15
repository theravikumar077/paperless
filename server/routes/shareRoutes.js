const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createShareLink,
  getUserShareLinks,
  getPublicShareInfo,
  verifySharePassword,
  previewSharedFile,
  downloadSharedFile,
  revokeShareLink,
} = require('../controllers/shareController');

// Public routes for viewing shared docs
router.get('/public/:token', getPublicShareInfo);
router.post('/public/:token/verify-password', verifySharePassword);
router.get('/public/:token/preview', previewSharedFile);
router.get('/public/:token/download', downloadSharedFile);

// Protected routes for managing user's share links
router.use(protect);
router.post('/create', createShareLink);
router.get('/', getUserShareLinks);
router.patch('/:id/revoke', revokeShareLink);

module.exports = router;
