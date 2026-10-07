import express from 'express';

import {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';

import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddlewares.js';
import { validate } from '../middlewares/validateMiddlewares.js';

import {
  createCategorySchema,
  updateCategorySchema,
} from '../validators/categoryValidator.js';

const router = express.Router();

const getRoute = (path, ...handlers) => {
  router.get(path, ...handlers);
  router.get(`/api/categories${path === '/' ? '' : path}`, ...handlers);
};

const postRoute = (path, ...handlers) => {
  router.post(path, ...handlers);
  router.post(`/api/categories${path === '/' ? '' : path}`, ...handlers);
};

const putRoute = (path, ...handlers) => {
  router.put(path, ...handlers);
  router.put(`/api/categories${path === '/' ? '' : path}`, ...handlers);
};

const patchRoute = (path, ...handlers) => {
  router.patch(path, ...handlers);
  router.patch(`/api/categories${path === '/' ? '' : path}`, ...handlers);
};

const deleteRoute = (path, ...handlers) => {
  router.delete(path, ...handlers);
  router.delete(`/api/categories${path === '/' ? '' : path}`, ...handlers);
};

// 1. GET /api/categories - View all service categories
getRoute('/', getCategories);

// 2. GET /api/categories/:id - View single category with subcategories
getRoute('/:id', getCategory);

// 3. POST /api/categories - Create category (Admin or Officer)
postRoute(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN', 'OFFICER'),
  validate(createCategorySchema),
  createCategory
);

// 4. PUT & PATCH /api/categories/:id - Update category
putRoute(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN', 'OFFICER'),
  validate(updateCategorySchema),
  updateCategory
);
patchRoute(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN', 'OFFICER'),
  validate(updateCategorySchema),
  updateCategory
);

// 5. DELETE /api/categories/:id - Delete category (Admin only)
deleteRoute(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  deleteCategory
);

export default router;
