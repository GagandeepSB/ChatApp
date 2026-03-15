const { createServer } = require('http')
const { Server } = require('socket.io')
const Client = require('socket.io-client')
const mongoose = require('mongoose')
const fs = require('fs'), path = require('path')
const request = require('supertest')

let io, httpServer, port
let cookie1, cookie2, token1, token2, userId1, userId2

function extractToken(setCookieArr) {
  if (!setCookieArr) return null
  for (const c of setCookieArr) {
    if (c.startsWith('jwt=')) return c.split(';')[0].replace('jwt=', '')
  }
  return null
}

beforeAll(async () => {
  require('dotenv').config({ path: '.env.test' })
  const uri = fs.readFileSync(path.join(__dirname, '../../.tmp/mongo-uri.txt'), 'utf8').trim()
  await mongoose.connect(uri)

  const app = require('../../index').app
  const r1 = await request(app).post('/api/auth/signup').send({ email: 'sock1@test.com', password: 'Password123!' })
  const r2 = await request(app).post('/api/auth/signup').send({ email: 'sock2@test.com', password: 'Password123!' })
  cookie1 = r1.headers['set-cookie']
  cookie2 = r2.headers['set-cookie']
  token1 = extractToken(cookie1)
  token2 = extractToken(cookie2)
  userId1 = r1.body.data.user.id
  userId2 = r2.body.data.user.id

  httpServer = createServer()
  io = new Server(httpServer, { cors: { origin: '*' } })
  require('../../socket')(io)
  await new Promise(resolve => {
    httpServer.listen(0, () => {
      port = httpServer.address().port
      resolve()
    })
  })
})

afterAll(async () => {
  io.close()
  httpServer.close()
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})

const connect = (token) => Client(`http://localhost:${port}`, {
  extraHeaders: { cookie: `jwt=${token}` },
  autoConnect: false
})

describe('Socket.IO auth', () => {
  it('rejects connection without jwt cookie', done => {
    const client = Client(`http://localhost:${port}`, { autoConnect: false })
    client.on('connect_error', err => {
      expect(err.message).toMatch(/auth|cookie|token/i)
      client.close()
      done()
    })
    client.connect()
  })

  it('allows connection with valid jwt cookie', done => {
    const client = connect(token1)
    client.on('connect', () => {
      expect(client.connected).toBe(true)
      client.close()
      done()
    })
    client.on('connect_error', err => {
      client.close()
      done(err)
    })
    client.connect()
  })
})

describe('Socket.IO DM messaging', () => {
  it('sendMessage → stored in DB, receiveMessage emitted to both users', done => {
    const sender = connect(token1)
    const receiver = connect(token2)
    let connectCount = 0
    let senderGot = false
    let receiverGot = false

    const finish = () => {
      if (senderGot && receiverGot) {
        sender.close()
        receiver.close()
        done()
      }
    }

    receiver.on('receiveMessage', async (msg) => {
      receiverGot = true
      expect(msg.content).toBe('Hello socket!')
      const Message = require('../../models/Message')
      const saved = await Message.findById(msg._id)
      expect(saved).not.toBeNull()
      finish()
    })

    sender.on('receiveMessage', (msg) => {
      senderGot = true
      expect(msg.content).toBe('Hello socket!')
      finish()
    })

    const onConnect = () => {
      connectCount++
      if (connectCount === 2) {
        sender.emit('sendMessage', {
          sender: userId1,
          content: 'Hello socket!',
          recipient: userId2,
          messageType: 'text'
        })
      }
    }

    sender.on('connect', onConnect)
    receiver.on('connect', onConnect)
    sender.connect()
    receiver.connect()
  }, 10000)
})

describe('Socket.IO channel messaging', () => {
  let channelId

  beforeAll(async () => {
    const Channel = require('../../models/Channel')
    const ch = await Channel.create({
      name: 'socket-test-ch',
      members: [new mongoose.Types.ObjectId(userId1), new mongoose.Types.ObjectId(userId2)],
      admin: new mongoose.Types.ObjectId(userId1)
    })
    channelId = ch._id.toString()
  })

  it('send-channel-message → stored in DB, recieve-channel-message emitted to members', done => {
    const client1 = connect(token1)
    const client2 = connect(token2)
    let connectCount = 0
    let receivedCount = 0

    const onMsg = (msg) => {
      receivedCount++
      expect(msg.content).toBe('Channel hello!')
      if (receivedCount >= 2) {
        client1.close()
        client2.close()
        done()
      }
    }

    client1.on('recieve-channel-message', onMsg)
    client2.on('recieve-channel-message', onMsg)

    const onConnect = () => {
      connectCount++
      if (connectCount === 2) {
        client1.emit('send-channel-message', {
          sender: userId1,
          content: 'Channel hello!',
          channelId,
          messageType: 'text'
        })
      }
    }

    client1.on('connect', onConnect)
    client2.on('connect', onConnect)
    client1.connect()
    client2.connect()
  }, 10000)
})
