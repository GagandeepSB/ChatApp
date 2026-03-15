const ChannelMessage = require('../../models/ChannelMessage')
const Channel = require('../../models/Channel')
const EVENTS = require('../../constants/socketEvents')

module.exports = function channelHandler(io, socket, userSocketMap) {
  socket.on(EVENTS.SEND_CHANNEL_MESSAGE, async (data) => {
    try {
      const { sender, channelId, content, messageType = 'text', fileUrl, audioUrl } = data
      const msg = await ChannelMessage.create({ channelId, sender, content, messageType, fileUrl, audioUrl })
      const populated = await msg.populate({ path: 'sender', select: '_id firstName lastName email image color' })
      const channel = await Channel.findById(channelId)
      if (!channel) return
      channel.members.forEach(memberId => {
        const socketId = userSocketMap[memberId.toString()]
        if (socketId) io.to(socketId).emit(EVENTS.RECEIVE_CHANNEL_MESSAGE, populated)
      })
    } catch (err) {
      socket.emit('error', { message: err.message })
    }
  })

  socket.on(EVENTS.ADD_CHANNEL_NOTIFY, async (channel) => {
    if (!channel || !channel.members) return
    channel.members.forEach(memberId => {
      const socketId = userSocketMap[memberId.toString() || memberId]
      if (socketId) io.to(socketId).emit(EVENTS.NEW_CHANNEL_ADDED, channel)
    })
  })
}
