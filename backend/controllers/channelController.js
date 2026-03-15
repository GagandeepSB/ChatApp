const Channel = require('../models/Channel')
const ChannelMessage = require('../models/ChannelMessage')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')

const createChannel = asyncHandler(async (req, res) => {
  const { name, members = [] } = req.body
  if (!name) throw new ApiError(400, 'VALIDATION_ERROR', 'Channel name required')
  const allMembers = [...new Set([req.user.id, ...members.map(String)])]
  const channel = await Channel.create({ name, members: allMembers, admin: req.user.id })
  const populated = await channel.populate('members', '_id firstName lastName email image color')
  res.status(201).json({ success: true, channel: populated, data: { channel: populated } })
})

const getUserChannels = asyncHandler(async (req, res) => {
  const channels = await Channel.find({ members: req.user.id })
    .sort({ createdAt: -1 })
    .populate('members', '_id firstName lastName email image color')
  res.json({ success: true, channels, data: { channels } })
})

const getChannelMessages = asyncHandler(async (req, res) => {
  const { channelId } = req.params
  const messages = await ChannelMessage.find({ channelId })
    .sort({ timestamp: 1 })
    .populate('sender', '_id firstName lastName email image color')
  res.json({ success: true, messages, data: { messages } })
})

const deleteChannel = asyncHandler(async (req, res) => {
  const { channelId } = req.params
  await Channel.findByIdAndDelete(channelId)
  await ChannelMessage.deleteMany({ channelId })
  res.json({ success: true, data: { message: 'Channel deleted successfully' } })
})

module.exports = { createChannel, getUserChannels, getChannelMessages, deleteChannel }
