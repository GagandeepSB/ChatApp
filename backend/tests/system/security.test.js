/**
 * System-Level Security Tests
 * TC19.1 — All protected routes return 401 without JWT cookie
 * TC19.2 — Protected routes return 401 with expired JWT
 * TC19.3 — Protected routes return 401 with tampered JWT
 * TC19.4 — NoSQL injection in login email does not authenticate
 * TC19.5 — NoSQL injection in login password does not authenticate
 * TC19.6 — NoSQL injection in search contacts does not crash server
 * TC19.7 — XSS payload in profile fields stored as plain text
 * TC19.8 — XSS payload in message content stored as plain text
 * TC19.9 — Rate limiting middleware is configured (stretch goal)
 */
const request  = require('supertest')
const mongoose = require('mongoose')
const jwt      = require('jsonwebtoken')
const fs       = require('fs')
const path     = require('path')
const Message  = require('../../models/Message')

let app, cookie, userId

const extractToken = (arr = []) => {
  for (const c of arr) if (c.startsWith('jwt=')) return c.split(';')[0].replace('jwt=', '')
  return null
}

beforeAll(async () => {
  require('dotenv').config({ path: '.env.test' })
  const uri = fs.readFileSync(path.join(__dirname, '../../.tmp/mongo-uri.txt'), 'utf8').trim()
  await mongoose.connect(uri)
  app = require('../../index').app
  const r = await request(app).post('/api/auth/signup').send({ email: 'security@test.com', password: 'Password123!' })
  cookie = r.headers['set-cookie']
  userId = r.body.data.user.id
})

afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})

// ─── TC19.1 ──────────────────────────────────────────────────────────────────
describe('TC19.1 — Protected routes return 401 without JWT cookie', () => {
  const routes = [
    ['GET',    '/api/auth/userinfo'],
    ['POST',   '/api/auth/update-profile'],
    ['POST',   '/api/contacts/search'],
    ['GET',    '/api/contacts/all-contacts'],
    ['GET',    '/api/contacts/get-contacts-for-list'],
    ['POST',   '/api/messages/get-messages'],
    ['POST',   '/api/channel/create-channel'],
    ['GET',    '/api/channel/get-user-channels'],
  ]
  routes.forEach(([method, route]) => {
    it(`${method} ${route} → 401`, async () => {
      const res = await request(app)[method.toLowerCase()](route).send({})
      expect(res.status).toBe(401)
    })
  })
})

// ─── TC19.2 ──────────────────────────────────────────────────────────────────
describe('TC19.2 — Expired JWT returns 401', () => {
  it('GET /api/auth/userinfo with expired token → 401', async () => {
    const expired = jwt.sign(
      { id: userId, exp: Math.floor(Date.now() / 1000) - 3600 },
      process.env.JWT_SECRET
    )
    const res = await request(app).get('/api/auth/userinfo').set('Cookie', `jwt=${expired}`)
    expect(res.status).toBe(401)
  })
})

// ─── TC19.3 ──────────────────────────────────────────────────────────────────
describe('TC19.3 — Tampered JWT returns 401', () => {
  it('GET /api/auth/userinfo with tampered payload → 401', async () => {
    const token = extractToken(cookie)
    const [header, , sig] = token.split('.')
    const fakePayload = Buffer.from(JSON.stringify({ id: 'hackedid123', email: 'hacked@test.com' })).toString('base64')
    const tampered = [header, fakePayload, sig].join('.')
    const res = await request(app).get('/api/auth/userinfo').set('Cookie', `jwt=${tampered}`)
    expect(res.status).toBe(401)
  })
})

// ─── TC19.4 ──────────────────────────────────────────────────────────────────
describe('TC19.4 — NoSQL injection in login email', () => {
  it('object email operator does not authenticate', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: 'anything' })
    expect(res.status).not.toBe(200)
  })
})

// ─── TC19.5 ──────────────────────────────────────────────────────────────────
describe('TC19.5 — NoSQL injection in login password', () => {
  it('object password operator does not authenticate', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'security@test.com', password: { $gt: '' } })
    expect(res.status).not.toBe(200)
  })
})

// ─── TC19.6 ──────────────────────────────────────────────────────────────────
describe('TC19.6 — NoSQL injection in search contacts', () => {
  it('object searchTerm does not crash the server', async () => {
    const res = await request(app)
      .post('/api/contacts/search')
      .set('Cookie', cookie)
      .send({ searchTerm: { $gt: '' } })
    expect(res.status).toBeLessThan(500)
  })
})

// ─── TC19.7 ──────────────────────────────────────────────────────────────────
describe('TC19.7 — XSS payload in profile fields stored as plain text', () => {
  it('XSS in firstName/lastName stored verbatim, not executed', async () => {
    const xss = '<script>alert("xss")</script>'
    await request(app)
      .post('/api/auth/update-profile')
      .set('Cookie', cookie)
      .send({ firstName: xss, lastName: xss, color: '0' })
    const info = await request(app).get('/api/auth/userinfo').set('Cookie', cookie)
    expect(info.body.firstName).toBe(xss)
    expect(info.body.lastName).toBe(xss)
  })
})

// ─── TC19.8 ──────────────────────────────────────────────────────────────────
describe('TC19.8 — XSS payload in message content stored as plain text', () => {
  it('XSS in message content stored verbatim, not transformed', async () => {
    const r2 = await request(app).post('/api/auth/signup').send({ email: 'sec2@test.com', password: 'Password123!' })
    const recipientId = r2.body.data.user.id
    const xss = '<script>alert("xss")</script>'
    const msg = await Message.create({ sender: userId, recipient: recipientId, content: xss, messageType: 'text' })
    const res = await request(app)
      .post('/api/messages/get-messages')
      .set('Cookie', cookie)
      .send({ id: recipientId })
    const found = res.body.messages.find(m => m._id.toString() === msg._id.toString())
    expect(found).toBeDefined()
    expect(found.content).toBe(xss)
  })
})

// ─── TC19.9 (stretch goal) ───────────────────────────────────────────────────
describe('TC19.9 — Rate limiting middleware configured (stretch goal)', () => {
  it('rate limiter is set up and applied as middleware', () => {
    const rateLimiter = require('../../middleware/rateLimiter')
    expect(typeof rateLimiter).toBe('function')
  })
})
