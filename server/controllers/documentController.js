const Document = require('../models/Document');
const User = require('../models/User');
const ShareLink = require('../models/ShareLink');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const Folder = require('../models/Folder');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Helper to record activity safely without throwing
const recordActivity = async (userId, documentId, action, details = '') => {
  try {
    await Activity.create({
      userId,
      documentId,
      action,
      details,
    });
  } catch (err) {
    console.error('[Activity Record Error]', err.message);
  }
};

// @desc    Upload document
// @route   POST /api/documents
// @access  Private
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please attach a document file',
      });
    }

    const {
      name,
      category,
      subcategory,
      folderId,
      issueDate,
      expiryDate,
      description,
      tags,
      isFavorite,
      isImportant,
    } = req.body;

    const documentName = name ? name.trim() : req.file.originalname;
    const documentCategory = category || 'Other';
    const tagArray = tags
      ? typeof tags === 'string'
        ? tags.split(',').map((t) => t.trim()).filter(Boolean)
        : tags
      : [];

    const isFav = isFavorite === 'true' || isFavorite === true || isImportant === 'true' || isImportant === true;

    // Verify folder belongs to user if specified
    let targetFolderId = null;
    if (folderId && folderId !== 'null' && folderId !== 'root') {
      const folderExists = await Folder.findOne({ _id: folderId, userId: req.user.id });
      if (folderExists) {
        targetFolderId = folderExists._id;
      }
    }

    const fileUrl = `/api/documents/stream/${req.file.filename}`;

    const doc = await Document.create({
      userId: req.user.id,
      name: documentName,
      originalFileName: req.file.originalname,
      fileUrl,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      category: documentCategory,
      subcategory: subcategory ? subcategory.trim() : '',
      folderId: targetFolderId,
      issueDate: issueDate ? new Date(issueDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      description: description || '',
      tags: tagArray,
      isFavorite: isFav,
      isImportant: isFav,
    });

    // Update user storage
    const user = await User.findById(req.user.id);
    if (user) {
      user.storageUsed = (user.storageUsed || 0) + req.file.size;
      await user.save();
    }

    // Record activity
    await recordActivity(req.user.id, doc._id, 'upload', `Uploaded "${doc.name}"`);

    // Create notification
    await Notification.create({
      userId: req.user.id,
      title: 'Document Uploaded',
      message: `"${doc.name}" was uploaded successfully to ${doc.category}.`,
      type: 'upload',
      link: `/documents/${doc._id}`,
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user documents with filters, pagination, search
// @route   GET /api/documents
// @access  Private
exports.getDocuments = async (req, res, next) => {
  try {
    const {
      category,
      subcategory,
      folderId,
      search,
      isImportant,
      isFavorite,
      inTrash,
      sort,
      page = 1,
      limit = 50,
    } = req.query;

    const query = { userId: req.user.id };

    // Handle Trash vs Active documents
    if (inTrash === 'true') {
      query.deletedAt = { $ne: null };
    } else {
      query.deletedAt = null;
    }

    // Category filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // Subcategory filter
    if (subcategory && subcategory !== 'All') {
      query.subcategory = subcategory;
    }

    // Folder filter
    if (folderId !== undefined) {
      if (folderId === 'root' || folderId === 'null') {
        query.folderId = null;
      } else if (folderId) {
        query.folderId = folderId;
      }
    }

    // Starred / Favorite filter
    if (isImportant === 'true' || isFavorite === 'true') {
      query.$or = [{ isImportant: true }, { isFavorite: true }];
    }

    // Search filter across name, originalFileName, category, subcategory, description, tags
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      const searchConditions = [
        { name: searchRegex },
        { originalFileName: searchRegex },
        { category: searchRegex },
        { subcategory: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Sort options
    let sortOptions = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sort === 'name-asc') {
      sortOptions = { name: 1 };
    } else if (sort === 'name-desc') {
      sortOptions = { name: -1 };
    } else if (sort === 'expiry') {
      sortOptions = { expiryDate: 1 };
    } else if (sort === 'size-desc') {
      sortOptions = { fileSize: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = await Document.countDocuments(query);
    const documents = await Document.find(query)
      .populate('folderId', 'name color icon')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: documents.length,
      totalCount,
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      currentPage: parseInt(page),
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard statistics dynamically from database
// @route   GET /api/documents/dashboard-stats
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const activeQuery = { userId, deletedAt: null };

    const totalDocuments = await Document.countDocuments(activeQuery);
    const favoriteCount = await Document.countDocuments({
      ...activeQuery,
      $or: [{ isFavorite: true }, { isImportant: true }],
    });

    // Category aggregation
    const categoryCountsRaw = await Document.aggregate([
      { $match: activeQuery },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const categoryCounts = {
      Identity: 0,
      Education: 0,
      Financial: 0,
      Medical: 0,
      Personal: 0,
      Screenshots: 0,
      Certificates: 0,
      Other: 0,
    };

    categoryCountsRaw.forEach((item) => {
      categoryCounts[item._id] = item.count;
    });

    // Recent 5 documents
    const recentDocuments = await Document.find(activeQuery)
      .sort({ createdAt: -1 })
      .limit(5);

    // Expiring soon documents
    const reminderDays = req.user.preferences?.reminderThresholdDays || 30;
    const now = new Date();
    const futureThreshold = new Date(now.getTime() + reminderDays * 24 * 60 * 60 * 1000);

    const expiringDocuments = await Document.find({
      userId,
      deletedAt: null,
      expiryDate: { $ne: null, $lte: futureThreshold },
    })
      .sort({ expiryDate: 1 })
      .limit(5);

    // Storage calculation
    const storageAggregation = await Document.aggregate([
      { $match: activeQuery },
      { $group: { _id: null, totalBytes: { $sum: '$fileSize' } } },
    ]);

    const totalStorageBytes = storageAggregation[0]?.totalBytes || 0;

    res.status(200).json({
      success: true,
      data: {
        totalDocuments,
        favoriteCount,
        categoryCounts,
        recentDocuments,
        expiringDocuments,
        storageUsed: totalStorageBytes,
        storageLimit: req.user.storageLimit || 10 * 1024 * 1024 * 1024,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent activities (views, downloads, uploads)
// @route   GET /api/documents/recent-activity
// @access  Private
exports.getRecentActivity = async (req, res, next) => {
  try {
    const activities = await Activity.find({ userId: req.user.id })
      .populate('documentId', 'name category fileType originalFileName fileSize')
      .sort({ timestamp: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single document by ID
// @route   GET /api/documents/:id
// @access  Private
exports.getDocumentById = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id).populate('folderId', 'name color icon');

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (doc.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this document',
      });
    }

    await recordActivity(req.user.id, doc._id, 'view', `Viewed "${doc.name}"`);

    res.status(200).json({
      success: true,
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Preview document file stream securely (authenticated)
// @route   GET /api/documents/:id/preview
// @access  Private
exports.previewDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (doc.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this document',
      });
    }

    if (!fs.existsSync(doc.filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on storage disk' });
    }

    res.setHeader('Content-Type', doc.fileType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalFileName}"`);
    fs.createReadStream(doc.filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Stream document file binary for preview
// @route   GET /api/documents/stream/:filename
// @access  Private, via query auth_token, or valid share token
exports.streamFile = async (req, res, next) => {
  try {
    const filename = req.params.filename;
    const doc = await Document.findOne({ filePath: { $regex: filename + '$' } });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const shareToken = req.query.token;
    const authToken = req.query.auth_token;
    let isAuthorized = false;

    if (req.user && doc.userId.toString() === req.user.id) {
      isAuthorized = true;
    } else if (authToken) {
      try {
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
        if (decoded && decoded.id === doc.userId.toString()) {
          isAuthorized = true;
        }
      } catch (err) {}
    }

    if (!isAuthorized && shareToken) {
      const shareLink = await ShareLink.findOne({
        token: shareToken,
        documentId: doc._id,
        isRevoked: false,
      });

      if (shareLink && (!shareLink.expiresAt || new Date() < shareLink.expiresAt)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this file.',
      });
    }

    if (!fs.existsSync(doc.filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on storage disk' });
    }

    res.setHeader('Content-Type', doc.fileType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalFileName}"`);
    fs.createReadStream(doc.filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Download document attachment
// @route   GET /api/documents/:id/download
// @access  Private
exports.downloadDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (doc.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this document',
      });
    }

    if (!fs.existsSync(doc.filePath)) {
      return res.status(404).json({ success: false, message: 'File missing from storage' });
    }

    await recordActivity(req.user.id, doc._id, 'download', `Downloaded "${doc.name}"`);

    res.download(doc.filePath, doc.originalFileName);
  } catch (error) {
    next(error);
  }
};

// @desc    Update document metadata
// @route   PUT /api/documents/:id
// @access  Private
exports.updateDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (doc.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to edit this document',
      });
    }

    const {
      name,
      category,
      subcategory,
      folderId,
      issueDate,
      expiryDate,
      description,
      tags,
      isFavorite,
      isImportant,
    } = req.body;

    if (name) doc.name = name.trim();
    if (category) doc.category = category;
    if (subcategory !== undefined) doc.subcategory = subcategory;
    if (folderId !== undefined) {
      doc.folderId = (folderId === 'null' || folderId === 'root' || !folderId) ? null : folderId;
    }
    if (issueDate !== undefined) doc.issueDate = issueDate ? new Date(issueDate) : null;
    if (expiryDate !== undefined) doc.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (description !== undefined) doc.description = description;
    if (tags && Array.isArray(tags)) doc.tags = tags;
    if (isFavorite !== undefined) {
      doc.isFavorite = isFavorite;
      doc.isImportant = isFavorite;
    } else if (isImportant !== undefined) {
      doc.isImportant = isImportant;
      doc.isFavorite = isImportant;
    }

    await doc.save();
    await recordActivity(req.user.id, doc._id, 'edit', `Updated details for "${doc.name}"`);

    res.status(200).json({
      success: true,
      message: 'Document metadata updated successfully',
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Move document to a folder
// @route   PATCH /api/documents/:id/move
// @access  Private
exports.moveToFolder = async (req, res, next) => {
  try {
    const { folderId } = req.body;
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (doc.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    let targetFolder = null;
    if (folderId && folderId !== 'null' && folderId !== 'root') {
      targetFolder = await Folder.findOne({ _id: folderId, userId: req.user.id });
      if (!targetFolder) {
        return res.status(404).json({ success: false, message: 'Target folder not found' });
      }
      doc.folderId = targetFolder._id;
    } else {
      doc.folderId = null;
    }

    await doc.save();
    await recordActivity(
      req.user.id,
      doc._id,
      'edit',
      targetFolder ? `Moved to folder "${targetFolder.name}"` : 'Moved to root'
    );

    res.status(200).json({
      success: true,
      message: 'Document moved successfully',
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle favorite/important status
// @route   PATCH /api/documents/:id/favorite or /api/documents/:id/important
// @access  Private
exports.toggleFavorite = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (doc.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    const nextState = !(doc.isFavorite || doc.isImportant);
    doc.isFavorite = nextState;
    doc.isImportant = nextState;
    await doc.save();

    await recordActivity(
      req.user.id,
      doc._id,
      'favorite',
      nextState ? `Starred "${doc.name}"` : `Unstarred "${doc.name}"`
    );

    res.status(200).json({
      success: true,
      message: nextState ? 'Marked as favorite' : 'Removed from favorites',
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

// Alias for web backwards-compatibility
exports.toggleImportant = exports.toggleFavorite;

// @desc    Move document to Recycle Bin (soft delete)
// @route   DELETE /api/documents/:id
// @access  Private
exports.moveToTrash = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (doc.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    doc.deletedAt = new Date();
    await doc.save();

    await recordActivity(req.user.id, doc._id, 'delete', `Moved "${doc.name}" to Trash`);

    res.status(200).json({
      success: true,
      message: 'Document moved to Recycle Bin',
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore document from Recycle Bin
// @route   POST /api/documents/:id/restore
// @access  Private
exports.restoreFromTrash = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (doc.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    doc.deletedAt = null;
    await doc.save();

    await recordActivity(req.user.id, doc._id, 'restore', `Restored "${doc.name}" from Trash`);

    res.status(200).json({
      success: true,
      message: 'Document restored successfully',
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Permanently delete document
// @route   DELETE /api/documents/:id/permanent
// @access  Private
exports.permanentDelete = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (doc.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    // Delete disk file
    if (doc.filePath && fs.existsSync(doc.filePath)) {
      try {
        fs.unlinkSync(doc.filePath);
      } catch (err) {
        console.error(`Failed to delete disk file: ${doc.filePath}`, err);
      }
    }

    // Delete share links
    await ShareLink.deleteMany({ documentId: doc._id });

    // Update user storage
    const user = await User.findById(req.user.id);
    if (user) {
      user.storageUsed = Math.max(0, (user.storageUsed || 0) - doc.fileSize);
      await user.save();
    }

    // Delete document record
    await Document.findByIdAndDelete(doc._id);

    res.status(200).json({
      success: true,
      message: 'Document permanently deleted',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Empty trash (permanently delete all documents in trash)
// @route   DELETE /api/documents/trash/empty
// @access  Private
exports.emptyTrash = async (req, res, next) => {
  try {
    const docs = await Document.find({ userId: req.user.id, deletedAt: { $ne: null } });

    let freedBytes = 0;
    for (const doc of docs) {
      if (doc.filePath && fs.existsSync(doc.filePath)) {
        try {
          fs.unlinkSync(doc.filePath);
        } catch (e) {}
      }
      freedBytes += doc.fileSize;
      await ShareLink.deleteMany({ documentId: doc._id });
    }

    await Document.deleteMany({ userId: req.user.id, deletedAt: { $ne: null } });

    const user = await User.findById(req.user.id);
    if (user) {
      user.storageUsed = Math.max(0, (user.storageUsed || 0) - freedBytes);
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: `Permanently deleted ${docs.length} documents from trash`,
      freedBytes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk actions (trash, restore, permanent delete, mark important)
// @route   POST /api/documents/bulk
// @access  Private
exports.bulkAction = async (req, res, next) => {
  try {
    const { action, documentIds } = req.body;

    if (!action || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide action and array of document IDs',
      });
    }

    const userId = req.user.id;

    if (action === 'trash') {
      await Document.updateMany(
        { _id: { $in: documentIds }, userId },
        { $set: { deletedAt: new Date() } }
      );
    } else if (action === 'restore') {
      await Document.updateMany(
        { _id: { $in: documentIds }, userId },
        { $set: { deletedAt: null } }
      );
    } else if (action === 'important' || action === 'favorite') {
      await Document.updateMany(
        { _id: { $in: documentIds }, userId },
        { $set: { isImportant: true, isFavorite: true } }
      );
    } else if (action === 'permanent-delete') {
      const docs = await Document.find({ _id: { $in: documentIds }, userId });
      let freedBytes = 0;
      for (const doc of docs) {
        if (doc.filePath && fs.existsSync(doc.filePath)) {
          try {
            fs.unlinkSync(doc.filePath);
          } catch (e) {}
        }
        freedBytes += doc.fileSize;
      }
      await ShareLink.deleteMany({ documentId: { $in: documentIds } });
      await Document.deleteMany({ _id: { $in: documentIds }, userId });

      const user = await User.findById(userId);
      if (user) {
        user.storageUsed = Math.max(0, (user.storageUsed || 0) - freedBytes);
        await user.save();
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk operation '${action}' performed successfully`,
    });
  } catch (error) {
    next(error);
  }
};
