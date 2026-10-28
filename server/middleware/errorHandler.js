function errorHandler(err, req, res, next) {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
}

module.exports = errorHandler;
