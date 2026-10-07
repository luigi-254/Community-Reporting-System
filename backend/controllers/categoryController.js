import db from '../config/db.js';

export const createCategory = async (req, res, next) => {
  try {
    const { name, code, description, icon, isActive, departmentId } = req.body;
    const existing = await db.findCategoryByName(name);
    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: `Category with name '${name}' already exists.`,
      });
    }

    if (code) {
      const existingCode = await db.findCategoryByCode(code);
      if (existingCode) {
        return res.status(409).json({
          status: 'error',
          message: `Category with code '${code}' already exists.`,
        });
      }
    }

    const category = await db.createCategory({
      name,
      code,
      description,
      icon,
      isActive: isActive !== false,
      departmentId,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Category created successfully.',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};
export const getCategories = async (req, res, next) => {
  try {
    const { isActive, search, includeSubcategories = true } = req.query;

    const categories = await db.findCategories({
      isActive,
      search,
      includeSubcategories: includeSubcategories === 'true' || includeSubcategories === true,
    });

    return res.status(200).json({
      status: 'success',
      total: categories.length,
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
};
export const getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await db.findCategoryById(id, { includeSubcategories: true });

    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.findCategoryById(id);

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found.',
      });
    }

    const { name, code, description, icon, isActive, departmentId } = req.body;

    if (name && name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await db.findCategoryByName(name);
      if (duplicate && duplicate.id !== id) {
        return res.status(409).json({
          status: 'error',
          message: `Category with name '${name}' already exists.`,
        });
      }
    }

    const updated = await db.updateCategory(id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(code !== undefined && { code: code.toUpperCase().trim() }),
      ...(description !== undefined && { description }),
      ...(icon !== undefined && { icon }),
      ...(isActive !== undefined && { isActive }),
      ...(departmentId !== undefined && { departmentId }),
    });

    return res.status(200).json({
      status: 'success',
      message: 'Category updated successfully.',
      data: { category: updated },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.findCategoryById(id);

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found.',
      });
    }

    await db.deleteCategory(id);

    return res.status(200).json({
      status: 'success',
      message: 'Category and its subcategories deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};
