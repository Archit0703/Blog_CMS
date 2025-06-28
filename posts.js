const express = require('express');
const router = express.Router();

const blogController = require('../controllers/blogController');
const imageController = require('../controllers/imageController');
const { auth, optionalAuth, requireOwnershipOrAdmin } = require('../middleware/auth');
const { validateCreatePost, validateUpdatePost } = require('../middleware/validation');
const { uploadSingle, uploadMultiple } = require('../utils/cloudinary');

// Public routes (no authentication required)
router.get('/', optionalAuth, blogController.getPosts);
router.get('/popular', optionalAuth, blogController.getPopularPosts);
router.get('/recent', optionalAuth, blogController.getRecentPosts);
router.get('/slug/:slug', optionalAuth, blogController.getPostBySlug);
router.get('/categories', blogController.getCategories);

// Protected routes (authentication required)
router.post('/', auth, validateCreatePost, blogController.createPost);
router.put('/:id', auth, validateUpdatePost, blogController.updatePost);
router.delete('/:id', auth, blogController.deletePost);
router.post('/:id/like', auth, blogController.toggleLike);

// Image upload routes
router.post('/images/upload', auth, uploadSingle, imageController.uploadImage);
router.post('/images/upload-multiple', auth, uploadMultiple, imageController.uploadImages);
router.post('/images/upload-url', auth, imageController.uploadImageFromUrl);
router.delete('/images/:publicId', auth, imageController.deleteImage);

// Health check route
router.get('/health', (req, res) => {
  res.json({ 
    message: 'Posts service is running',
    timestamp: new Date().toISOString(),
    success: true 
  });
});

module.exports = router;

