const router = require('express').Router()
const auth = require('../middleware/auth')
const { getMessages, uploadFile } = require('../controllers/messageController')
const { file: fileUpload } = require('../middleware/upload')
const ApiError = require('../utils/ApiError')

router.use(auth)
router.post('/get-messages', getMessages)
router.post('/upload-file', (req, res, next) => {
  fileUpload.single('file')(req, res, err => {
    if (err) return next(err instanceof ApiError ? err : new ApiError(400, 'VALIDATION_ERROR', err.message))
    next()
  })
}, uploadFile)

module.exports = router
