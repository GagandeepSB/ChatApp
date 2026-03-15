const request = require('supertest')
const mongoose = require('mongoose')
const fs = require('fs'), path = require('path')

let app
beforeAll(async () => {
  require('dotenv').config({ path: '.env.test' })
  const uri = fs.readFileSync(path.join(__dirname, '../../.tmp/mongo-uri.txt'), 'utf8').trim()
  await mongoose.connect(uri)
  app = require('../../index').app
})
afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})
afterEach(async () => {
  for (const key in mongoose.connection.collections) {
    await mongoose.connection.collections[key].deleteMany({})
  }
})

const validUser = { email: 'alice@test.com', password: 'Password123!' }

describe('POST /api/auth/signup', () => {
  it('201 — creates user, returns user object, sets jwt cookie', async () => {
    const res = await request(app).post('/api/auth/signup').send(validUser)
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user.email).toBe('alice@test.com')
    expect(res.body.data.user.profileSetup).toBe(false)
    expect(res.body.data.user.password).toBeUndefined()
    expect(res.headers['set-cookie']).toBeDefined()
    expect(res.headers['set-cookie'].join('')).toMatch(/jwt=/)
  })
  it('stores bcrypt hash, not plaintext', async () => {
    await request(app).post('/api/auth/signup').send(validUser)
    const User = require('../../models/User')
    const u = await User.findOne({ email: 'alice@test.com' })
    expect(u.password).not.toBe('Password123!')
    expect(u.password.startsWith('$2')).toBe(true)
  })
  it('400 — missing email', async () => {
    const res = await request(app).post('/api/auth/signup').send({ password: 'x' })
    expect(res.status).toBe(400)
  })
  it('400 — missing password', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email: 'x@test.com' })
    expect(res.status).toBe(400)
  })
  it('409 — duplicate email', async () => {
    await request(app).post('/api/auth/signup').send(validUser)
    const res = await request(app).post('/api/auth/signup').send(validUser)
    expect(res.status).toBe(409)
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(async () => { await request(app).post('/api/auth/signup').send(validUser) })

  it('200 — returns user and sets cookie', async () => {
    const res = await request(app).post('/api/auth/login').send(validUser)
    expect(res.status).toBe(200)
    expect(res.body.data.user.email).toBe('alice@test.com')
    expect(res.headers['set-cookie'].join('')).toMatch(/jwt=/)
  })
  it('400 — wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'alice@test.com', password: 'wrong' })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('INVALID_CREDENTIALS')
  })
  it('404 — email not found', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'Password123!' })
    expect(res.status).toBe(404)
  })
  it('400 — missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'alice@test.com' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/logout', () => {
  it('200 — clears cookie', async () => {
    const res = await request(app).post('/api/auth/logout')
    expect(res.status).toBe(200)
    expect(res.headers['set-cookie'].join('')).toMatch(/jwt=;|jwt=\s*;/)
  })
})

describe('GET /api/auth/userinfo', () => {
  it('401 — no cookie', async () => {
    const res = await request(app).get('/api/auth/userinfo')
    expect(res.status).toBe(401)
  })
  it('200 — returns flat user object', async () => {
    const signup = await request(app).post('/api/auth/signup').send(validUser)
    const cookie = signup.headers['set-cookie']
    const res = await request(app).get('/api/auth/userinfo').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe('alice@test.com')
    // Flat — not nested under 'user'
    expect(res.body.data.id).toBeDefined()
    expect(res.body.data.profileSetup).toBe(false)
  })
})

describe('POST /api/auth/update-profile', () => {
  it('200 — updates profile, sets profileSetup true', async () => {
    const signup = await request(app).post('/api/auth/signup').send(validUser)
    const cookie = signup.headers['set-cookie']
    const res = await request(app)
      .post('/api/auth/update-profile')
      .set('Cookie', cookie)
      .send({ firstName: 'Alice', lastName: 'Smith', color: '#ff0000' })
    expect(res.status).toBe(200)
    expect(res.body.data.firstName).toBe('Alice')
    expect(res.body.data.profileSetup).toBe(true)
  })
  it('401 — no cookie', async () => {
    const res = await request(app).post('/api/auth/update-profile').send({ firstName: 'A', lastName: 'B' })
    expect(res.status).toBe(401)
  })
  it('400 — missing firstName or lastName', async () => {
    const signup = await request(app).post('/api/auth/signup').send(validUser)
    const cookie = signup.headers['set-cookie']
    const res = await request(app).post('/api/auth/update-profile').set('Cookie', cookie).send({ firstName: 'Alice' })
    expect(res.status).toBe(400)
  })
})
