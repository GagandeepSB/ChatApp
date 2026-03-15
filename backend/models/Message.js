const mongoose = require('mongoose')
const { Schema } = mongoose
const messageSchema = new Schema({
  sender:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content:     { type: String },
  messageType: { type: String, enum: ['text', 'file'], default: 'text' },
  fileUrl:     { type: String },
  audioUrl:    { type: String },
  timestamp:   { type: Date, default: Date.now }
})
messageSchema.index({ sender: 1, recipient: 1, timestamp: 1 })
module.exports = mongoose.model('Message', messageSchema)
