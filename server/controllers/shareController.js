const ShareLink = require('../models/ShareLink');
const Document = require('../models/Document');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');

// @desc    Create secure share link for document
// @route   POST /api/share/create
// @access  Private
exports.createShareLink = async (req, res, next) => {
  try {
    const { documentId, expiryOption, customExpiryDate, password, allowDownload } = req.body;

    const doc = await Document.findById(documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (doc.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    // Calculate expiration
    let expiresAt = null;
    const now = new Date();

    if (expiryOption === '24hours' || expiryOption === '1day') {
      expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (expiryOption === '7days') {
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (expiryOption === '30days') {
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (expiryOption === 'custom' && customExpiryDate) {
      expiresAt = new Date(customExpiryDate);
    }

    // Password hash if provided
    let passwordHash = null;
    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password.trim(), salt);
    }

    // Random unguessable 64-character hex token
    const token = crypto.randomBytes(32).toString('hex');

    const shareLink = await ShareLink.create({
      documentId: doc._id,
      userId: req.user.id,
      token,
      expiresAt,
      passwordHash,
      allowDownload: allowDownload !== undefined ? allowDownload : true,
    });

    res.status(201).json({
      success: true,
      message: 'Share link created successfully',
      data: {
        id: shareLink._id,
        token: shareLink.token,
        documentName: doc.name,
        expiresAt: shareLink.expiresAt,
        hasPassword: !!passwordHash,
        allowDownload: shareLink.allowDownload,
        shareUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/public/share/${shareLink.token}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's share links
// @route   GET /api/share
// @access  Private
exports.getUserShareLinks = async (req, res, next) => {
  try {
    const shareLinks = await ShareLink.find({ userId: req.user.id })
      .populate('documentId', 'name category fileType fileSize originalFileName')
      .sort({ createdAt: -1 });

    const formattedLinks = shareLinks.map((link) => ({
      id: link._id,
      token: link.token,
      document: link.documentId,
      expiresAt: link.expiresAt,
      isRevoked: link.isRevoked,
      isExpired: link.expiresAt ? new Date() > new Date(link.expiresAt) : false,
      hasPassword: !!link.passwordHash,
      allowDownload: link.allowDownload,
      accessCount: link.accessCount,
      createdAt: link.createdAt,
      shareUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/public/share/${link.token}`,
    }));

    res.status(200).json({
      success: true,
      data: formattedLinks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get shared document info via token (Public)
// @route   GET /api/share/public/:token
// @access  Public
exports.getPublicShareInfo = async (req, res, next) => {
  try {
    const { token } = req.params;

    const shareLink = await ShareLink.findOne({ token }).populate(
      'documentId',
      'name category fileType fileSize originalFileName description issueDate expiryDate'
    );

    if (!shareLink) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired share link',
      });
    }

    if (shareLink.isRevoked) {
      return res.status(410).json({
        success: false,
        message: 'This share link has been revoked by the owner.',
      });
    }

    if (shareLink.expiresAt && new Date() > new Date(shareLink.expiresAt)) {
      return res.status(410).json({
        success: false,
        message: 'This share link has expired.',
      });
    }

    // Increment access count
    shareLink.accessCount += 1;
    await shareLink.save();

    res.status(200).json({
      success: true,
      data: {
        document: shareLink.documentId,
        expiresAt: shareLink.expiresAt,
        token: shareLink.token,
        requiresPassword: !!shareLink.passwordHash,
        allowDownload: shareLink.allowDownload,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify password for protected share link
// @route   POST /api/share/public/:token/verify-password
// @access  Public
exports.verifySharePassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const shareLink = await ShareLink.findOne({ token }).populate('documentId');
    if (!shareLink || shareLink.isRevoked) {
      return res.status(404).json({ success: false, message: 'Invalid or revoked share link' });
    }

    if (!shareLink.passwordHash) {
      return res.status(200).json({ success: true, verified: true });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: 'Please provide password' });
    }

    const isMatch = await bcrypt.compare(password, shareLink.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect document password' });
    }

    res.status(200).json({
      success: true,
      verified: true,
      message: 'Password verified',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Preview shared file stream (Public)
// @route   GET /api/share/public/:token/preview
// @access  Public
exports.previewSharedFile = async (req, res, next) => {
  try {
    const { token } = req.params;
    const shareLink = await ShareLink.findOne({ token }).populate('documentId');

    if (!shareLink || shareLink.isRevoked || (shareLink.expiresAt && new Date() > new Date(shareLink.expiresAt))) {
      return res.status(403).json({ success: false, message: 'Share link is invalid, expired, or revoked' });
    }

    const doc = shareLink.documentId;
    if (!doc || !fs.existsSync(doc.filePath)) {
      return res.status(404).json({ success: false, message: 'Shared file not found' });
    }

    res.setHeader('Content-Type', doc.fileType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalFileName}"`);
    fs.createReadStream(doc.filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Download shared file via token (Public)
// @route   GET /api/share/public/:token/download
// @access  Public
exports.downloadSharedFile = async (req, res, next) => {
  try {
    const { token } = req.params;

    const shareLink = await ShareLink.findOne({ token }).populate('documentId');

    if (
      !shareLink ||
      shareLink.isRevoked ||
      (shareLink.expiresAt && new Date() > new Date(shareLink.expiresAt))
    ) {
      return res.status(403).json({
        success: false,
        message: 'Share link is invalid, expired, or revoked',
      });
    }

    if (!shareLink.allowDownload) {
      return res.status(403).json({
        success: false,
        message: 'Downloading is disabled for this shared document',
      });
    }

    const doc = shareLink.documentId;
    if (!doc || !fs.existsSync(doc.filePath)) {
      return res.status(404).json({ success: false, message: 'Shared file not found' });
    }

    res.download(doc.filePath, doc.originalFileName);
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke share link
// @route   PATCH /api/share/:id/revoke
// @access  Private
exports.revokeShareLink = async (req, res, next) => {
  try {
    const shareLink = await ShareLink.findById(req.params.id);

    if (!shareLink) {
      return res.status(404).json({ success: false, message: 'Share link not found' });
    }

    if (shareLink.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    shareLink.isRevoked = true;
    await shareLink.save();

    res.status(200).json({
      success: true,
      message: 'Share link access revoked immediately',
    });
  } catch (error) {
    next(error);
  }
};
