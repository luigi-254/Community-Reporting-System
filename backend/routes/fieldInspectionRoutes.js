import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import {
  createInspection, getInspections, getInspection, updateInspection,
} from '../controllers/fieldInspectionController.js';
import {
  createInspectionSchema, updateInspectionSchema, inspectionQuerySchema,
} from '../validators/fieldInspectionValidator.js';
import {
  ADMIN_ROLES, WARD_SCOPED_ROLES, DEPARTMENT_SCOPED_ROLES,
} from '../services/jurisdiction.js';

const router = express.Router();
const inspectionWriteRoles = ['FIELD_OFFICER'];
const inspectionReadRoles = [...new Set([...ADMIN_ROLES, ...WARD_SCOPED_ROLES, ...DEPARTMENT_SCOPED_ROLES, 'FIELD_OFFICER'])];

router.post(
  '/',
  ...[authenticate, authorizeRoles(...inspectionWriteRoles), validate(createInspectionSchema)],
  createInspection
);
router.get(
  '/',
  ...[authenticate, authorizeRoles(...inspectionReadRoles), validate(inspectionQuerySchema, 'query')],
  getInspections
);
router.get(
  '/:id',
  ...[authenticate, authorizeRoles(...inspectionReadRoles)],
  getInspection
);
router.patch(
  '/:id',
  ...[authenticate, authorizeRoles(...inspectionWriteRoles), validate(updateInspectionSchema)],
  updateInspection
);

export default router;
