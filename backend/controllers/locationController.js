import db from '../config/db.js';

export const getCounties = async (req, res, next) => {
  try {
    const counties = await db.findCounties(req.validatedQuery || req.query);
    return res.status(200).json({ status: 'success', total: counties.length, data: { counties } });
  } catch (error) {
    next(error);
  }
};

export const getSubCounties = async (req, res, next) => {
  try {
    const { countyId } = req.params;
    const county = await db.findCountyById(countyId);
    if (!county) return res.status(404).json({ status: 'error', message: 'County not found.' });
    const subCounties = await db.findSubCounties(countyId);
    return res.status(200).json({ status: 'success', total: subCounties.length, data: { county, subCounties } });
  } catch (error) {
    next(error);
  }
};

export const getWards = async (req, res, next) => {
  try {
    const { subCountyId } = req.params;
    const subCounty = await db.findSubCountyById(subCountyId);
    if (!subCounty) return res.status(404).json({ status: 'error', message: 'Sub-county not found.' });
    const wards = await db.findWards(subCountyId);
    return res.status(200).json({ status: 'success', total: wards.length, data: { subCounty, wards } });
  } catch (error) {
    next(error);
  }
};

export default { getCounties, getSubCounties, getWards };