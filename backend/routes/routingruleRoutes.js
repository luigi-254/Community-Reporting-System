import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import { createRoutingRule, getRoutingRules, getRoutingRule, updateRoutingRule, deleteRoutingRule } from '../controllers/routingruleController.js';
import { createRoutingRuleSchema, updateRoutingRuleSchema, routingRuleQuerySchema } from '../validators/routingRuleValidator.js';

const router = express.Router();
const admin = [authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN')];
router.get('/', ...admin, validate(routingRuleQuerySchema, 'query'), getRoutingRules);
router.get('/:id', ...admin, getRoutingRule);
router.post('/', ...admin, validate(createRoutingRuleSchema), createRoutingRule);
router.put('/:id', ...admin, validate(updateRoutingRuleSchema), updateRoutingRule);
router.delete('/:id', ...admin, deleteRoutingRule);
export default router;
