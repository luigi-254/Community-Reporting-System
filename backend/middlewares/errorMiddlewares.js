
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || res.statusCode >= 400 ? res.statusCode : 500;
  const isDev = process.env.NODE_ENV !== 'production';

  console.error('[Error Handler]', err);

  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(isDev && { stack: err.stack }),
  });
};

export default {
  notFoundHandler,
  errorHandler,
};
