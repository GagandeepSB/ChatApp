const Message = require('../../models/Message')
const EVENTS = require('../../constants/socketEvents')

module.exports = function dmHandler(io, socket, userSocketMap) {
  socket.on(EVENTS.SEND_MESSAGE, async (data) => {
    try {
      const { sender, recipient, content, messageType = 'text', fileUrl, audioUrl } = data
      const msg = await Message.create({ sender, recipient, content, messageType, fileUrl, audioUrl })
      const populated = await msg.populate([
        { path: 'sender',    select: '_id firstName lastName email image color' },
        { path: 'recipient', select: '_id firstName lastName email image color' }
      ])
      // Emit to recipient's socket if online
      const recipientSocketId = userSocketMap[recipient]
      if (recipientSocketId) io.to(recipientSocketId).emit(EVENTS.RECEIVE_MESSAGE, populated)
      // Emit back to sender's socket
      const senderSocketId = userSocketMap[sender]
      if (senderSocketId) io.to(senderSocketId).emit(EVENTS.RECEIVE_MESSAGE, populated)
    } catch (err) {
      socket.emit('error', { message: err.message })
    }
  })
}
