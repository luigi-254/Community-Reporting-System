import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import { getEscalatedReports, getEscalation, getOverdueReports, autoEscalateOverdue, manuallyEscalate, resolveEscalation } from '../controllers/escalationController.js';
import { manuallyEscalateSchema, resolveEscalationSchema } from '../validators/escalationValidator.js';
import { ADMIN_ROLES, WARD_SCOPED_ROLES, DEPARTMENT_SCOPED_ROLES, STATUS_CHANGE_ROLES } from '../services/jurisdiction.js';

const router = express.Router();
const escalationReadRoles = [...new Set([...ADMIN_ROLES, ...WARD_SCOPED_ROLES, ...DEPARTMENT_SCOPED_ROLES])];
const escalationWriteRoles = [...STATUS_CHANGE_ROLES];

router.get('/', ...[authenticate, authorizeRoles(...escalationReadRoles)], getEscalatedReports);
router.get('/overdue', ...[authenticate, authorizeRoles(...escalationReadRoles)], getOverdueReports);
router.post('/auto-escalate', ...[authenticate, authorizeRoles(...escalationWriteRoles)], autoEscalateOverdue);
router.get('/:id', ...[authenticate, authorizeRoles(...escalationReadRoles)], getEscalation);
router.post('/', ...[authenticate, authorizeRoles(...escalationWriteRoles)], validate(manuallyEscalateSchema), manuallyEscalate);
router.patch('/:id/resolve', ...[authenticate, authorizeRoles(...escalationWriteRoles)], validate(resolveEscalationSchema), resolveEscalation);
export default router;