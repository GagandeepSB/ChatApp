const { verify } = require('../utils/token')
const ApiError = require('../utils/ApiError')
module.exports = (req, res, next) => {
  const token = req.cookies && req.cookies.jwt
  if (!token) throw new ApiError(401, 'UNAUTHORIZED', 'No token')
  try {
    req.user = verify(token)
    next()
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token')
  }
}
