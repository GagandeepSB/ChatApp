const request = require('supertest')

const signup = async (app, overrides = {}) => {
  const data = { email: `user${Date.now()}@test.com`, password: 'Password123!', ...overrides }
  const res = await request(app).post('/api/auth/signup').send(data)
  return { res, cookie: res.headers['set-cookie'], user: res.body.data?.user || res.body.user }
}

module.exports = { signup }
