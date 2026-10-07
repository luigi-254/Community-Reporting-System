import db from '../config/db.js';

export const createSubcategory = async (req, res, next) => {
  try {
    const {
      categoryId,
      name,
      code,
      description,
      defaultPriority = 'MEDIUM',
      slaHours = 48,
      isActive = true,
    } = req.body;
    const parentCategory = await db.findCategoryById(categoryId);
    if (!parentCategory) {
      return res.status(404).json({
        status: 'error',
        message: `Parent category with ID '${categoryId}' not found.`,
      });
    }

    const subcategory = await db.createSubcategory({
      categoryId,
      name,
      code,
      description,
      defaultPriority,
      slaHours: parseInt(slaHours, 10) || 48,
      isActive: isActive !== false,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Subcategory created successfully.',
      data: { subcategory },
    });
  } catch (error) {
    next(error);
  }
};

export const getSubcategories = async (req, res, next) => {
  try {
    const { categoryId, isActive, search } = req.query;

    const subcategories = await db.findSubcategories({
      categoryId,
      isActive,
      search,
      includeCategory: true,
    });

    return res.status(200).json({
      status: 'success',
      total: subcategories.length,
      data: { subcategories },
    });
  } catch (error) {
    next(error);
  }
};
export const getSubcategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subcategory = await db.findSubcategoryById(id, { includeCategory: true });

    if (!subcategory) {
      return res.status(404).json({
        status: 'error',
        message: 'Subcategory not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { subcategory },
    });
  } catch (error) {
    next(error);
  }
};
export const updateSubcategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.findSubcategoryById(id);

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Subcategory not found.',
      });
    }

    const {
      categoryId,
      name,
      code,
      description,
      defaultPriority,
      slaHours,
      isActive,
    } = req.body;

    if (categoryId && categoryId !== existing.categoryId) {
      const parent = await db.findCategoryById(categoryId);
      if (!parent) {
        return res.status(404).json({
          status: 'error',
          message: `Category with ID '${categoryId}' not found.`,
        });
      }
    }

    const updated = await db.updateSubcategory(id, {
      ...(categoryId !== undefined && { categoryId }),
      ...(name !== undefined && { name: name.trim() }),
      ...(code !== undefined && { code: code.toUpperCase().trim() }),
      ...(description !== undefined && { description }),
      ...(defaultPriority !== undefined && { defaultPriority }),
      ...(slaHours !== undefined && { slaHours: parseInt(slaHours, 10) }),
      ...(isActive !== undefined && { isActive }),
    });

    return res.status(200).json({
      status: 'success',
      message: 'Subcategory updated successfully.',
      data: { subcategory: updated },
    });
  } catch (error) {
    next(error);
  }
};
export const deleteSubcategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.findSubcategoryById(id);

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Subcategory not found.',
      });
    }

    await db.deleteSubcategory(id);

    return res.status(200).json({
      status: 'success',
      message: 'Subcategory deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createSubcategory,
  getSubcategories,
  getSubcategory,
  updateSubcategory,
  deleteSubcategory,
};
