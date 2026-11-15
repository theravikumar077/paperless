const mongoose = require('mongoose');

const shareLinkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    allowDownload: {
      type: Boolean,
      default: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    accessCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

shareLinkSchema.virtual('ownerId').get(function () {
  return this.userId;
});

module.exports = mongoose.model('ShareLink', shareLinkSchema);
