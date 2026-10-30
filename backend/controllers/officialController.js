import db from '../config/db.js';

export const createOfficial = async (req, res, next) => {
  try {
    const { name, officialType, positionId, userId, county, subCounty, ward, departmentId, isActive } = req.body;
    const official = await db.createOfficial({
      name,
      officialType,
      positionId,
      userId,
      county,
      subCounty,
      ward,
      departmentId,
      isActive: isActive !== false,
    });
    return res.status(201).json({
      status: 'success',
      message: 'Official created successfully.',
      data: { official },
    });
  } catch (error) { next(error); }
};

export const getOfficials = async (req, res, next) => {
  try {
    const officials = await db.findOfficials(req.validatedQuery || req.query);
    return res.status(200).json({
      status: 'success',
      total: officials.length,
      data: { officials },
    });
  } catch (error) { next(error); }
};

export const getOfficial = async (req, res, next) => {
  try {
    const official = await db.findOfficialById(req.params.id);
    if (!official) return res.status(404).json({ status: 'error', message: 'Official not found.' });
    return res.status(200).json({ status: 'success', data: { official } });
  } catch (error) { next(error); }
};

export const updateOfficial = async (req, res, next) => {
  try {
    const existing = await db.findOfficialById(req.params.id);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Official not found.' });
    const official = await db.updateOfficial(req.params.id, req.body);
    return res.status(200).json({
      status: 'success',
      message: 'Official updated successfully.',
      data: { official },
    });
  } catch (error) { next(error); }
};

export const deactivateOfficial = async (req, res, next) => {
  try {
    const official = await db.updateOfficial(req.params.id, { isActive: false });
    return res.status(200).json({
      status: 'success',
      message: 'Official deactivated successfully.',
      data: { official },
    });
  } catch (error) { next(error); }
};

export default {
  createOfficial,
  getOfficials,
  getOfficial,
  updateOfficial,
  deactivateOfficial,
};
