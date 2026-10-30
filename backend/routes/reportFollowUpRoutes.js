import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import { createFollowUp, getFollowUps } from '../controllers/reportFollowUpController.js';
import { createFollowUpSchema } from '../validators/reportFollowUpValidator.js';
import {
  ADMIN_ROLES, WARD_SCOPED_ROLES, DEPARTMENT_SCOPED_ROLES, STATUS_CHANGE_ROLES,
} from '../services/jurisdiction.js';

const router = express.Router();
const followUpWriteRoles = [...new Set([...STATUS_CHANGE_ROLES, 'WARD_ADMIN', 'SUBCOUNTY_ADMIN'])];
const followUpReadRoles = [...new Set([...ADMIN_ROLES, ...WARD_SCOPED_ROLES, ...DEPARTMENT_SCOPED_ROLES])];

router.post(
  '/',
  ...[authenticate, authorizeRoles(...followUpWriteRoles), validate(createFollowUpSchema)],
  createFollowUp
);
router.get(
  '/',
  ...[authenticate, authorizeRoles(...followUpReadRoles)],
  getFollowUps
);

export default router;
