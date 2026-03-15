const { verify } = require('../utils/token')
const EVENTS = require('../constants/socketEvents')
const userSocketMap = {}  // userId -> socketId (in-memory)

module.exports = function initSocket(io) {
  io.use((socket, next) => {
    const raw = socket.handshake.headers.cookie || ''
    const entry = raw.split(';').map(s => s.trim()).find(s => s.startsWith('jwt='))
    const token = entry ? entry.split('=')[1] : null
    if (!token) return next(new Error('auth: no cookie'))
    try { socket.user = verify(token); next() }
    catch { next(new Error('auth: invalid token')) }
  })

  io.on('connection', (socket) => {
    const userId = socket.user.id
    if (userId) userSocketMap[userId] = socket.id

    require('./handlers/dmHandler')(io, socket, userSocketMap)
    require('./handlers/channelHandler')(io, socket, userSocketMap)

    socket.on('disconnect', () => {
      if (userId && userSocketMap[userId] === socket.id) {
        delete userSocketMap[userId]
      }
    })
  })

  return { userSocketMap }
}
