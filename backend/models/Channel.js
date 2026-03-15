const mongoose = require('mongoose')
const { Schema } = mongoose
const channelSchema = new Schema({
  name:      { type: String, required: true },
  members:   [{ type: Schema.Types.ObjectId, ref: 'User' }],
  admin:     { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
})
module.exports = mongoose.model('Channel', channelSchema)
