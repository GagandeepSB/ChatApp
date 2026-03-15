require('dotenv').config()
const express = require('express')
const http = require('http')
const cors = require('cors')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const path = require('path')
const fs = require('fs')

const app = express()
const server = http.createServer(app)

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173'], credentials: true }))
app.use(express.json())
app.use(cookieParser())

const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir)
app.use('/uploads', express.static(uploadsDir))

app.use('/api/auth',     require('./routes/auth'))
app.use('/api/contacts', require('./routes/contacts'))
app.use('/api/messages', require('./routes/messages'))
app.use('/api/channel',  require('./routes/channel'))

app.use(require('./middleware/errorHandler'))

if (require.main === module) {
  const validateEnv = require('./config/env')
  validateEnv()
  const connectDB = require('./config/db')
  const { Server } = require('socket.io')
  const io = new Server(server, { cors: { origin: ['http://localhost:3000', 'http://localhost:5173'], credentials: true } })
  require('./socket')(io)
  connectDB().then(() => server.listen(process.env.PORT, () => console.log(`Server on port ${process.env.PORT}`)))
}

module.exports = { app, server }
