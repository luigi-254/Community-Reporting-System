import db from '../config/db.js';

export const createDepartment = async (req, res, next) => {
  try {
    const { name, code } = req.body;
    if (await db.findDepartmentByName(name) || await db.findDepartmentByCode(code)) {
      return res.status(409).json({ status: 'error', message: 'Department name or code already exists.' });
    }
    const department = await db.createDepartment(req.body);
    return res.status(201).json({
      status: 'success',
      message: 'Department created successfully.',
      data: { department },
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartments = async (req, res, next) => {
  try {
    const departments = await db.findDepartments(req.validatedQuery || req.query);
    return res.status(200).json({ status: 'success', total: departments.length, data: { departments } });
  } catch (error) {
    next(error);
  }
};

export const getDepartment = async (req, res, next) => {
  try {
    const department = await db.findDepartmentById(req.params.id);
    if (!department) return res.status(404).json({ status: 'error', message: 'Department not found.' });
    return res.status(200).json({ status: 'success', data: { department } });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const existing = await db.findDepartmentById(req.params.id);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Department not found.' });
    const { name, code } = req.body;
    if (name && name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await db.findDepartmentByName(name);
      if (duplicate && duplicate.id !== existing.id) {
        return res.status(409).json({ status: 'error', message: 'Department name already exists.' });
      }
    }
    if (code && code.toUpperCase() !== existing.code) {
      const duplicate = await db.findDepartmentByCode(code);
      if (duplicate && duplicate.id !== existing.id) {
        return res.status(409).json({ status: 'error', message: 'Department code already exists.' });
      }
    }
    const department = await db.updateDepartment(req.params.id, {
      ...req.body,
      ...(name !== undefined && { name: name.trim() }),
      ...(code !== undefined && { code: code.toUpperCase().trim() }),
    });
    return res.status(200).json({ status: 'success', message: 'Department updated successfully.', data: { department } });
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    const existing = await db.findDepartmentById(req.params.id);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Department not found.' });
    await db.deleteDepartment(req.params.id);
    return res.status(200).json({ status: 'success', message: 'Department deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export default {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
};