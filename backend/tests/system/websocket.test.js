/**
 * System Tests — WebSocket / Real-Time (TC18.x)
 * Tests socket authentication, message payload structure, and offline persistence.
 */
const request = require('supertest')
const { io: ioc } = require('socket.io-client')
const jwt = require('jsonwebtoken')

let app, server, PORT

beforeAll(async () => {
  process.env.NODE_ENV = 'test'
  ;({ app, server } = require('../../index'))
  PORT = process.env.PORT || 8747
})

afterAll(async () => {
  if (server) await new Promise(r => server.close(r))
})

// TC18.3 — Socket connection with tampered JWT is rejected
describe('TC18.3 — Socket auth: tampered JWT is rejected', () => {
  test('socket with tampered token does not connect successfully', done => {
    const valid = jwt.sign({ id: '000000000000000000000001' }, process.env.JWT_SECRET)
    const tampered = valid.slice(0, -4) + 'XXXX'

    const socket = ioc(`http://localhost:${PORT}`, {
      extraHeaders: { cookie: `jwt=${tampered}` },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false
    })

    socket.on('connect_error', () => {
      socket.disconnect()
      done() // expected — bad token rejected
    })

    socket.on('connect', () => {
      socket.disconnect()
      done(new Error('Should not have connected with tampered JWT'))
    })

    setTimeout(() => { socket.disconnect(); done() }, 3000)
  }, 5000)
})

// TC18.5 — receiveMessage payload contains required fields
describe('TC18.5 — receiveMessage event contains required fields', () => {
  let senderCookie, senderId, recipientId

  beforeAll(async () => {
    const s = await request(app).post('/api/auth/signup').send({
      email: `ws_sender_${Date.now()}@test.com`, password: 'Test1234'
    })
    senderCookie = s.headers['set-cookie']?.[0]
    senderId = s.body.data._id

    const r = await request(app).post('/api/auth/signup').send({
      email: `ws_recip_${Date.now()}@test.com`, password: 'Test1234'
    })
    recipientId = r.body.data._id
  })

  test('receiveMessage includes sender, recipient, content, messageType, timestamp', done => {
    const token = senderCookie?.match(/jwt=([^;]+)/)?.[1]
    const socket = ioc(`http://localhost:${PORT}`, {
      extraHeaders: { cookie: `jwt=${token}` },
      transports: ['websocket'],
      forceNew: true
    })

    socket.on('connect', () => {
      socket.emit('sendMessage', {
        sender: senderId,
        recipient: recipientId,
        content: 'Payload check',
        messageType: 'text'
      })
    })

    socket.on('receiveMessage', (msg) => {
      socket.disconnect()
      expect(msg).toHaveProperty('sender')
      expect(msg).toHaveProperty('recipient')
      expect(msg).toHaveProperty('content', 'Payload check')
      expect(msg).toHaveProperty('messageType', 'text')
      expect(msg).toHaveProperty('timestamp')
      done()
    })

    socket.on('connect_error', err => { socket.disconnect(); done(err) })
    setTimeout(() => { socket.disconnect(); done(new Error('Timeout')) }, 8000)
  }, 10000)
})

// TC18.6 — Messages sent to offline users are persisted in DB
describe('TC18.6 — Messages to offline users are persisted', () => {
  let senderCookie, senderId, recipientId

  beforeAll(async () => {
    const s = await request(app).post('/api/auth/signup').send({
      email: `offline_s_${Date.now()}@test.com`, password: 'Test1234'
    })
    senderCookie = s.headers['set-cookie']?.[0]
    senderId = s.body.data._id

    const r = await request(app).post('/api/auth/signup').send({
      email: `offline_r_${Date.now()}@test.com`, password: 'Test1234'
    })
    recipientId = r.body.data._id
    // Recipient never connects — remains "offline"
  })

  test('message to offline user is retrievable via REST', done => {
    const token = senderCookie?.match(/jwt=([^;]+)/)?.[1]
    const socket = ioc(`http://localhost:${PORT}`, {
      extraHeaders: { cookie: `jwt=${token}` },
      transports: ['websocket'],
      forceNew: true
    })

    socket.on('connect', () => {
      socket.emit('sendMessage', {
        sender: senderId,
        recipient: recipientId,
        content: 'Offline persistence test',
        messageType: 'text'
      })

      setTimeout(async () => {
        socket.disconnect()
        const res = await request(app)
          .post('/api/messages/get-messages')
          .set('Cookie', senderCookie)
          .send({ id: recipientId })
        expect(res.status).toBe(200)
        const found = res.body.data.some(m => m.content === 'Offline persistence test')
        expect(found).toBe(true)
        done()
      }, 1000)
    })

    socket.on('connect_error', err => { socket.disconnect(); done(err) })
    setTimeout(() => { socket.disconnect(); done(new Error('Timeout')) }, 8000)
  }, 10000)
})
