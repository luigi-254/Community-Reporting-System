import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import { assignReport, reassignReport, getAssignments, getAssignmentHistory } from '../controllers/assignmentController.js';
import { assignReportSchema, assignmentQuerySchema } from '../validators/assignmentValidator.js';

const router = express.Router();
const admin = [authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN')];
router.get('/', ...admin, validate(assignmentQuerySchema, 'query'), getAssignments);
router.get('/history/:reportId', ...admin, getAssignmentHistory);
router.post('/', ...admin, validate(assignReportSchema), assignReport);
router.put('/:reportId/reassign', ...admin, validate(assignReportSchema.omit({ reportId: true })), reassignReport);
export default router;