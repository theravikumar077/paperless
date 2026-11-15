const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const {
  uploadDocument,
  getDocuments,
  getDashboardStats,
  getRecentActivity,
  getDocumentById,
  previewDocument,
  streamFile,
  downloadDocument,
  updateDocument,
  moveToFolder,
  toggleFavorite,
  toggleImportant,
  moveToTrash,
  restoreFromTrash,
  permanentDelete,
  emptyTrash,
  bulkAction,
} = require('../controllers/documentController');

// Public or token-based file streaming for preview
router.get('/stream/:filename', (req, res, next) => {
  if (req.headers.authorization || (req.cookies && req.cookies.token)) {
    return protect(req, res, () => streamFile(req, res, next));
  }
  return streamFile(req, res, next);
});

// Protected Document Routes
router.use(protect);

router.post('/', upload.single('file'), uploadDocument);
router.get('/', getDocuments);
router.get('/dashboard-stats', getDashboardStats);
router.get('/recent-activity', getRecentActivity);
router.post('/bulk', bulkAction);
router.delete('/trash/empty', emptyTrash);

router.get('/:id', getDocumentById);
router.get('/:id/preview', previewDocument);
router.get('/:id/download', downloadDocument);
router.put('/:id', updateDocument);
router.patch('/:id/move', moveToFolder);
router.patch('/:id/favorite', toggleFavorite);
router.patch('/:id/important', toggleImportant);
router.delete('/:id', moveToTrash);
router.post('/:id/restore', restoreFromTrash);
router.delete('/:id/permanent', permanentDelete);

module.exports = router;
