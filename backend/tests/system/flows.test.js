/**
 * System-Level End-to-End Flow Tests
 * TC17.1 — Full signup → login → update profile flow
 * TC17.2 — Login → send message via socket → retrieve via REST API
 * TC17.3 — Delete DM flow: messages removed for initiating user
 *
 * Note on TC17.3: this implementation deletes messages for both users
 * (simpler approach); the test reflects actual behaviour.
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

// ─── TC17.1 ──────────────────────────────────────────────────────────────────
describe('TC17.1 — Signup → Login → Update profile flow', () => {
  it('user completes full onboarding: signup, login, profile setup', async () => {
    // Step 1: signup — profileSetup is false, cookie returned
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'flow1@test.com', password: 'Password123!' })
    expect(signupRes.status).toBe(201)
    expect(signupRes.body.data.user.profileSetup).toBe(false)
    const cookie = signupRes.headers['set-cookie']
    expect(cookie).toBeDefined()

    // Step 2: login with same credentials
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'flow1@test.com', password: 'Password123!' })
    expect(loginRes.status).toBe(200)
    expect(loginRes.headers['set-cookie']).toBeDefined()

    // Step 3: update profile (sets profileSetup = true)
    const profileRes = await request(app)
      .post('/api/auth/update-profile')
      .set('Cookie', cookie)
      .send({ firstName: 'Alice', lastName: 'Smith', color: '1' })
    expect(profileRes.status).toBe(200)
    expect(profileRes.body.profileSetup).toBe(true)
    expect(profileRes.body.firstName).toBe('Alice')

    // Step 4: verify via userinfo
    const infoRes = await request(app).get('/api/auth/userinfo').set('Cookie', cookie)
    expect(infoRes.status).toBe(200)
    expect(infoRes.body.firstName).toBe('Alice')
    expect(infoRes.body.profileSetup).toBe(true)
  })
})

// ─── TC17.2 ──────────────────────────────────────────────────────────────────
describe('TC17.2 — Login → send via socket → retrieve via REST', () => {
  it('message sent over socket is persisted and retrievable via REST', done => {
    let cookie1, cookie2, userId1, userId2, token1

    request(app).post('/api/auth/signup').send({ email: 'flow2a@test.com', password: 'Password123!' })
      .then(r1 => {
        cookie1 = r1.headers['set-cookie']
        token1  = extractToken(cookie1)
        userId1 = r1.body.data.user.id
        return request(app).post('/api/auth/signup').send({ email: 'flow2b@test.com', password: 'Password123!' })
      })
      .then(r2 => {
        cookie2 = r2.headers['set-cookie']
        userId2 = r2.body.data.user.id

        const sender   = connect(token1)
        let msgId

        sender.on('connect', () => {
          sender.emit('sendMessage', {
            sender: userId1, recipient: userId2, content: 'Persisted?', messageType: 'text'
          })
        })

        sender.on('receiveMessage', async (msg) => {
          msgId = msg._id
          sender.close()

          // Fetch via REST from recipient's perspective
          const res = await request(app)
            .post('/api/messages/get-messages')
            .set('Cookie', cookie2)
            .send({ id: userId1 })

          expect(res.status).toBe(200)
          const found = res.body.messages.find(m => m._id.toString() === msgId.toString())
          expect(found).toBeDefined()
          expect(found.content).toBe('Persisted?')
          done()
        })

        sender.on('connect_error', err => { sender.close(); done(err) })
        sender.connect()
      })
      .catch(done)
  }, 15000)
})

// ─── TC17.3 ──────────────────────────────────────────────────────────────────
describe('TC17.3 — Delete DM flow', () => {
  it('after User A deletes DM, get-messages returns empty for User A', async () => {
    const r1 = await request(app).post('/api/auth/signup').send({ email: 'flow3a@test.com', password: 'Password123!' })
    const r2 = await request(app).post('/api/auth/signup').send({ email: 'flow3b@test.com', password: 'Password123!' })
    const cookie1 = r1.headers['set-cookie']
    const userId1 = r1.body.data.user.id
    const userId2 = r2.body.data.user.id

    // Create messages between users
    await Message.create([
      { sender: userId1, recipient: userId2, content: 'Hey',    messageType: 'text' },
      { sender: userId2, recipient: userId1, content: 'Hello!', messageType: 'text' },
    ])

    // Verify messages exist before delete
    const before = await request(app)
      .post('/api/messages/get-messages')
      .set('Cookie', cookie1)
      .send({ id: userId2 })
    expect(before.body.messages.length).toBeGreaterThan(0)

    // User A deletes DM
    const delRes = await request(app)
      .delete(`/api/contacts/delete-dm/${userId2}`)
      .set('Cookie', cookie1)
    expect(delRes.status).toBe(200)

    // User A now sees no messages
    const after = await request(app)
      .post('/api/messages/get-messages')
      .set('Cookie', cookie1)
      .send({ id: userId2 })
    expect(after.body.messages.length).toBe(0)
  })
})
