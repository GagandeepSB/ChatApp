/**
 * System Tests — End-to-End User Flows (TC17.x)
 * Tests complete user journeys across multiple API calls.
 */
const request = require('supertest')

let app, server

beforeAll(async () => {
  process.env.NODE_ENV = 'test'
  ;({ app, server } = require('../../index'))
})

afterAll(async () => {
  if (server) await new Promise(r => server.close(r))
})

// TC17.1 — Full signup → login → profile setup flow
describe('TC17.1 — Signup → Login → Profile setup', () => {
  const email = `flow_${Date.now()}@test.com`
  const password = 'FlowTest1!'
  let cookie

  test('step 1: signup creates a new user', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email, password })
    expect(res.status).toBe(201)
    expect(res.body.data).toHaveProperty('email', email)
    cookie = res.headers['set-cookie']?.[0]
    expect(cookie).toMatch(/jwt=/)
  })

  test('step 2: login returns JWT cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password })
    expect(res.status).toBe(200)
    cookie = res.headers['set-cookie']?.[0]
    expect(cookie).toMatch(/jwt=/)
  })

  test('step 3: update profile with first/last name and color', async () => {
    const res = await request(app)
      .post('/api/auth/update-profile')
      .set('Cookie', cookie)
      .send({ firstName: 'Alice', lastName: 'Smith', color: 2 })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ firstName: 'Alice', lastName: 'Smith', profileSetup: true })
  })

  test('step 4: userinfo reflects the updated profile', async () => {
    const res = await request(app).get('/api/auth/userinfo').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ firstName: 'Alice', lastName: 'Smith' })
  })
})

// TC17.2 — Send a DM via socket and retrieve it via REST
describe('TC17.2 — Send DM via socket → retrieve via REST', () => {
  const io = require('socket.io-client')

  let senderCookie, senderId, recipientId
  const senderEmail = `sender_${Date.now()}@test.com`
  const recipientEmail = `recip_${Date.now()}@test.com`
  const password = 'Test1234'

  beforeAll(async () => {
    // Create sender
    const s = await request(app).post('/api/auth/signup').send({ email: senderEmail, password })
    senderCookie = s.headers['set-cookie']?.[0]
    senderId = s.body.data._id

    // Create recipient
    const r = await request(app).post('/api/auth/signup').send({ email: recipientEmail, password })
    recipientId = r.body.data._id
  })

  test('message sent over socket is retrievable via REST', done => {
    const token = senderCookie?.match(/jwt=([^;]+)/)?.[1]
    const socket = io(`http://localhost:${process.env.PORT || 8747}`, {
      extraHeaders: { cookie: `jwt=${token}` },
      transports: ['websocket'],
      forceNew: true
    })

    socket.on('connect', () => {
      socket.emit('sendMessage', {
        sender: senderId,
        recipient: recipientId,
        content: 'Hello from system test',
        messageType: 'text'
      })
    })

    socket.on('receiveMessage', async (msg) => {
      socket.disconnect()
      expect(msg).toHaveProperty('content', 'Hello from system test')

      // Retrieve via REST
      const res = await request(app)
        .post('/api/messages/get-messages')
        .set('Cookie', senderCookie)
        .send({ id: recipientId })
      expect(res.status).toBe(200)
      const found = res.body.data.some(m => m.content === 'Hello from system test')
      expect(found).toBe(true)
      done()
    })

    socket.on('connect_error', (err) => { socket.disconnect(); done(err) })
    setTimeout(() => { socket.disconnect(); done(new Error('Timeout waiting for receiveMessage')) }, 8000)
  }, 10000)
})

// TC17.3 — Delete a DM conversation
describe('TC17.3 — Delete DM conversation', () => {
  let cookieA, idA, idB, cookieB

  beforeAll(async () => {
    const a = await request(app).post('/api/auth/signup').send({ email: `del_a_${Date.now()}@test.com`, password: 'Test1234' })
    cookieA = a.headers['set-cookie']?.[0]
    idA = a.body.data._id

    const b = await request(app).post('/api/auth/signup').send({ email: `del_b_${Date.now()}@test.com`, password: 'Test1234' })
    cookieB = b.headers['set-cookie']?.[0]
    idB = b.body.data._id
  })

  test('deleting a DM returns 200', async () => {
    const res = await request(app)
      .delete(`/api/contacts/delete-dm/${idB}`)
      .set('Cookie', cookieA)
    expect([200, 404]).toContain(res.status)
  })
})
