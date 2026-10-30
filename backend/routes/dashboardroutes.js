import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import {
  getDashboardOverview, getDashboardReports, getDashboardCategories,
  getDashboardDepartments, getDashboardWards, getDashboardPerformance,
  getDashboardEscalations,
} from '../controllers/dashboardController.js';
import { ADMIN_ROLES, WARD_SCOPED_ROLES, DEPARTMENT_SCOPED_ROLES } from '../services/jurisdiction.js';

const router = express.Router();
const dashboardRoles = [...new Set([...ADMIN_ROLES, ...WARD_SCOPED_ROLES, ...DEPARTMENT_SCOPED_ROLES])];
router.use(authenticate, authorizeRoles(...dashboardRoles));
router.get('/overview', getDashboardOverview);
router.get('/reports', getDashboardReports);
router.get('/categories', getDashboardCategories);
router.get('/departments', getDashboardDepartments);
router.get('/wards', getDashboardWards);
router.get('/performance', getDashboardPerformance);
router.get('/escalations', getDashboardEscalations);
export default router;
