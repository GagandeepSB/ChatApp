const mongoose = require('mongoose')
module.exports = async function connectDB() {
  await mongoose.connect(process.env.DB_URI)
  console.log('MongoDB connected')
}
