import express from 'express';

import {
  createSubcategory,
  getSubcategories,
  getSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from '../controllers/subcategoryController.js';

import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';

import {
  createSubcategorySchema,
  updateSubcategorySchema,
} from '../validators/categoryValidator.js';

const router = express.Router();

const getRoute = (path, ...handlers) => {
  router.get(path, ...handlers);
  router.get(`/api/subcategories${path === '/' ? '' : path}`, ...handlers);
};

const postRoute = (path, ...handlers) => {
  router.post(path, ...handlers);
  router.post(`/api/subcategories${path === '/' ? '' : path}`, ...handlers);
};

const putRoute = (path, ...handlers) => {
  router.put(path, ...handlers);
  router.put(`/api/subcategories${path === '/' ? '' : path}`, ...handlers);
};

const patchRoute = (path, ...handlers) => {
  router.patch(path, ...handlers);
  router.patch(`/api/subcategories${path === '/' ? '' : path}`, ...handlers);
};

const deleteRoute = (path, ...handlers) => {
  router.delete(path, ...handlers);
  router.delete(`/api/subcategories${path === '/' ? '' : path}`, ...handlers);
};

// 1. GET /api/subcategories - View all subcategories (optional ?categoryId=...)
getRoute('/', getSubcategories);

// 2. GET /api/subcategories/:id - View single subcategory
getRoute('/:id', getSubcategory);

// 3. POST /api/subcategories - Create subcategory (Admin or Officer)
postRoute(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN', 'OFFICER'),
  validate(createSubcategorySchema),
  createSubcategory
);

// 4. PUT & PATCH /api/subcategories/:id - Update subcategory
putRoute(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN', 'OFFICER'),
  validate(updateSubcategorySchema),
  updateSubcategory
);
patchRoute(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN', 'OFFICER'),
  validate(updateSubcategorySchema),
  updateSubcategory
);

// 5. DELETE /api/subcategories/:id - Delete subcategory (Admin only)
deleteRoute(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  deleteSubcategory
);

export default router;
