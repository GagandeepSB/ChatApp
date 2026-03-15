const mongoose = require('mongoose')
const { Schema } = mongoose
const channelMessageSchema = new Schema({
  channelId:   { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
  sender:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content:     { type: String },
  messageType: { type: String, enum: ['text', 'file'], default: 'text' },
  fileUrl:     { type: String },
  audioUrl:    { type: String },
  timestamp:   { type: Date, default: Date.now }
})
channelMessageSchema.index({ channelId: 1, timestamp: 1 })
module.exports = mongoose.model('ChannelMessage', channelMessageSchema)
