const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a document name'],
      trim: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileType: {
      type: String, // e.g. 'application/pdf', 'image/png', 'image/jpeg', 'image/webp'
      required: true,
    },
    fileSize: {
      type: Number, // in bytes
      required: true,
    },
    category: {
      type: String,
      required: [true, 'Please specify a category'],
      default: 'Other',
      index: true,
    },
    subcategory: {
      type: String,
      default: '',
      index: true,
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true,
    },
    issueDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    isImportant: {
      type: Boolean,
      default: false,
      index: true,
    },
    storageKey: {
      type: String,
      default: '',
    },
    thumbnailKey: {
      type: String,
      default: '',
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Keep isFavorite and isImportant in sync
documentSchema.pre('save', function (next) {
  if (this.isModified('isFavorite')) {
    this.isImportant = this.isFavorite;
  } else if (this.isModified('isImportant')) {
    this.isFavorite = this.isImportant;
  }
  next();
});

// Compound indexes for high performance queries
documentSchema.index({ userId: 1, deletedAt: 1, createdAt: -1 });
documentSchema.index({ userId: 1, category: 1, deletedAt: 1 });
documentSchema.index({ userId: 1, folderId: 1, deletedAt: 1 });
documentSchema.index({ userId: 1, isFavorite: 1, deletedAt: 1 });
documentSchema.index({ userId: 1, isImportant: 1, deletedAt: 1 });
documentSchema.index({ userId: 1, subcategory: 1, deletedAt: 1 });

module.exports = mongoose.model('Document', documentSchema);
