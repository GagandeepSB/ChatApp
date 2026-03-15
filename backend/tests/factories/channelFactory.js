const createChannelData = (adminId, overrides = {}) => ({
  name: 'Test Channel', members: [adminId], admin: adminId, ...overrides
})
module.exports = { createChannelData }
