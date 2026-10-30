import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import {
  createOfficial,
  getOfficials,
  getOfficial,
  updateOfficial,
  deactivateOfficial,
} from '../controllers/officialController.js';
import { officialSchema, officialQuerySchema } from '../validators/officialValidator.js';

const router = express.Router();

const officialAdmin = [
  authenticate,
  authorizeRoles(
    'ADMIN',
    'SUPER_ADMIN',
    'GOVERNOR',
    'CECM',
    'CHIEF_OFFICER'
  ),
];

router.get(
  '/',
  ...officialAdmin,
  validate(officialQuerySchema, 'query'),
  getOfficials
);
router.get('/:id', ...officialAdmin, getOfficial);
router.post(
  '/',
  ...officialAdmin,
  validate(officialSchema),
  createOfficial
);
router.put(
  '/:id',
  ...officialAdmin,
  validate(officialSchema),
  updateOfficial
);
router.put(
  '/:id/deactivate',
  ...officialAdmin,
  deactivateOfficial
);
export default router;
