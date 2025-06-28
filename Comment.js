const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BlogPost',
    required: true,
    index: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'spam'],
    default: 'approved',
    index: true
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for better query performance
commentSchema.index({ post: 1, status: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, createdAt: 1 });
commentSchema.index({ 'likes.user': 1 });

// Pre-save middleware to handle replies
commentSchema.pre('save', async function(next) {
  // If this is a reply to another comment
  if (this.isNew && this.parentComment) {
    try {
      // Add this comment to the parent's replies array
      await this.constructor.findByIdAndUpdate(
        this.parentComment,
        { $addToSet: { replies: this._id } }
      );
    } catch (error) {
      return next(error);
    }
  }
  
  // Set edited timestamp if content is modified
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  
  next();
});

// Pre-remove middleware to clean up replies
commentSchema.pre('findOneAndDelete', async function(next) {
  try {
    const comment = await this.model.findOne(this.getQuery());
    
    if (comment) {
      // Remove this comment from parent's replies if it's a reply
      if (comment.parentComment) {
        await this.model.findByIdAndUpdate(
          comment.parentComment,
          { $pull: { replies: comment._id } }
        );
      }
      
      // Delete all replies to this comment
      await this.model.deleteMany({ parentComment: comment._id });
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to toggle like
commentSchema.methods.toggleLike = function(userId) {
  const existingLike = this.likes.find(like => like.user.toString() === userId.toString());
  
  if (existingLike) {
    // Remove like
    this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
  } else {
    // Add like
    this.likes.push({ user: userId });
  }
  
  return this.save();
};

// Instance method to get public data
commentSchema.methods.getPublicData = function() {
  const commentObject = this.toObject();
  return {
    ...commentObject,
    likesCount: this.likes.length,
    isLiked: false // This will be set based on current user
  };
};

// Static method to find comments for a post
commentSchema.statics.findByPost = function(postId, options = {}) {
  const query = { 
    post: postId, 
    status: options.includeAll ? { $in: ['pending', 'approved'] } : 'approved'
  };
  
  // Only get top-level comments (not replies)
  if (!options.includeReplies) {
    query.parentComment = null;
  }
  
  return this.find(query)
    .populate('author', 'username firstName lastName avatar')
    .populate({
      path: 'replies',
      populate: {
        path: 'author',
        select: 'username firstName lastName avatar'
      }
    })
    .sort({ createdAt: options.sort === 'oldest' ? 1 : -1 });
};

// Static method to get comment statistics
commentSchema.statics.getStats = function(postId) {
  return this.aggregate([
    { $match: { post: mongoose.Types.ObjectId(postId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Comment', commentSchema);

