const mongoose = require('mongoose');
const slugify = require('slugify');

const blogPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  excerpt: {
    type: String,
    maxlength: [500, 'Excerpt cannot exceed 500 characters'],
    default: ''
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  },
  featuredImage: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    alt: { type: String, default: '' }
  },
  images: [{
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, default: '' },
    caption: { type: String, default: '' }
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  categories: [{
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  }],
  readTime: {
    type: Number,
    default: 0 // in minutes
  },
  views: {
    type: Number,
    default: 0,
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
  isMarkdown: {
    type: Boolean,
    default: false
  },
  seo: {
    metaTitle: {
      type: String,
      maxlength: [60, 'Meta title cannot exceed 60 characters']
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description cannot exceed 160 characters']
    },
    keywords: [{
      type: String,
      trim: true,
      lowercase: true
    }]
  },
  publishedAt: {
    type: Date,
    default: null,
    index: true
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
blogPostSchema.index({ author: 1, status: 1 });
blogPostSchema.index({ tags: 1 });
blogPostSchema.index({ categories: 1 });
blogPostSchema.index({ publishedAt: -1 });
blogPostSchema.index({ views: -1 });
blogPostSchema.index({ 'likes.user': 1 });
blogPostSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Generate slug before saving
blogPostSchema.pre('save', async function(next) {
  if (this.isModified('title')) {
    let baseSlug = slugify(this.title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
    
    let slug = baseSlug;
    let counter = 1;
    
    // Ensure slug is unique
    while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  
  // Calculate read time (average 200 words per minute)
  if (this.isModified('content')) {
    const wordCount = this.content.split(/\s+/).length;
    this.readTime = Math.ceil(wordCount / 200);
    this.lastModified = new Date();
  }
  
  // Set published date when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Generate excerpt if not provided
  if (this.isModified('content') && !this.excerpt) {
    // Remove HTML tags and get first 150 characters
    const plainText = this.content.replace(/<[^>]*>/g, '');
    this.excerpt = plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');
  }
  
  next();
});

// Instance method to increment views
blogPostSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Instance method to toggle like
blogPostSchema.methods.toggleLike = function(userId) {
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
blogPostSchema.methods.getPublicData = function() {
  const postObject = this.toObject();
  return {
    ...postObject,
    likesCount: this.likes.length,
    isLiked: false // This will be set based on current user
  };
};

// Static method to find published posts
blogPostSchema.statics.findPublished = function(options = {}) {
  const query = { status: 'published', publishedAt: { $lte: new Date() } };
  
  if (options.author) {
    query.author = options.author;
  }
  
  if (options.tags && options.tags.length > 0) {
    query.tags = { $in: options.tags };
  }
  
  if (options.categories && options.categories.length > 0) {
    query.categories = { $in: options.categories };
  }
  
  if (options.search) {
    query.$text = { $search: options.search };
  }
  
  return this.find(query)
    .populate('author', 'username firstName lastName avatar')
    .sort(options.sort || { publishedAt: -1 });
};

// Static method to get popular posts
blogPostSchema.statics.findPopular = function(limit = 10) {
  return this.find({ status: 'published', publishedAt: { $lte: new Date() } })
    .populate('author', 'username firstName lastName avatar')
    .sort({ views: -1, publishedAt: -1 })
    .limit(limit);
};

// Static method to get recent posts
blogPostSchema.statics.findRecent = function(limit = 10) {
  return this.find({ status: 'published', publishedAt: { $lte: new Date() } })
    .populate('author', 'username firstName lastName avatar')
    .sort({ publishedAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('BlogPost', blogPostSchema);

