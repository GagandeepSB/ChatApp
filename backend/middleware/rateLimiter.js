const rateLimit = require('express-rate-limit')

// Skip rate limiting in test environment to avoid blocking test requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10000 : 15,
  standardHeaders: true,
  legacyHeaders: false
})

module.exports = limiter
