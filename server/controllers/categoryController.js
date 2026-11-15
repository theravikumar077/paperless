const Category = require('../models/Category');
const Document = require('../models/Document');

const PREDEFINED_CATEGORIES = [
  {
    name: 'Identity',
    icon: 'id-card',
    color: '#0284C7',
    subcategories: [
      'Aadhaar Card',
      'PAN Card',
      'Voter ID',
      'Passport',
      'Driving Licence',
      'Birth Certificate',
    ],
  },
  {
    name: 'Education',
    icon: 'graduation-cap',
    color: '#4F46E5',
    subcategories: [
      '10th Marksheet',
      '12th Marksheet',
      'Graduation Documents',
      'Semester 1',
      'Semester 2',
      'Semester 3',
      'Semester 4',
      'Semester 5',
      'Semester 6',
      'Semester 7',
      'Semester 8',
      'Degree Certificate',
      'Migration Certificate',
      'Transfer Certificate',
      'Character Certificate',
    ],
  },
  {
    name: 'Financial',
    icon: 'credit-card',
    color: '#059669',
    subcategories: [
      'Bank Statements',
      'Passbook',
      'Cheque Documents',
      'Insurance',
      'Loan Documents',
      'Tax Documents',
    ],
  },
  {
    name: 'Medical',
    icon: 'heart-pulse',
    color: '#E11D48',
    subcategories: [
      'Medical Reports',
      'Prescriptions',
      'Health Certificates',
      'Blood Reports',
    ],
  },
  {
    name: 'Personal',
    icon: 'user',
    color: '#8B5CF6',
    subcategories: [
      'Family Documents',
      'Address Proof',
      'Personal Certificates',
      'Rental Agreements',
    ],
  },
  {
    name: 'Screenshots',
    icon: 'image',
    color: '#EC4899',
    subcategories: [
      'Payment Screenshots',
      'Transaction Receipts',
      'Important Photos',
      'Online Application Screenshots',
    ],
  },
  {
    name: 'Certificates',
    icon: 'award',
    color: '#D97706',
    subcategories: [
      'Internship Certificates',
      'Experience Letters',
      'Offer Letters',
      'Completion Certificates',
      'Achievement Certificates',
      'Course Certificates',
    ],
  },
  {
    name: 'Other',
    icon: 'folder',
    color: '#64748B',
    subcategories: ['General', 'Miscellaneous', 'Notes'],
  },
];

// @desc    Get all categories for authenticated user (with document count and storage per category)
// @route   GET /api/categories
// @access  Private
exports.getCategories = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get document counts and storage usage per category
    const statsAggregation = await Document.aggregate([
      { $match: { userId, deletedAt: null } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          storageBytes: { $sum: '$fileSize' },
        },
      },
    ]);

    const countMap = {};
    const storageMap = {};
    statsAggregation.forEach((item) => {
      countMap[item._id] = item.count;
      storageMap[item._id] = item.storageBytes;
    });

    // Get custom user categories
    const customCategories = await Category.find({ userId: req.user.id });

    const systemCatsFormatted = PREDEFINED_CATEGORIES.map((cat) => ({
      ...cat,
      isSystem: true,
      count: countMap[cat.name] || 0,
      storageBytes: storageMap[cat.name] || 0,
    }));

    const customCatsFormatted = customCategories.map((cat) => ({
      id: cat._id,
      name: cat.name,
      icon: cat.icon || 'folder',
      color: cat.color || '#4F46E5',
      subcategories: cat.subcategories || [],
      isSystem: false,
      count: countMap[cat.name] || 0,
      storageBytes: storageMap[cat.name] || 0,
    }));

    res.status(200).json({
      success: true,
      data: [...systemCatsFormatted, ...customCatsFormatted],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create custom category
// @route   POST /api/categories
// @access  Private
exports.createCategory = async (req, res, next) => {
  try {
    const { name, icon, color, subcategories } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a category name',
      });
    }

    const trimmedName = name.trim();

    if (PREDEFINED_CATEGORIES.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'A standard category with this name already exists',
      });
    }

    const existing = await Category.findOne({
      userId: req.user.id,
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Custom category already exists',
      });
    }

    const category = await Category.create({
      userId: req.user.id,
      name: trimmedName,
      icon: icon || 'folder',
      color: color || '#4F46E5',
      subcategories: Array.isArray(subcategories) ? subcategories : [],
      isSystem: false,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete custom category
// @route   DELETE /api/categories/:id
// @access  Private
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or cannot be deleted',
      });
    }

    // Move documents under this category to 'Other'
    await Document.updateMany(
      { userId: req.user.id, category: category.name },
      { $set: { category: 'Other', subcategory: '' } }
    );

    await Category.findByIdAndDelete(category._id);

    res.status(200).json({
      success: true,
      message: 'Category deleted. Existing documents reassigned to Other.',
    });
  } catch (error) {
    next(error);
  }
};
