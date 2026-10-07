import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import { getAuditLogs, getAuditLog } from '../controllers/auditlogController.js';
import { auditLogQuerySchema } from '../validators/auditLogValidator.js';

const router = express.Router();
const admin = [authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN')];
router.get('/', ...admin, validate(auditLogQuerySchema, 'query'), getAuditLogs);
router.get('/:id', ...admin, getAuditLog);
export default router;