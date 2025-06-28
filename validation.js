const { body } = require('express-validator');

// Validation for user registration
const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters')
];

// Validation for user login
const validateLogin = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email or username is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation for profile update
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  
  body('socialLinks.website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),
  
  body('socialLinks.twitter')
    .optional()
    .matches(/^https?:\/\/(www\.)?twitter\.com\/[a-zA-Z0-9_]+$/)
    .withMessage('Twitter must be a valid Twitter profile URL'),
  
  body('socialLinks.linkedin')
    .optional()
    .matches(/^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+$/)
    .withMessage('LinkedIn must be a valid LinkedIn profile URL'),
  
  body('socialLinks.github')
    .optional()
    .matches(/^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9-]+$/)
    .withMessage('GitHub must be a valid GitHub profile URL')
];

// Validation for password change
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// Validation for refresh token
const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

module.exports = {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validateRefreshToken
};


// Validation for blog post creation
const validateCreatePost = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  
  body('content')
    .notEmpty()
    .withMessage('Content is required'),
  
  body('excerpt')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Excerpt cannot exceed 500 characters'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag cannot exceed 50 characters'),
  
  body('categories')
    .optional()
    .isArray()
    .withMessage('Categories must be an array'),
  
  body('categories.*')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Each category cannot exceed 100 characters'),
  
  body('isMarkdown')
    .optional()
    .isBoolean()
    .withMessage('isMarkdown must be a boolean'),
  
  body('seo.metaTitle')
    .optional()
    .isLength({ max: 60 })
    .withMessage('Meta title cannot exceed 60 characters'),
  
  body('seo.metaDescription')
    .optional()
    .isLength({ max: 160 })
    .withMessage('Meta description cannot exceed 160 characters'),
  
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date'),
  
  body('featuredImage.url')
    .optional()
    .isURL()
    .withMessage('Featured image URL must be valid'),
  
  body('featuredImage.alt')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Featured image alt text cannot exceed 200 characters')
];

// Validation for blog post update
const validateUpdatePost = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  
  body('content')
    .optional()
    .notEmpty()
    .withMessage('Content cannot be empty'),
  
  body('excerpt')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Excerpt cannot exceed 500 characters'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag cannot exceed 50 characters'),
  
  body('categories')
    .optional()
    .isArray()
    .withMessage('Categories must be an array'),
  
  body('categories.*')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Each category cannot exceed 100 characters'),
  
  body('isMarkdown')
    .optional()
    .isBoolean()
    .withMessage('isMarkdown must be a boolean'),
  
  body('seo.metaTitle')
    .optional()
    .isLength({ max: 60 })
    .withMessage('Meta title cannot exceed 60 characters'),
  
  body('seo.metaDescription')
    .optional()
    .isLength({ max: 160 })
    .withMessage('Meta description cannot exceed 160 characters'),
  
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date'),
  
  body('featuredImage.url')
    .optional()
    .isURL()
    .withMessage('Featured image URL must be valid'),
  
  body('featuredImage.alt')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Featured image alt text cannot exceed 200 characters')
];

module.exports = {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validateRefreshToken,
  validateCreatePost,
  validateUpdatePost
};


// Validation for comment creation
const validateCreateComment = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),
  
  body('postId')
    .notEmpty()
    .withMessage('Post ID is required')
    .isMongoId()
    .withMessage('Invalid post ID'),
  
  body('parentCommentId')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent comment ID')
];

// Validation for comment update
const validateUpdateComment = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters')
];

// Validation for comment moderation
const validateModerateComment = [
  body('status')
    .isIn(['pending', 'approved', 'rejected', 'spam'])
    .withMessage('Status must be pending, approved, rejected, or spam')
];

module.exports = {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validateRefreshToken,
  validateCreatePost,
  validateUpdatePost,
  validateCreateComment,
  validateUpdateComment,
  validateModerateComment
};

