import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import {
  getDashboardOverview, getDashboardReports, getDashboardCategories,
  getDashboardDepartments, getDashboardWards, getDashboardPerformance,
  getDashboardEscalations,
} from '../controllers/dashboardController.js';

const router = express.Router();
router.use(authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'OFFICER'));
router.get('/overview', getDashboardOverview);
router.get('/reports', getDashboardReports);
router.get('/categories', getDashboardCategories);
router.get('/departments', getDashboardDepartments);
router.get('/wards', getDashboardWards);
router.get('/performance', getDashboardPerformance);
router.get('/escalations', getDashboardEscalations);
export default router;
