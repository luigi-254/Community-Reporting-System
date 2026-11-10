import express from 'express';
import {
  createUser,
  getUsers,
  getUser,
  getOfficers,
  updateUser,
  activateUser,
  deactivateUser,
} from '../controllers/userController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import { createUserSchema, updateUserSchema, userQuerySchema } from '../validators/userValidator.js';
import { ADMIN_ROLES, WARD_SCOPED_ROLES, DEPARTMENT_SCOPED_ROLES } from '../services/jurisdiction.js';

const router = express.Router();
const adminOnly = [authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN')];
const getRoute = (path, ...handlers) => {
  router.get(path, ...handlers);
  router.get(`/api/users${path === '/' ? '' : path}`, ...handlers);
};
const postRoute = (path, ...handlers) => {
  router.post(path, ...handlers);
  router.post(`/api/users${path === '/' ? '' : path}`, ...handlers);
};
const putRoute = (path, ...handlers) => {
  router.put(path, ...handlers);
  router.put(`/api/users${path === '/' ? '' : path}`, ...handlers);
};

getRoute('/', validate(userQuerySchema, 'query'), ...adminOnly, getUsers);
getRoute('/:id', ...adminOnly, getUser);

// Department-scoped officer list for assignment forms
const deptReadRoles = [...new Set([...ADMIN_ROLES, ...WARD_SCOPED_ROLES, ...DEPARTMENT_SCOPED_ROLES])];
router.get('/officers', ...[authenticate, authorizeRoles(...deptReadRoles)], validate(userQuerySchema, 'query'), getOfficers);

postRoute('/', ...adminOnly, validate(createUserSchema), createUser);
putRoute('/:id', ...adminOnly, validate(updateUserSchema), updateUser);
putRoute('/:id/activate', ...adminOnly, activateUser);
putRoute('/:id/deactivate', ...adminOnly, deactivateUser);

export default router;
