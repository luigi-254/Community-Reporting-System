import express from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/authMiddleware.js';
import { uploadImage } from '../controllers/uploadController.js';

const router = express.Router();

// Memory storage so we can stream the buffer to Cloudinary (no disk write).
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Use JPEG, PNG, WebP, or GIF.`), false);
    }
  },
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
});

router.post('/upload-image', authenticate, upload.single('image'), uploadImage);

export default router;
