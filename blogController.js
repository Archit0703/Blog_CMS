const { validationResult } = require('express-validator');
const { marked } = require('marked');
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const BlogPost = require('../models/BlogPost');
const { deleteFromCloudinary } = require('../utils/cloudinary');

// Create DOMPurify instance for server-side
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Create new blog post
const createPost = async (req, res) => {
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

    const {
      title,
      content,
      excerpt,
      status,
      tags,
      categories,
      isMarkdown,
      seo,
      scheduledAt,
      featuredImage
    } = req.body;

    // Process content based on markdown flag
    let processedContent = content;
    if (isMarkdown) {
      // Convert markdown to HTML
      processedContent = marked(content);
    }
    
    // Sanitize HTML content
    processedContent = purify.sanitize(processedContent);

    // Create new blog post
    const blogPost = new BlogPost({
      title,
      content: processedContent,
      excerpt,
      author: req.user._id,
      status: status || 'draft',
      tags: tags || [],
      categories: categories || [],
      isMarkdown: isMarkdown || false,
      seo: seo || {},
      scheduledAt: scheduledAt || null,
      featuredImage: featuredImage || {}
    });

    await blogPost.save();

    // Populate author information
    await blogPost.populate('author', 'username firstName lastName avatar');

    res.status(201).json({
      message: 'Blog post created successfully',
      success: true,
      data: {
        post: blogPost.getPublicData()
      }
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      message: 'Failed to create blog post',
      success: false
    });
  }
};

// Get all blog posts (with filtering and pagination)
const getPosts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      author,
      tags,
      categories,
      search,
      sort = 'publishedAt',
      order = 'desc'
    } = req.query;

    const query = {};
    
    // Filter by status (default to published for non-admin users)
    if (req.user && req.user.role === 'admin') {
      if (status) query.status = status;
    } else {
      query.status = 'published';
      query.publishedAt = { $lte: new Date() };
    }

    // Filter by author
    if (author) {
      query.author = author;
    }

    // Filter by tags
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      query.tags = { $in: tagArray };
    }

    // Filter by categories
    if (categories) {
      const categoryArray = Array.isArray(categories) ? categories : categories.split(',');
      query.categories = { $in: categoryArray };
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Sorting
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = { [sort]: sortOrder };

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const posts = await BlogPost.find(query)
      .populate('author', 'username firstName lastName avatar')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await BlogPost.countDocuments(query);

    // Add like status for authenticated users
    const postsWithLikeStatus = posts.map(post => {
      const postData = post.getPublicData();
      if (req.user) {
        postData.isLiked = post.likes.some(like => 
          like.user.toString() === req.user._id.toString()
        );
      }
      return postData;
    });

    res.json({
      message: 'Posts retrieved successfully',
      success: true,
      data: {
        posts: postsWithLikeStatus,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      message: 'Failed to retrieve posts',
      success: false
    });
  }
};

// Get single blog post by slug
const getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await BlogPost.findOne({ slug })
      .populate('author', 'username firstName lastName avatar bio socialLinks');

    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        success: false
      });
    }

    // Check if user can view this post
    if (post.status !== 'published' && 
        (!req.user || (req.user._id.toString() !== post.author._id.toString() && req.user.role !== 'admin'))) {
      return res.status(403).json({
        message: 'Access denied',
        success: false
      });
    }

    // Increment views (only for published posts and not for author)
    if (post.status === 'published' && 
        (!req.user || req.user._id.toString() !== post.author._id.toString())) {
      await post.incrementViews();
    }

    // Add like status for authenticated users
    const postData = post.getPublicData();
    if (req.user) {
      postData.isLiked = post.likes.some(like => 
        like.user.toString() === req.user._id.toString()
      );
    }

    res.json({
      message: 'Post retrieved successfully',
      success: true,
      data: {
        post: postData
      }
    });

  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      message: 'Failed to retrieve post',
      success: false
    });
  }
};

// Update blog post
const updatePost = async (req, res) => {
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
    const {
      title,
      content,
      excerpt,
      status,
      tags,
      categories,
      isMarkdown,
      seo,
      scheduledAt,
      featuredImage
    } = req.body;

    // Find the post
    const post = await BlogPost.findById(id);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        success: false
      });
    }

    // Check ownership or admin rights
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied',
        success: false
      });
    }

    // Process content if provided
    let processedContent = content;
    if (content && isMarkdown) {
      processedContent = marked(content);
    }
    if (processedContent) {
      processedContent = purify.sanitize(processedContent);
    }

    // Update fields
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (processedContent !== undefined) updateData.content = processedContent;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (status !== undefined) updateData.status = status;
    if (tags !== undefined) updateData.tags = tags;
    if (categories !== undefined) updateData.categories = categories;
    if (isMarkdown !== undefined) updateData.isMarkdown = isMarkdown;
    if (seo !== undefined) updateData.seo = seo;
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt;
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage;

    // Update the post
    const updatedPost = await BlogPost.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'username firstName lastName avatar');

    res.json({
      message: 'Post updated successfully',
      success: true,
      data: {
        post: updatedPost.getPublicData()
      }
    });

  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      message: 'Failed to update post',
      success: false
    });
  }
};

// Delete blog post
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the post
    const post = await BlogPost.findById(id);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        success: false
      });
    }

    // Check ownership or admin rights
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied',
        success: false
      });
    }

    // Delete associated images from Cloudinary
    const imagesToDelete = [];
    
    if (post.featuredImage && post.featuredImage.publicId) {
      imagesToDelete.push(post.featuredImage.publicId);
    }
    
    if (post.images && post.images.length > 0) {
      post.images.forEach(image => {
        if (image.publicId) {
          imagesToDelete.push(image.publicId);
        }
      });
    }

    // Delete images from Cloudinary
    for (const publicId of imagesToDelete) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (error) {
        console.error(`Failed to delete image ${publicId}:`, error);
      }
    }

    // Delete the post
    await BlogPost.findByIdAndDelete(id);

    res.json({
      message: 'Post deleted successfully',
      success: true
    });

  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      message: 'Failed to delete post',
      success: false
    });
  }
};

// Toggle like on a post
const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await BlogPost.findById(id);
    if (!post) {
      return res.status(404).json({
        message: 'Post not found',
        success: false
      });
    }

    // Only allow liking published posts
    if (post.status !== 'published') {
      return res.status(400).json({
        message: 'Cannot like unpublished posts',
        success: false
      });
    }

    await post.toggleLike(req.user._id);

    res.json({
      message: 'Like toggled successfully',
      success: true,
      data: {
        likesCount: post.likes.length,
        isLiked: post.likes.some(like => 
          like.user.toString() === req.user._id.toString()
        )
      }
    });

  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      message: 'Failed to toggle like',
      success: false
    });
  }
};

// Get popular posts
const getPopularPosts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const posts = await BlogPost.findPopular(parseInt(limit));

    const postsWithLikeStatus = posts.map(post => {
      const postData = post.getPublicData();
      if (req.user) {
        postData.isLiked = post.likes.some(like => 
          like.user.toString() === req.user._id.toString()
        );
      }
      return postData;
    });

    res.json({
      message: 'Popular posts retrieved successfully',
      success: true,
      data: {
        posts: postsWithLikeStatus
      }
    });

  } catch (error) {
    console.error('Get popular posts error:', error);
    res.status(500).json({
      message: 'Failed to retrieve popular posts',
      success: false
    });
  }
};

// Get recent posts
const getRecentPosts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const posts = await BlogPost.findRecent(parseInt(limit));

    const postsWithLikeStatus = posts.map(post => {
      const postData = post.getPublicData();
      if (req.user) {
        postData.isLiked = post.likes.some(like => 
          like.user.toString() === req.user._id.toString()
        );
      }
      return postData;
    });

    res.json({
      message: 'Recent posts retrieved successfully',
      success: true,
      data: {
        posts: postsWithLikeStatus
      }
    });

  } catch (error) {
    console.error('Get recent posts error:', error);
    res.status(500).json({
      message: 'Failed to retrieve recent posts',
      success: false
    });
  }
};

// Get all categories
const getCategories = async (req, res) => {
  try {
    const categories = await BlogPost.distinct('categories');
    
    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories'
    });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPostBySlug,
  updatePost,
  deletePost,
  toggleLike,
  getPopularPosts,
  getRecentPosts,
  getCategories
};

