import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import { getEscalatedReports, getEscalation, getOverdueReports, autoEscalateOverdue, manuallyEscalate, resolveEscalation } from '../controllers/escalationController.js';
import { manuallyEscalateSchema, resolveEscalationSchema } from '../validators/escalationValidator.js';

const router = express.Router();
const government = [authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'OFFICER')];
router.get('/', ...government, getEscalatedReports);
router.get('/overdue', ...government, getOverdueReports);
router.post('/auto-escalate', ...government, autoEscalateOverdue);
router.get('/:id', ...government, getEscalation);
router.post('/', ...government, validate(manuallyEscalateSchema), manuallyEscalate);
router.patch('/:id/resolve', ...government, validate(resolveEscalationSchema), resolveEscalation);
export default router;