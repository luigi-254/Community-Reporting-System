import { uploadToCloudinary } from '../utils/cloudinary.js';

export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No image file provided.',
      });
    }

    const buffer = req.file.buffer;

    const result = await uploadToCloudinary(buffer, {
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' },
        { width: 1600, crop: 'limit' },
      ],
    });

    return res.status(200).json({
      status: 'success',
      message: 'Image uploaded successfully.',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  uploadImage,
};
