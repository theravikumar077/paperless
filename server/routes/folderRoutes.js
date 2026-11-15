const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createFolder,
  getFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
} = require('../controllers/folderController');

router.use(protect);

router.post('/', createFolder);
router.get('/', getFolders);
router.get('/:id', getFolderById);
router.put('/:id', updateFolder);
router.delete('/:id', deleteFolder);

module.exports = router;
