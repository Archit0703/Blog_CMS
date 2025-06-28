const express = require('express');
const router = express.Router();

const commentController = require('../controllers/commentController');
const analyticsController = require('../controllers/analyticsController');
const { auth, optionalAuth, adminAuth } = require('../middleware/auth');
const { 
  validateCreateComment, 
  validateUpdateComment, 
  validateModerateComment 
} = require('../middleware/validation');

// Comment routes
router.get('/post/:postId', optionalAuth, commentController.getCommentsByPost);
router.post('/', auth, validateCreateComment, commentController.createComment);
router.put('/:id', auth, validateUpdateComment, commentController.updateComment);
router.delete('/:id', auth, commentController.deleteComment);
router.post('/:id/like', auth, commentController.toggleCommentLike);

// Comment moderation (admin only)
router.put('/:id/moderate', auth, adminAuth, validateModerateComment, commentController.moderateComment);
router.get('/post/:postId/stats', auth, commentController.getCommentStats);

// Analytics routes
router.post('/analytics/:postId/view', optionalAuth, analyticsController.recordView);
router.put('/analytics/:postId/metrics', optionalAuth, analyticsController.updateViewMetrics);
router.get('/analytics/:postId', auth, analyticsController.getPostAnalytics);
router.get('/analytics/dashboard/overview', auth, analyticsController.getDashboardAnalytics);

// Health check route
router.get('/health', (req, res) => {
  res.json({ 
    message: 'Comments and Analytics service is running',
    timestamp: new Date().toISOString(),
    success: true 
  });
});

module.exports = router;

