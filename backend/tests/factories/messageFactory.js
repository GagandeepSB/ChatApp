const createMessageData = (senderId, recipientId, overrides = {}) => ({
  sender: senderId, recipient: recipientId, content: 'Hello', messageType: 'text', ...overrides
})
module.exports = { createMessageData }
