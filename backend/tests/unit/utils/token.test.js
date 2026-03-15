beforeAll(() => {
  require('dotenv').config({ path: '.env.test' })
})

describe('token utils', () => {
  let sign, verify
  beforeAll(() => {
    ;({ sign, verify } = require('../../../utils/token'))
  })

  it('sign returns a string', () => {
    expect(typeof sign({ id: '123' })).toBe('string')
  })

  it('verify returns the original payload', () => {
    const token = sign({ id: 'abc', email: 'alice@test.com' })
    const decoded = verify(token)
    expect(decoded.id).toBe('abc')
    expect(decoded.email).toBe('alice@test.com')
  })

  it('verify throws on tampered token', () => {
    const token = sign({ id: '123' })
    expect(() => verify(token + 'tamper')).toThrow()
  })

  it('verify throws on garbage string', () => {
    expect(() => verify('notavalidtoken')).toThrow()
  })

  it('verify throws on expired token', () => {
    const jwt = require('jsonwebtoken')
    const expired = jwt.sign({ id: '123' }, process.env.JWT_SECRET, { expiresIn: '-1s' })
    expect(() => verify(expired)).toThrow()
  })
})
