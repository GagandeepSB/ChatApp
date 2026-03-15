const ApiError = require('../utils/ApiError')
module.exports = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ message: err.message, code: err.code })
  }
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message, code: 'VALIDATION_ERROR' })
  }
  // Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Already exists', code: 'ALREADY_EXISTS' })
  }
  console.error(err)
  res.status(500).json({ message: 'Internal server error', code: 'INTERNAL_ERROR' })
}
