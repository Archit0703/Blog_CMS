const { validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const BlogPost = require('../models/BlogPost');

// Create new comment
const createComment = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
        success: false
      });
    }

    const { content, postId, parentCommentId } = req.body;

    // Check if post exists and is published
    const post = await BlogPost.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        success: false
      });
    }

    if (post.status !== 'published') {
      return res.status(400).json({
        message: 'Cannot comment on unpublished posts',
        success: false
      });
    }

    // If replying to a comment, check if parent comment exists
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({
          message: 'Parent comment not found',
          success: false
        });
      }

      if (parentComment.post.toString() !== postId) {
        return res.status(400).json({
          message: 'Parent comment does not belong to this post',
          success: false
        });
      }
    }

    // Create new comment
    const comment = new Comment({
      content,
      author: req.user._id,
      post: postId,
      parentComment: parentCommentId || null,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || ''
    });

    await comment.save();

    // Populate author information
    await comment.populate('author', 'username firstName lastName avatar');

    res.status(201).json({
      message: 'Comment created successfully',
      success: true,
      data: {
        comment: comment.getPublicData()
      }
    });

  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      message: 'Failed to create comment',
      success: false
    });
  }
};

// Get comments for a post
const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      sort = 'newest',
      includeReplies = true 
    } = req.query;

    // Check if post exists
    const post = await BlogPost.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        success: false
      });
    }

    // Build query options
    const options = {
      includeReplies: includeReplies === 'true',
      sort: sort === 'oldest' ? 'oldest' : 'newest'
    };

    // Get comments
    const comments = await Comment.findByPost(postId, options)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Comment.countDocuments({ 
      post: postId, 
      status: 'approved',
      parentComment: options.includeReplies ? undefined : null
    });

    // Add like status for authenticated users
    const commentsWithLikeStatus = comments.map(comment => {
      const commentData = comment.getPublicData();
      if (req.user) {
        commentData.isLiked = comment.likes.some(like => 
          like.user.toString() === req.user._id.toString()
        );
      }
      return commentData;
    });

    res.json({
      message: 'Comments retrieved successfully',
      success: true,
      data: {
        comments: commentsWithLikeStatus,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      message: 'Failed to retrieve comments',
      success: false
    });
  }
};

// Update comment
const updateComment = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
        success: false
      });
    }

    const { id } = req.params;
    const { content } = req.body;

    // Find the comment
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        message: 'Comment not found',
        success: false
      });
    }

    // Check ownership or admin rights
    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied',
        success: false
      });
    }

    // Update comment
    comment.content = content;
    await comment.save();

    // Populate author information
    await comment.populate('author', 'username firstName lastName avatar');

    res.json({
      message: 'Comment updated successfully',
      success: true,
      data: {
        comment: comment.getPublicData()
      }
    });

  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      message: 'Failed to update comment',
      success: false
    });
  }
};

// Delete comment
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the comment
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        message: 'Comment not found',
        success: false
      });
    }

    // Check ownership or admin rights
    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied',
        success: false
      });
    }

    // Delete the comment (this will also delete replies via pre-remove middleware)
    await Comment.findByIdAndDelete(id);

    res.json({
      message: 'Comment deleted successfully',
      success: true
    });

  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      message: 'Failed to delete comment',
      success: false
    });
  }
};

// Toggle like on a comment
const toggleCommentLike = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        message: 'Comment not found',
        success: false
      });
    }

    // Only allow liking approved comments
    if (comment.status !== 'approved') {
      return res.status(400).json({
        message: 'Cannot like unapproved comments',
        success: false
      });
    }

    await comment.toggleLike(req.user._id);

    res.json({
      message: 'Like toggled successfully',
      success: true,
      data: {
        likesCount: comment.likes.length,
        isLiked: comment.likes.some(like => 
          like.user.toString() === req.user._id.toString()
        )
      }
    });

  } catch (error) {
    console.error('Toggle comment like error:', error);
    res.status(500).json({
      message: 'Failed to toggle like',
      success: false
    });
  }
};

// Moderate comment (admin only)
const moderateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected', 'spam'].includes(status)) {
      return res.status(400).json({
        message: 'Invalid status',
        success: false
      });
    }

    const comment = await Comment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('author', 'username firstName lastName avatar');

    if (!comment) {
      return res.status(404).json({
        message: 'Comment not found',
        success: false
      });
    }

    res.json({
      message: 'Comment moderated successfully',
      success: true,
      data: {
        comment: comment.getPublicData()
      }
    });

  } catch (error) {
    console.error('Moderate comment error:', error);
    res.status(500).json({
      message: 'Failed to moderate comment',
      success: false
    });
  }
};

// Get comment statistics for a post
const getCommentStats = async (req, res) => {
  try {
    const { postId } = req.params;

    // Check if post exists
    const post = await BlogPost.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        success: false
      });
    }

    const stats = await Comment.getStats(postId);

    // Format stats
    const formattedStats = {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      spam: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
      formattedStats.total += stat.count;
    });

    res.json({
      message: 'Comment statistics retrieved successfully',
      success: true,
      data: {
        stats: formattedStats
      }
    });

  } catch (error) {
    console.error('Get comment stats error:', error);
    res.status(500).json({
      message: 'Failed to retrieve comment statistics',
      success: false
    });
  }
};

module.exports = {
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment,
  toggleCommentLike,
  moderateComment,
  getCommentStats
};

