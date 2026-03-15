beforeAll(() => require('dotenv').config({ path: '.env.test' }))

describe('auth middleware (cookie-based)', () => {
  let authMiddleware, sign

  beforeAll(() => {
    authMiddleware = require('../../../middleware/auth')
    sign = require('../../../utils/token').sign
  })

  const mockRes = () => {
    const res = {}
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    return res
  }

  it('calls next() with no args when cookie contains valid jwt, and sets req.user', () => {
    const token = sign({ id: 'user123', email: 'a@test.com' })
    const req = { cookies: { jwt: token } }
    const next = jest.fn()
    authMiddleware(req, mockRes(), next)
    expect(next).toHaveBeenCalledWith()
    expect(req.user.id).toBe('user123')
  })

  it('throws ApiError 401 when jwt cookie is missing', () => {
    const req = { cookies: {} }
    expect(() => authMiddleware(req, mockRes(), jest.fn())).toThrow(expect.objectContaining({ statusCode: 401 }))
  })

  it('throws ApiError 401 when cookies is undefined', () => {
    const req = { cookies: undefined }
    expect(() => authMiddleware(req, mockRes(), jest.fn())).toThrow(expect.objectContaining({ statusCode: 401 }))
  })

  it('throws ApiError 401 when jwt token is tampered', () => {
    const token = sign({ id: '123' })
    const req = { cookies: { jwt: token + 'tampered' } }
    expect(() => authMiddleware(req, mockRes(), jest.fn())).toThrow(expect.objectContaining({ statusCode: 401 }))
  })
})
