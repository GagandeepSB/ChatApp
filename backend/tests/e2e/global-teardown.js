// global-teardown.js — deletes all @e2e.test users and their data from Atlas
const mongoose = require('mongoose')
const path = require('path')

module.exports = async () => {
  try {
    require('dotenv').config({ path: path.join(__dirname, '../../.env') })
    const uri = process.env.DB_URI
    if (!uri) {
      console.warn('[teardown] DB_URI not set — skipping e2e cleanup')
      return
    }
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })

    const User = require('../../models/User')
    const Message = require('../../models/Message')
    const Channel = require('../../models/Channel')
    const ChannelMessage = require('../../models/ChannelMessage')

    // Find test users
    const testUsers = await User.find({ email: /@e2e\.test$/ })
    const testUserIds = testUsers.map(u => u._id)

    if (testUserIds.length > 0) {
      // Delete DM messages involving test users
      await Message.deleteMany({
        $or: [
          { sender: { $in: testUserIds } },
          { recipient: { $in: testUserIds } }
        ]
      })
      // Delete channel messages from test users
      await ChannelMessage.deleteMany({ sender: { $in: testUserIds } })
      // Delete channels created by test users
      await Channel.deleteMany({ admin: { $in: testUserIds } })
      // Delete test users
      await User.deleteMany({ email: /@e2e\.test$/ })
      console.log(`[teardown] Deleted ${testUserIds.length} e2e test users and their data`)
    }

    await mongoose.disconnect()
  } catch (err) {
    console.error('[teardown] Error during e2e cleanup:', err.message)
  }
}
