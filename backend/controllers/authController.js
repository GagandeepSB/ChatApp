const bcrypt = require('bcrypt')
const User = require('../models/User')
const { sign } = require('../utils/token')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')

const COOKIE_OPTS = { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 }

// Returns user data with 'id' (not '_id') to match frontend expectations
const userResponse = (user) => ({
  id: user._id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  image: user.image,
  profileSetup: user.profileSetup,
  color: user.color
})

const signup = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) throw new ApiError(400, 'VALIDATION_ERROR', 'Email and password required')
  if (typeof email !== 'string' || typeof password !== 'string') throw new ApiError(400, 'VALIDATION_ERROR', 'Email and password must be strings')
  const exists = await User.findOne({ email })
  if (exists) throw new ApiError(409, 'ALREADY_EXISTS', 'Email already registered')
  const hashed = await bcrypt.hash(password, 10)
  const user = await User.create({ email, password: hashed })
  const token = sign({ id: user._id, email: user.email })
  res.cookie('jwt', token, COOKIE_OPTS)
  res.status(201).json({ success: true, user: userResponse(user), data: { user: userResponse(user) } })
})

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) throw new ApiError(400, 'VALIDATION_ERROR', 'Email and password required')
  if (typeof email !== 'string' || typeof password !== 'string') throw new ApiError(400, 'VALIDATION_ERROR', 'Email and password must be strings')
  const user = await User.findOne({ email })
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'Email not found')
  const match = await bcrypt.compare(password, user.password)
  if (!match) throw new ApiError(400, 'INVALID_CREDENTIALS', 'Invalid password')
  const token = sign({ id: user._id, email: user.email })
  res.cookie('jwt', token, COOKIE_OPTS)
  res.json({ success: true, user: userResponse(user), data: { user: userResponse(user) } })
})

const getUserInfo = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found')
  // Returns flat data at both root level (for frontend) and inside data (for tests)
  const u = userResponse(user)
  res.json({ success: true, ...u, data: u })
})

const logout = asyncHandler(async (req, res) => {
  res.clearCookie('jwt')
  res.json({ success: true, data: {} })
})

const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, color } = req.body
  if (!firstName || !lastName) throw new ApiError(400, 'VALIDATION_ERROR', 'First name and last name required')
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { firstName, lastName, color: color !== undefined ? color : '', profileSetup: true },
    { returnDocument: 'after' }
  )
  // Returns flat data at both root level (for frontend spread) and inside data (for tests)
  const u = userResponse(user)
  res.json({ success: true, ...u, data: u })
})

const addProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'VALIDATION_ERROR', 'No image uploaded')
  const imagePath = `uploads/profiles/${req.file.filename}`
  await User.findByIdAndUpdate(req.user.id, { image: imagePath })
  res.json({ image: imagePath })
})

const removeProfileImage = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { image: '' })
  res.json({ success: true, data: { image: null } })
})

module.exports = { signup, login, getUserInfo, logout, updateProfile, addProfileImage, removeProfileImage }
