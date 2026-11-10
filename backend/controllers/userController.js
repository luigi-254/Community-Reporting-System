import bcrypt from 'bcryptjs';
import db from '../config/db.js';

const withoutPassword = (user) => {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
};

export const createUser = async (req, res, next) => {
  try {
    const { email, phone, password, role, county, subCounty, ward, departmentId } = req.body;

    if (await db.findUserByEmail(email)) {
      return res.status(409).json({
        status: 'error',
        message: 'A user with this email address already exists.',
      });
    }

    if (phone && (await db.findUserByPhone(phone))) {
      return res.status(409).json({
        status: 'error',
        message: 'A user with this phone number already exists.',
      });
    }

    const user = await db.createUser({
      name: req.body.name,
      email,
      phone,
      password: await bcrypt.hash(password, 10),
      role,
      county,
      subCounty,
      ward,
      departmentId,
    });

    return res.status(201).json({
      status: 'success',
      message: 'User created successfully.',
      data: { user: withoutPassword(user) },
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const { role, isActive, departmentId, search } = req.validatedQuery || req.query;

    const users = await db.findUsers({ role, isActive, departmentId, search });

    return res.status(200).json({
      status: 'success',
      total: users.length,
      data: { users: users.map(withoutPassword) },
    });
  } catch (error) {
    next(error);
  }
};

export const getOfficers = async (req, res, next) => {
  try {
    const { departmentId, search } = req.validatedQuery || req.query;
    const user = req.user;

    // Build scope filter based on caller's jurisdiction
    let scopeFilter = {};
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'GOVERNOR') {
      // No scope — can see all officers
      scopeFilter = {};
    } else if (user.departmentId) {
      scopeFilter = { departmentId: user.departmentId };
    }

    // Merge with caller-provided filters (caller can't override their own scope)
    const filters = {
      ...scopeFilter,
      ...(departmentId && scopeFilter.departmentId ? {} : { departmentId }),
      ...(search && { search }),
    };

    const officers = await db.findUsers(filters);

    // Exclude CITIZEN roles — only government officers can be assigned
    const governmentOfficers = officers.filter((u) => u.role !== 'CITIZEN');

    return res.status(200).json({
      status: 'success',
      total: governmentOfficers.length,
      data: { officers: governmentOfficers.map(withoutPassword) },
    });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await db.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }
    return res.status(200).json({ status: 'success', data: { user: withoutPassword(user) } });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const existing = await db.findUserById(req.params.id);
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    const updatedUser = await db.updateUser(req.params.id, req.body);
    return res.status(200).json({
      status: 'success',
      message: 'User updated successfully.',
      data: { user: withoutPassword(updatedUser) },
    });
  } catch (error) {
    next(error);
  }
};

const setUserStatus = (isActive, message) => async (req, res, next) => {
  try {
    const user = await db.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }
    const updated = await db.updateUser(req.params.id, { isActive });
    return res.status(200).json({
      status: 'success',
      message,
      data: { user: withoutPassword(updated) },
    });
  } catch (error) {
    next(error);
  }
};

export const activateUser = setUserStatus(true, 'User activated successfully.');
export const deactivateUser = setUserStatus(false, 'User deactivated successfully.');

export default {
  createUser,
  getUsers,
  getOfficers,
  getUser,
  updateUser,
  activateUser,
  deactivateUser,
};
