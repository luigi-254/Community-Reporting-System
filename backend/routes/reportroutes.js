import express from 'express';

import {
  createReport,
  getReports,
  getReport,
  getMyReports,
  updateReport,
  deleteReport,
  changeStatus,
  acceptResolution,
  rejectResolution,
  searchReports,
  filterReports,
} from '../controllers/reportController.js';

import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import { uploadMedia } from '../middlewares/uploadMiddlewares.js';

import {
  createReportSchema,
  updateReportSchema,
  changeStatusSchema,
  acceptResolutionSchema,
  rejectResolutionSchema,
} from '../validators/reportValidator.js';

const router = express.Router();
const getRoute = (path, ...handlers) => {
  router.get(path, ...handlers);
  router.get(`/api/reports${path === '/' ? '' : path}`, ...handlers);
};

const postRoute = (path, ...handlers) => {
  router.post(path, ...handlers);
  router.post(`/api/reports${path === '/' ? '' : path}`, ...handlers);
};

const putRoute = (path, ...handlers) => {
  router.put(path, ...handlers);
  router.put(`/api/reports${path === '/' ? '' : path}`, ...handlers);
};

const patchRoute = (path, ...handlers) => {
  router.patch(path, ...handlers);
  router.patch(`/api/reports${path === '/' ? '' : path}`, ...handlers);
};

const deleteRoute = (path, ...handlers) => {
  router.delete(path, ...handlers);
  router.delete(`/api/reports${path === '/' ? '' : path}`, ...handlers);
};

getRoute('/me', authenticate, getMyReports);
getRoute('/search', searchReports);
getRoute('/filter', filterReports);
getRoute('/', getReports);
postRoute(
  '/',
  authenticate,
  uploadMedia.array('media', 5),
  validate(createReportSchema),
  createReport
);
getRoute('/:id', getReport);
putRoute(
  '/:id',
  authenticate,
  uploadMedia.array('media', 5),
  validate(updateReportSchema),
  updateReport
);
patchRoute(
  '/:id',
  authenticate,
  uploadMedia.array('media', 5),
  validate(updateReportSchema),
  updateReport
);
deleteRoute('/:id', authenticate, deleteReport);
patchRoute(
  '/:id/status',
  authenticate,
  authorizeRoles('OFFICER', 'ADMIN', 'SUPER_ADMIN'),
  validate(changeStatusSchema),
  changeStatus
);
putRoute(
  '/:id/status',
  authenticate,
  authorizeRoles('OFFICER', 'ADMIN', 'SUPER_ADMIN'),
  validate(changeStatusSchema),
  changeStatus
);
postRoute(
  '/:id/accept-resolution',
  authenticate,
  validate(acceptResolutionSchema),
  acceptResolution
);
patchRoute(
  '/:id/accept-resolution',
  authenticate,
  validate(acceptResolutionSchema),
  acceptResolution
);
postRoute(
  '/:id/reject-resolution',
  authenticate,
  validate(rejectResolutionSchema),
  rejectResolution
);
patchRoute(
  '/:id/reject-resolution',
  authenticate,
  validate(rejectResolutionSchema),
  rejectResolution
);

export default router;
