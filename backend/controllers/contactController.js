const User = require('../models/User')
const Message = require('../models/Message')
const mongoose = require('mongoose')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')

const searchContacts = asyncHandler(async (req, res) => {
  const { searchTerm } = req.body
  if (!searchTerm) throw new ApiError(400, 'VALIDATION_ERROR', 'searchTerm required')
  const regex = new RegExp(searchTerm, 'i')
  const contacts = await User.find({
    _id: { $ne: req.user.id },
    $or: [{ firstName: regex }, { lastName: regex }, { email: regex }]
  }).select('_id firstName lastName email')
  res.json({ success: true, contacts, data: { contacts } })
})

const getAllContacts = asyncHandler(async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user.id } }).select('_id firstName lastName email')
  const contacts = users.map(u => ({
    label: `${u.firstName} ${u.lastName}`.trim() || u.email,
    value: u._id
  }))
  res.json({ success: true, contacts, data: { contacts } })
})

const getContactsForList = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id)
  const messages = await Message.find({
    $or: [{ sender: userId }, { recipient: userId }]
  }).sort({ timestamp: -1 })

  const seen = new Map()
  for (const msg of messages) {
    const otherId = msg.sender.toString() === req.user.id
      ? msg.recipient.toString()
      : msg.sender.toString()
    if (!seen.has(otherId)) seen.set(otherId, msg.timestamp)
  }

  const contacts = []
  for (const [id, lastMessageTime] of seen) {
    const user = await User.findById(id).select('_id firstName lastName email image color')
    if (user) contacts.push({ ...user.toObject(), lastMessageTime })
  }

  res.json({ success: true, contacts, data: { contacts } })
})

const deleteDm = asyncHandler(async (req, res) => {
  const { dmId } = req.params
  if (!mongoose.Types.ObjectId.isValid(dmId)) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid dmId')
  await Message.deleteMany({
    $or: [
      { sender: req.user.id, recipient: dmId },
      { sender: dmId, recipient: req.user.id }
    ]
  })
  res.json({ success: true, data: { message: 'DM deleted successfully' } })
})

module.exports = { searchContacts, getAllContacts, getContactsForList, deleteDm }
