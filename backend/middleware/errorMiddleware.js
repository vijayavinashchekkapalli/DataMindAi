export const errorMiddleware = (err, req, res, next) => {
  const isMulterError = err.name === 'MulterError';
  const statusCode = err.statusCode || (err.code === 'LIMIT_FILE_SIZE' ? 413 : isMulterError ? 400 : 500);
  console.error(`[ERROR] ${req.method} ${req.originalUrl} (${statusCode}):`, err.message);

  res.status(statusCode).json({
    success: false,
    message: err.code === 'LIMIT_FILE_SIZE'
      ? `File exceeds the ${Number(process.env.MAX_FILE_SIZE_MB) || 10} MB per-file limit.`
      : err.message || 'Internal server error',
    details: err.details,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};
