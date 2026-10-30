import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import { assignReport, reassignReport, getAssignments, getAssignmentHistory } from '../controllers/assignmentController.js';
import { assignReportSchema, assignmentQuerySchema } from '../validators/assignmentValidator.js';
import { ADMIN_ROLES, WARD_SCOPED_ROLES, DEPARTMENT_SCOPED_ROLES, STATUS_CHANGE_ROLES } from '../services/jurisdiction.js';

const router = express.Router();
const assignmentReadRoles = [...new Set([...ADMIN_ROLES, ...WARD_SCOPED_ROLES, ...DEPARTMENT_SCOPED_ROLES])];
const assignmentWriteRoles = [...STATUS_CHANGE_ROLES];

router.get('/', ...[authenticate, authorizeRoles(...assignmentReadRoles)], validate(assignmentQuerySchema, 'query'), getAssignments);
router.get('/history/:reportId', ...[authenticate, authorizeRoles(...assignmentReadRoles)], getAssignmentHistory);
router.post('/', ...[authenticate, authorizeRoles(...assignmentWriteRoles)], validate(assignReportSchema), assignReport);
router.put('/:reportId/reassign', ...[authenticate, authorizeRoles(...assignmentWriteRoles)], validate(assignReportSchema.omit({ reportId: true })), reassignReport);
export default router;