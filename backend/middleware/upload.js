const multer = require('multer')
const path = require('path')
const fs = require('fs')
const ApiError = require('../utils/ApiError')

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_FILE_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => { ensureDir('uploads/profiles'); cb(null, 'uploads/profiles') },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
})

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => { ensureDir('uploads/files'); cb(null, 'uploads/files') },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
})

const profileImage = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    ALLOWED_IMAGE_MIME.includes(file.mimetype) ? cb(null, true) : cb(new ApiError(400, 'VALIDATION_ERROR', 'Invalid image type'))
  }
})

const file = multer({
  storage: fileStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    ALLOWED_FILE_MIME.includes(file.mimetype) ? cb(null, true) : cb(new ApiError(400, 'VALIDATION_ERROR', 'Invalid file type'))
  }
})

module.exports = { profileImage, file }
