const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a folder name'],
      trim: true,
    },
    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true,
    },
    color: {
      type: String,
      default: '#4F46E5',
    },
    icon: {
      type: String,
      default: 'folder',
    },
  },
  {
    timestamps: true,
  }
);

folderSchema.index({ userId: 1, parentFolderId: 1, name: 1 });

module.exports = mongoose.model('Folder', folderSchema);
