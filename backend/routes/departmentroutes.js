import express from 'express';
import {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/departmentController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentQuerySchema,
} from '../validators/departmentValidator.js';

const router = express.Router();
const getRoute = (path, ...handlers) => {
  router.get(path, ...handlers);
  router.get(`/api/departments${path === '/' ? '' : path}`, ...handlers);
};
const postRoute = (path, ...handlers) => {
  router.post(path, ...handlers);
  router.post(`/api/departments${path === '/' ? '' : path}`, ...handlers);
};
const putRoute = (path, ...handlers) => {
  router.put(path, ...handlers);
  router.put(`/api/departments${path === '/' ? '' : path}`, ...handlers);
};
const deleteRoute = (path, ...handlers) => {
  router.delete(path, ...handlers);
  router.delete(`/api/departments${path === '/' ? '' : path}`, ...handlers);
};

getRoute('/', validate(departmentQuerySchema, 'query'), getDepartments);
getRoute('/:id', getDepartment);
postRoute('/', authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'), validate(createDepartmentSchema), createDepartment);
putRoute('/:id', authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'), validate(updateDepartmentSchema), updateDepartment);
deleteRoute('/:id', authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'), deleteDepartment);

export default router;