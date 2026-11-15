const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a category name'],
      trim: true,
    },
    icon: {
      type: String,
      default: 'folder',
    },
    color: {
      type: String,
      default: '#4F46E5',
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    subcategories: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
