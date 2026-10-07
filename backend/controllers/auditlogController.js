import db from '../config/db.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await db.findAuditLogs(req.validatedQuery || req.query);
    return res.status(200).json({ status: 'success', total: logs.length, data: { logs } });
  } catch (error) { next(error); }
};

export const getAuditLog = async (req, res, next) => {
  try {
    const log = await db.findAuditLogById(req.params.id);
    if (!log) return res.status(404).json({ status: 'error', message: 'Audit log not found.' });
    return res.status(200).json({ status: 'success', data: { log } });
  } catch (error) { next(error); }
};

export default { getAuditLogs, getAuditLog };