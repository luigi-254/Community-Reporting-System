import express from 'express';
import {
  createOfficer,
  getOfficers,
  getOfficer,
  updateOfficer,
  activateOfficer,
  deactivateOfficer,
} from '../controllers/officerController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import {
  createOfficerSchema,
  updateOfficerSchema,
  officerQuerySchema,
} from '../validators/officerValidator.js';

const router = express.Router();
const adminOnly = [authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN')];
const getRoute = (path, ...handlers) => {
  router.get(path, ...handlers);
  router.get(`/api/officers${path === '/' ? '' : path}`, ...handlers);
};
const postRoute = (path, ...handlers) => {
  router.post(path, ...handlers);
  router.post(`/api/officers${path === '/' ? '' : path}`, ...handlers);
};
const putRoute = (path, ...handlers) => {
  router.put(path, ...handlers);
  router.put(`/api/officers${path === '/' ? '' : path}`, ...handlers);
};

getRoute('/', validate(officerQuerySchema, 'query'), ...adminOnly, getOfficers);
getRoute('/:id', ...adminOnly, getOfficer);
postRoute('/', ...adminOnly, validate(createOfficerSchema), createOfficer);
putRoute('/:id', ...adminOnly, validate(updateOfficerSchema), updateOfficer);
putRoute('/:id/activate', ...adminOnly, activateOfficer);
putRoute('/:id/deactivate', ...adminOnly, deactivateOfficer);

export default router;