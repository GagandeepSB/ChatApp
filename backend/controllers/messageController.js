const Message = require('../models/Message')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')

const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.body
  if (!id) throw new ApiError(400, 'VALIDATION_ERROR', 'Recipient id required')
  const userId = req.user.id
  const messages = await Message.find({
    $or: [
      { sender: userId, recipient: id },
      { sender: id, recipient: userId }
    ]
  }).sort({ timestamp: 1 })
    .populate('sender', '_id email firstName lastName image color')
    .populate('recipient', '_id email firstName lastName image color')
  res.json({ success: true, messages, data: { messages } })
})

const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'VALIDATION_ERROR', 'No file uploaded')
  const filePath = '/uploads/files/' + req.file.filename
  res.status(201).json({ success: true, data: { filePath } })
})

const deleteDM = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const otherId = req.params.id
  await Message.deleteMany({
    $or: [
      { sender: userId, recipient: otherId },
      { sender: otherId, recipient: userId }
    ]
  })
  res.json({ success: true, data: {} })
})

module.exports = { getMessages, uploadFile, deleteDM }
