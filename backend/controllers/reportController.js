import db from '../config/db.js';

const sanitizeReport = (report, currentUser = null) => {
  if (!report) return null;
  const rep = { ...report };

  // If report is anonymous and requester is not the original reporter or admin/officer
  const isReporter = currentUser && currentUser.id === rep.reporterId;
  const isStaff = currentUser && ['ADMIN', 'SUPER_ADMIN', 'OFFICER'].includes(currentUser.role);

  if (rep.isAnonymous && !isReporter && !isStaff && rep.reporter) {
    rep.reporter = {
      id: rep.reporter.id,
      name: 'Anonymous Citizen',
      role: 'CITIZEN',
    };
  }

  return rep;
};

const extractMediaUrls = (req) => {
  let urls = [];
  if (Array.isArray(req.body?.mediaUrls)) {
    urls = [...req.body.mediaUrls];
  } else if (typeof req.body?.mediaUrls === 'string') {
    try {
      const parsed = JSON.parse(req.body.mediaUrls);
      if (Array.isArray(parsed)) urls = [...parsed];
    } catch (e) {
      urls.push(req.body.mediaUrls);
    }
  }

  if (req.files && Array.isArray(req.files)) {
    const fileUrls = req.files.map((file) => `/uploads/${file.filename}`);
    urls = [...urls, ...fileUrls];
  }

  return urls;
};
export const createReport = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      subCategory,
      priority = 'MEDIUM',
      location,
      county,
      subCounty,
      ward,
      latitude,
      longitude,
      isAnonymous = false,
      departmentId,
    } = req.body;

    const mediaUrls = extractMediaUrls(req);

    const newReport = await db.createReport({
      title,
      description,
      category,
      subCategory,
      priority,
      status: 'SUBMITTED',
      location,
      county,
      subCounty,
      ward,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      mediaUrls,
      isAnonymous: Boolean(isAnonymous === true || isAnonymous === 'true' || isAnonymous === '1'),
      reporterId: req.user.id,
      departmentId: departmentId || null,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Report submitted successfully. Authorities will review it shortly.',
      data: {
        report: sanitizeReport(newReport, req.user),
      },
    });
  } catch (error) {
    next(error);
  }
};
export const getReports = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      priority,
      category,
      ward,
    } = req.query;

    const data = await db.findReports({
      page,
      limit,
      sortBy,
      sortOrder,
      status,
      priority,
      category,
      ward,
    });

    data.reports = data.reports.map((r) => sanitizeReport(r, req.user));

    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await db.findReportById(id);

    if (!report) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        report: sanitizeReport(report, req.user),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyReports = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
    } = req.query;

    const data = await db.findReports({
      reporterId: req.user.id,
      status,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    data.reports = data.reports.map((r) => sanitizeReport(r, req.user));

    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const updateReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.findReportById(id);

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found.',
      });
    }

    const isReporter = existing.reporterId === req.user.id;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

    if (!isReporter && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: You do not have permission to edit this report.',
      });
    }

    // Citizens can only update reports in SUBMITTED or UNDER_REVIEW status
    if (isReporter && !isAdmin && !['SUBMITTED', 'UNDER_REVIEW'].includes(existing.status)) {
      return res.status(400).json({
        status: 'error',
        message: `Report is currently '${existing.status}' and cannot be edited by citizen.`,
      });
    }

    const {
      title,
      description,
      category,
      subCategory,
      priority,
      location,
      county,
      subCounty,
      ward,
      latitude,
      longitude,
      isAnonymous,
    } = req.body;

    const uploadedUrls = extractMediaUrls(req);
    const updatedMedia = uploadedUrls.length > 0 ? uploadedUrls : undefined;

    const updatePayload = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(subCategory !== undefined && { subCategory }),
      ...(priority !== undefined && { priority }),
      ...(location !== undefined && { location }),
      ...(county !== undefined && { county }),
      ...(subCounty !== undefined && { subCounty }),
      ...(ward !== undefined && { ward }),
      ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
      ...(longitude !== undefined && { longitude: parseFloat(longitude) }),
      ...(isAnonymous !== undefined && {
        isAnonymous: Boolean(isAnonymous === true || isAnonymous === 'true' || isAnonymous === '1'),
      }),
      ...(updatedMedia && { mediaUrls: updatedMedia }),
    };

    const updated = await db.updateReport(id, updatePayload);

    return res.status(200).json({
      status: 'success',
      message: 'Report updated successfully.',
      data: {
        report: sanitizeReport(updated, req.user),
      },
    });
  } catch (error) {
    next(error);
  }
};
export const deleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.findReportById(id);

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found.',
      });
    }

    const isReporter = existing.reporterId === req.user.id;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

    if (!isReporter && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: You do not have permission to delete this report.',
      });
    }

    if (isReporter && !isAdmin && existing.status !== 'SUBMITTED') {
      return res.status(400).json({
        status: 'error',
        message: 'You can only delete reports that are still in SUBMITTED status.',
      });
    }

    await db.deleteReport(id);

    return res.status(200).json({
      status: 'success',
      message: 'Report deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
export const changeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      status,
      notes,
      resolutionNotes,
      assignedOfficerId,
      departmentId,
      resolutionMediaUrls,
    } = req.body;

    const existing = await db.findReportById(id);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found.',
      });
    }
    const isOfficerOrAdmin = ['OFFICER', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    if (!isOfficerOrAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only government officers or administrators can update report status.',
      });
    }

    const isResolving = status === 'RESOLVED';
    const finalResolutionNotes = resolutionNotes || notes;

    const updatePayload = {
      status,
      ...(assignedOfficerId && { assignedOfficerId }),
      ...(departmentId && { departmentId }),
      ...(finalResolutionNotes && { resolutionNotes: finalResolutionNotes }),
      ...(resolutionMediaUrls && { resolutionMediaUrls }),
      ...(isResolving && {
        resolvedAt: new Date(),
        resolutionStatus: 'PENDING', // Awaiting citizen acceptance
      }),
    };

    const updated = await db.updateReport(id, updatePayload);

    return res.status(200).json({
      status: 'success',
      message: `Report status updated to '${status}'.`,
      data: {
        report: sanitizeReport(updated, req.user),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const acceptResolution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { feedback, rating } = req.body;

    const existing = await db.findReportById(id);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found.',
      });
    }

    const isReporter = existing.reporterId === req.user.id;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

    if (!isReporter && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only the reporting citizen can accept this resolution.',
      });
    }

    if (existing.status !== 'RESOLVED') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot accept resolution: Report status is '${existing.status}', not 'RESOLVED'.`,
      });
    }

    const updated = await db.updateReport(id, {
      resolutionStatus: 'ACCEPTED',
      citizenFeedback: feedback || (rating ? `Rated ${rating}/5` : 'Resolution accepted by citizen.'),
    });

    return res.status(200).json({
      status: 'success',
      message: 'Resolution accepted. Thank you for confirming the fix!',
      data: {
        report: sanitizeReport(updated, req.user),
      },
    });
  } catch (error) {
    next(error);
  }
};
export const rejectResolution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, feedback } = req.body;
    const rejectionReason = reason || feedback;

    if (!rejectionReason) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a reason why the resolution is unsatisfactory.',
      });
    }

    const existing = await db.findReportById(id);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found.',
      });
    }

    const isReporter = existing.reporterId === req.user.id;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

    if (!isReporter && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only the reporting citizen can reject this resolution.',
      });
    }

    if (existing.status !== 'RESOLVED') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot reject resolution: Report status is '${existing.status}', not 'RESOLVED'.`,
      });
    }

    // Move report back to IN_PROGRESS or ESCALATED for officer review
    const updated = await db.updateReport(id, {
      status: 'IN_PROGRESS',
      resolutionStatus: 'REJECTED',
      rejectionReason,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Resolution rejected. The report has been re-opened for further action.',
      data: {
        report: sanitizeReport(updated, req.user),
      },
    });
  } catch (error) {
    next(error);
  }
};
export const searchReports = async (req, res, next) => {
  try {
    const { q, query, page = 1, limit = 10 } = req.query;
    const searchTerm = q || query;

    if (!searchTerm) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query parameter (q) is required.',
      });
    }

    const data = await db.findReports({
      search: searchTerm,
      page,
      limit,
    });

    data.reports = data.reports.map((r) => sanitizeReport(r, req.user));

    return res.status(200).json({
      status: 'success',
      query: searchTerm,
      data,
    });
  } catch (error) {
    next(error);
  }
};
export const filterReports = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      category,
      subCategory,
      ward,
      county,
      subCounty,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const data = await db.findReports({
      status,
      priority,
      category,
      subCategory,
      ward,
      county,
      subCounty,
      startDate,
      endDate,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    data.reports = data.reports.map((r) => sanitizeReport(r, req.user));

    return res.status(200).json({
      status: 'success',
      filters: {
        status,
        priority,
        category,
        subCategory,
        ward,
        county,
        subCounty,
        startDate,
        endDate,
      },
      data,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createReport,
  getReports,
  getReport,
  getMyReports,
  updateReport,
  deleteReport,
  changeStatus,
  acceptResolution,
  rejectResolution,
  searchReports,
  filterReports,
};
