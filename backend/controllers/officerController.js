import bcrypt from 'bcryptjs';
import db from '../config/db.js';

export const createOfficer = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;
    if (await db.findOfficerByEmail(email) || (phone && await db.findUserByPhone(phone))) {
      return res.status(409).json({ status: 'error', message: 'An officer with this email or phone already exists.' });
    }
    const officer = await db.createOfficer({ ...req.body, password: await bcrypt.hash(password, 10) });
    return res.status(201).json({ status: 'success', message: 'Officer created successfully.', data: { officer } });
  } catch (error) {
    next(error);
  }
};

export const getOfficers = async (req, res, next) => {
  try {
    const officers = await db.findOfficers(req.validatedQuery || req.query);
    return res.status(200).json({ status: 'success', total: officers.length, data: { officers } });
  } catch (error) {
    next(error);
  }
};

export const getOfficer = async (req, res, next) => {
  try {
    const officer = await db.findOfficerById(req.params.id);
    if (!officer) return res.status(404).json({ status: 'error', message: 'Officer not found.' });
    return res.status(200).json({ status: 'success', data: { officer } });
  } catch (error) {
    next(error);
  }
};

export const updateOfficer = async (req, res, next) => {
  try {
    const existing = await db.findOfficerById(req.params.id);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Officer not found.' });
    const officer = await db.updateOfficer(req.params.id, req.body);
    return res.status(200).json({ status: 'success', message: 'Officer updated successfully.', data: { officer } });
  } catch (error) {
    next(error);
  }
};

const setOfficerStatus = (isActive, message) => async (req, res, next) => {
  try {
    const officer = await db.findOfficerById(req.params.id);
    if (!officer) return res.status(404).json({ status: 'error', message: 'Officer not found.' });
    const updated = await db.updateOfficer(req.params.id, { isActive });
    return res.status(200).json({ status: 'success', message, data: { officer: updated } });
  } catch (error) {
    next(error);
  }
};

export const activateOfficer = setOfficerStatus(true, 'Officer activated successfully.');
export const deactivateOfficer = setOfficerStatus(false, 'Officer deactivated successfully.');

export default {
  createOfficer,
  getOfficers,
  getOfficer,
  updateOfficer,
  activateOfficer,
  deactivateOfficer,
};