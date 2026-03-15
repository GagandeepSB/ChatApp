/**
 * System-Level WebSocket Tests
 * TC18.3 — Socket connection with tampered JWT is rejected
 * TC18.5 — receiveMessage payload contains all required fields
 * TC18.6 — Message is persisted to DB when recipient is offline
 */
const { createServer } = require('http')
const { Server }       = require('socket.io')
const Client           = require('socket.io-client')
const request          = require('supertest')
const mongoose         = require('mongoose')
const Message          = require('../../models/Message')
const fs               = require('fs')
const path             = require('path')

let app, io, httpServer, port
let cookie1, cookie2, token1, token2, userId1, userId2

const extractToken = (arr = []) => {
  for (const c of arr) if (c.startsWith('jwt=')) return c.split(';')[0].replace('jwt=', '')
  return null
}

const connect = (token) => Client(`http://localhost:${port}`, {
  extraHeaders: { cookie: `jwt=${token}` },
  autoConnect: false
})

beforeAll(async () => {
  require('dotenv').config({ path: '.env.test' })
  const uri = fs.readFileSync(path.join(__dirname, '../../.tmp/mongo-uri.txt'), 'utf8').trim()
  await mongoose.connect(uri)
  app = require('../../index').app

  const r1 = await request(app).post('/api/auth/signup').send({ email: 'ws1@test.com', password: 'Password123!' })
  const r2 = await request(app).post('/api/auth/signup').send({ email: 'ws2@test.com', password: 'Password123!' })
  cookie1 = r1.headers['set-cookie']
  cookie2 = r2.headers['set-cookie']
  token1  = extractToken(cookie1)
  token2  = extractToken(cookie2)
  userId1 = r1.body.data.user.id
  userId2 = r2.body.data.user.id

  httpServer = createServer()
  io = new Server(httpServer, { cors: { origin: '*' } })
  require('../../socket')(io)
  await new Promise(resolve => httpServer.listen(0, () => { port = httpServer.address().port; resolve() }))
})

afterAll(async () => {
  io.close()
  httpServer.close()
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})

// ─── TC18.3 ──────────────────────────────────────────────────────────────────
describe('TC18.3 — Tampered JWT socket connection is rejected', () => {
  it('connection with tampered jwt payload is rejected with auth error', done => {
    const [header, , sig] = token1.split('.')
    const fakePayload     = Buffer.from(JSON.stringify({ id: 'fakeuser' })).toString('base64')
    const tampered        = [header, fakePayload, sig].join('.')

    const client = Client(`http://localhost:${port}`, {
      extraHeaders: { cookie: `jwt=${tampered}` },
      autoConnect: false
    })

    client.on('connect_error', err => {
      expect(err.message).toMatch(/auth|invalid|token/i)
      client.close()
      done()
    })
    client.on('connect', () => {
      client.close()
      done(new Error('Should have been rejected with tampered token'))
    })
    client.connect()
  })
})

// ─── TC18.5 ──────────────────────────────────────────────────────────────────
describe('TC18.5 — receiveMessage payload contains all required fields', () => {
  it('emitted message has _id, sender, recipient, content, messageType, timestamp', done => {
    const sender   = connect(token1)
    const receiver = connect(token2)
    let connected  = 0

    receiver.on('receiveMessage', msg => {
      try {
        expect(msg._id).toBeDefined()
        expect(msg.sender).toBeDefined()
        expect(msg.recipient).toBeDefined()
        expect(msg.content).toBe('field check')
        expect(msg.messageType).toBe('text')
        expect(msg.timestamp).toBeDefined()
        // sender is populated — should have firstName/lastName/email
        expect(msg.sender.email).toBeDefined()
        sender.close()
        receiver.close()
        done()
      } catch (e) {
        sender.close()
        receiver.close()
        done(e)
      }
    })

    const onConnect = () => {
      connected++
      if (connected === 2) {
        sender.emit('sendMessage', {
          sender: userId1, recipient: userId2, content: 'field check', messageType: 'text'
        })
      }
    }
    sender.on('connect', onConnect)
    receiver.on('connect', onConnect)
    sender.on('connect_error', err => { sender.close(); receiver.close(); done(err) })
    sender.connect()
    receiver.connect()
  }, 10000)
})

// ─── TC18.6 ──────────────────────────────────────────────────────────────────
describe('TC18.6 — Message persisted when recipient is offline', () => {
  it('message saved to DB even when recipient has no active socket connection', done => {
    // Only sender connects — recipient is NOT connected
    const sender = connect(token1)

    sender.on('connect', () => {
      sender.emit('sendMessage', {
        sender: userId1, recipient: userId2, content: 'offline msg', messageType: 'text'
      })
    })

    sender.on('receiveMessage', async (msg) => {
      sender.close()
      try {
        // Verify message exists in DB
        const saved = await Message.findById(msg._id)
        expect(saved).not.toBeNull()
        expect(saved.content).toBe('offline msg')

        // Verify recipient can fetch via REST
        const res = await request(app)
          .post('/api/messages/get-messages')
          .set('Cookie', cookie2)
          .send({ id: userId1 })
        expect(res.status).toBe(200)
        const found = res.body.messages.find(m => m._id.toString() === msg._id.toString())
        expect(found).toBeDefined()
        done()
      } catch (e) {
        done(e)
      }
    })

    sender.on('connect_error', err => { sender.close(); done(err) })
    sender.connect()
  }, 10000)
})
