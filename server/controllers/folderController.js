const Folder = require('../models/Folder');
const Document = require('../models/Document');
const Activity = require('../models/Activity');

// @desc    Create new folder
// @route   POST /api/folders
// @access  Private
exports.createFolder = async (req, res, next) => {
  try {
    const { name, parentFolderId, color, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a folder name' });
    }

    if (parentFolderId) {
      const parent = await Folder.findOne({ _id: parentFolderId, userId: req.user.id });
      if (!parent) {
        return res.status(404).json({ success: false, message: 'Parent folder not found' });
      }
    }

    const folder = await Folder.create({
      userId: req.user.id,
      name: name.trim(),
      parentFolderId: parentFolderId || null,
      color: color || '#4F46E5',
      icon: icon || 'folder',
    });

    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      data: folder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all user folders with document counts
// @route   GET /api/folders
// @access  Private
exports.getFolders = async (req, res, next) => {
  try {
    const { parentFolderId } = req.query;

    const query = { userId: req.user.id };
    if (parentFolderId === 'root' || parentFolderId === 'null') {
      query.parentFolderId = null;
    } else if (parentFolderId) {
      query.parentFolderId = parentFolderId;
    }

    const folders = await Folder.find(query).sort({ name: 1 }).lean();

    // Attach document counts to each folder
    const folderIds = folders.map((f) => f._id);
    const docCounts = await Document.aggregate([
      { $match: { userId: req.user._id, folderId: { $in: folderIds }, deletedAt: null } },
      { $group: { _id: '$folderId', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    docCounts.forEach((dc) => {
      countMap[dc._id.toString()] = dc.count;
    });

    const enrichedFolders = folders.map((f) => ({
      ...f,
      documentCount: countMap[f._id.toString()] || 0,
    }));

    res.status(200).json({
      success: true,
      count: enrichedFolders.length,
      data: enrichedFolders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single folder details with children and docs
// @route   GET /api/folders/:id
// @access  Private
exports.getFolderById = async (req, res, next) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user.id });
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    const subfolders = await Folder.find({ parentFolderId: folder._id, userId: req.user.id }).sort({ name: 1 });
    const documents = await Document.find({ folderId: folder._id, userId: req.user.id, deletedAt: null }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        folder,
        subfolders,
        documents,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update folder
// @route   PUT /api/folders/:id
// @access  Private
exports.updateFolder = async (req, res, next) => {
  try {
    const { name, color, icon, parentFolderId } = req.body;

    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user.id });
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    if (name) folder.name = name.trim();
    if (color) folder.color = color;
    if (icon) folder.icon = icon;
    if (parentFolderId !== undefined) {
      if (parentFolderId === req.params.id) {
        return res.status(400).json({ success: false, message: 'Folder cannot be its own parent' });
      }
      folder.parentFolderId = parentFolderId || null;
    }

    await folder.save();

    res.status(200).json({
      success: true,
      message: 'Folder updated successfully',
      data: folder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete folder
// @route   DELETE /api/folders/:id
// @access  Private
exports.deleteFolder = async (req, res, next) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user.id });
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Move any documents inside this folder to root or parent folder
    await Document.updateMany(
      { folderId: folder._id, userId: req.user.id },
      { $set: { folderId: folder.parentFolderId || null } }
    );

    // Reparent subfolders
    await Folder.updateMany(
      { parentFolderId: folder._id, userId: req.user.id },
      { $set: { parentFolderId: folder.parentFolderId || null } }
    );

    await Folder.findByIdAndDelete(folder._id);

    res.status(200).json({
      success: true,
      message: 'Folder deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
