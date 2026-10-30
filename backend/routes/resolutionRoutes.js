import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import {
  createResolutionSubmission, getResolutionSubmissions, approveResolution, rejectResolution,
} from '../controllers/resolutionController.js';
import { createResolutionSubmissionSchema } from '../validators/resolutionValidator.js';
import {
  ADMIN_ROLES, WARD_SCOPED_ROLES, DEPARTMENT_SCOPED_ROLES,
} from '../services/jurisdiction.js';

const router = express.Router();
const resolutionWriteRoles = [
  'FIELD_OFFICER', 'TECHNICAL_SUPERVISOR', 'TECHNICAL_HEAD', 'CHIEF_OFFICER', 'CECM', 'GOVERNOR', 'ADMIN', 'SUPER_ADMIN',
];
const resolutionReadRoles = [...new Set([...ADMIN_ROLES, ...WARD_SCOPED_ROLES, ...DEPARTMENT_SCOPED_ROLES])];
const resolutionApproveRoles = ['TECHNICAL_HEAD', 'CHIEF_OFFICER', 'CECM', 'GOVERNOR', 'ADMIN', 'SUPER_ADMIN'];

router.post(
  '/',
  ...[authenticate, authorizeRoles(...resolutionWriteRoles), validate(createResolutionSubmissionSchema)],
  createResolutionSubmission
);
router.get(
  '/',
  ...[authenticate, authorizeRoles(...resolutionReadRoles)],
  getResolutionSubmissions
);
router.patch(
  '/:id/approve',
  ...[authenticate, authorizeRoles(...resolutionApproveRoles)],
  approveResolution
);
router.patch(
  '/:id/reject',
  ...[authenticate, authorizeRoles(...resolutionApproveRoles)],
  rejectResolution
);

export default router;
