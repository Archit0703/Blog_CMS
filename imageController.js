const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

// Upload single image
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No image file provided',
        success: false
      });
    }

    // Image is already uploaded to Cloudinary via multer middleware
    const imageData = {
      url: req.file.path,
      publicId: req.file.filename,
      width: req.file.width,
      height: req.file.height,
      format: req.file.format,
      size: req.file.size
    };

    res.json({
      message: 'Image uploaded successfully',
      success: true,
      data: {
        image: imageData
      }
    });

  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      message: 'Failed to upload image',
      success: false
    });
  }
};

// Upload multiple images
const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: 'No image files provided',
        success: false
      });
    }

    // Process uploaded images
    const images = req.files.map(file => ({
      url: file.path,
      publicId: file.filename,
      width: file.width,
      height: file.height,
      format: file.format,
      size: file.size
    }));

    res.json({
      message: 'Images uploaded successfully',
      success: true,
      data: {
        images
      }
    });

  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({
      message: 'Failed to upload images',
      success: false
    });
  }
};

// Delete image from Cloudinary
const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        message: 'Public ID is required',
        success: false
      });
    }

    // Delete from Cloudinary
    const result = await deleteFromCloudinary(publicId);

    if (result.result === 'ok') {
      res.json({
        message: 'Image deleted successfully',
        success: true
      });
    } else {
      res.status(400).json({
        message: 'Failed to delete image',
        success: false
      });
    }

  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      message: 'Failed to delete image',
      success: false
    });
  }
};

// Upload image from URL (for rich text editor)
const uploadImageFromUrl = async (req, res) => {
  try {
    const { imageUrl, alt = '', caption = '' } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        message: 'Image URL is required',
        success: false
      });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(imageUrl, {
      folder: 'blog-cms/editor-uploads'
    });

    const imageData = {
      url: result.url,
      publicId: result.publicId,
      alt,
      caption,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.size
    };

    res.json({
      message: 'Image uploaded successfully',
      success: true,
      data: {
        image: imageData
      }
    });

  } catch (error) {
    console.error('Upload image from URL error:', error);
    res.status(500).json({
      message: 'Failed to upload image',
      success: false
    });
  }
};

module.exports = {
  uploadImage,
  uploadImages,
  deleteImage,
  uploadImageFromUrl
};

