const mongoose = require('mongoose')
const { Schema } = mongoose
const userSchema = new Schema({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true },
  firstName:    { type: String, default: '' },
  lastName:     { type: String, default: '' },
  image:        { type: String, default: '' },
  profileSetup: { type: Boolean, default: false },
  color:        { type: String, default: '' },
  createdAt:    { type: Date, default: Date.now }
})
module.exports = mongoose.model('User', userSchema)
