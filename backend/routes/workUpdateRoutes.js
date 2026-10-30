import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import {
  createWorkUpdate, getWorkUpdates, getWorkUpdate, updateWorkUpdate,
} from '../controllers/workUpdateController.js';
import { createWorkUpdateSchema, updateWorkUpdateSchema, workUpdateQuerySchema } from '../validators/workUpdateValidator.js';
import {
  ADMIN_ROLES, WARD_SCOPED_ROLES, DEPARTMENT_SCOPED_ROLES,
} from '../services/jurisdiction.js';

const router = express.Router();
const workUpdateWriteRoles = ['FIELD_OFFICER'];
const workUpdateReadRoles = [...new Set([...ADMIN_ROLES, ...WARD_SCOPED_ROLES, ...DEPARTMENT_SCOPED_ROLES, 'FIELD_OFFICER'])];

router.post(
  '/',
  ...[authenticate, authorizeRoles(...workUpdateWriteRoles), validate(createWorkUpdateSchema)],
  createWorkUpdate
);
router.get(
  '/',
  ...[authenticate, authorizeRoles(...workUpdateReadRoles), validate(workUpdateQuerySchema, 'query')],
  getWorkUpdates
);
router.get(
  '/:id',
  ...[authenticate, authorizeRoles(...workUpdateReadRoles)],
  getWorkUpdate
);
router.patch(
  '/:id',
  ...[authenticate, authorizeRoles(...workUpdateWriteRoles), validate(updateWorkUpdateSchema)],
  updateWorkUpdate
);

export default router;
