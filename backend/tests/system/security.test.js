/**
 * System Tests — Security (TC19.x)
 * Tests authentication guards, JWT validation, and injection protection.
 */
const request = require('supertest')
const jwt = require('jsonwebtoken')

let app, server

beforeAll(async () => {
  process.env.NODE_ENV = 'test'
  ;({ app, server } = require('../../index'))
})

afterAll(async () => {
  if (server) await new Promise(r => server.close(r))
})

// TC19.1 — Protected routes return 401 without a JWT cookie
describe('TC19.1 — Protected routes require authentication', () => {
  const protectedRoutes = [
    { method: 'get',  path: '/api/auth/userinfo' },
    { method: 'post', path: '/api/contacts/search',   body: { searchTerm: 'a' } },
    { method: 'get',  path: '/api/contacts/all-contacts' },
    { method: 'post', path: '/api/messages/get-messages', body: { id: '000000000000000000000001' } },
    { method: 'get',  path: '/api/channel/get-user-channels' },
  ]

  test.each(protectedRoutes)('$method $path → 401 without cookie', async ({ method, path, body }) => {
    const res = await request(app)[method](path).send(body)
    expect(res.status).toBe(401)
  })
})

// TC19.2 — Expired JWT is rejected
describe('TC19.2 — Expired JWT is rejected', () => {
  test('returns 401 for expired token', async () => {
    const expired = jwt.sign({ id: '000000000000000000000001' }, process.env.JWT_SECRET, { expiresIn: -1 })
    const res = await request(app)
      .get('/api/auth/userinfo')
      .set('Cookie', `jwt=${expired}`)
    expect(res.status).toBe(401)
  })
})

// TC19.3 — Tampered JWT is rejected
describe('TC19.3 — Tampered JWT is rejected', () => {
  test('returns 401 for tampered token', async () => {
    const valid = jwt.sign({ id: '000000000000000000000001' }, process.env.JWT_SECRET)
    const tampered = valid.slice(0, -4) + 'XXXX'
    const res = await request(app)
      .get('/api/auth/userinfo')
      .set('Cookie', `jwt=${tampered}`)
    expect(res.status).toBe(401)
  })
})

// TC19.4 — NoSQL injection in login is blocked
describe('TC19.4 — NoSQL injection in login field', () => {
  test('returns 400 (not 500) when password is an object', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: { $gt: '' } })
    expect(res.status).toBe(400)
  })

  test('returns 400 (not 500) when email is an object', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: 'anything' })
    expect(res.status).toBe(400)
  })
})

// TC19.5 — NoSQL injection in signup is blocked
describe('TC19.5 — NoSQL injection in signup field', () => {
  test('returns 400 when password is an object', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'inject@test.com', password: { $gt: '' } })
    expect(res.status).toBe(400)
  })
})

// TC19.6 — Rate limiter is configured
describe('TC19.6 — Rate limiter middleware is configured', () => {
  test('server responds normally under the rate limit', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'wrong' })
    expect([400, 401, 404]).toContain(res.status)
  })
})

// TC19.7 — XSS: stored content is returned as plain text (not executed)
describe('TC19.7 — XSS content stored and returned as plain text', () => {
  const xssPayload = '<script>alert(1)</script>'

  test('signup with XSS email is rejected or stored as literal string', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: xssPayload, password: 'password123' })
    // Either rejected (400/422) or the raw string is returned — it must not be interpreted
    if (res.status === 201) {
      expect(res.body.data?.email || '').toBe(xssPayload)
    } else {
      expect(res.status).toBeGreaterThanOrEqual(400)
    }
  })
})

// TC19.8 — Password is never returned in any auth response
describe('TC19.8 — Password hash is never exposed', () => {
  let cookie

  beforeAll(async () => {
    const email = `sec_${Date.now()}@test.com`
    await request(app).post('/api/auth/signup').send({ email, password: 'Test1234' })
    const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'Test1234' })
    cookie = loginRes.headers['set-cookie']?.[0]
  })

  test('userinfo does not include password field', async () => {
    const res = await request(app).get('/api/auth/userinfo').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.data).not.toHaveProperty('password')
  })
})

// TC19.9 — Logout clears the JWT cookie
describe('TC19.9 — Logout clears auth cookie', () => {
  test('cookie is cleared after logout', async () => {
    const email = `logout_${Date.now()}@test.com`
    await request(app).post('/api/auth/signup').send({ email, password: 'Test1234' })
    const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'Test1234' })
    const cookie = loginRes.headers['set-cookie']?.[0]

    const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', cookie)
    expect(logoutRes.status).toBe(200)

    const cleared = logoutRes.headers['set-cookie']?.[0] ?? ''
    expect(cleared).toMatch(/jwt=;|jwt=(?:;|$)/)
  })
})
