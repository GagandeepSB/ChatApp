const mongoose = require('mongoose')
const fs = require('fs'), path = require('path')

beforeAll(async () => {
  require('dotenv').config({ path: '.env.test' })
  const uri = fs.readFileSync(path.join(__dirname, '../../../.tmp/mongo-uri.txt'), 'utf8').trim()
  await mongoose.connect(uri)
})
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect() })
afterEach(async () => { await mongoose.connection.collections['users']?.deleteMany({}) })

describe('User Model', () => {
  let User
  beforeAll(() => { User = require('../../../models/User') })

  it('creates a valid user with email and password', async () => {
    const u = await User.create({ email: 'a@test.com', password: 'hashed' })
    expect(u._id).toBeDefined()
    expect(u.profileSetup).toBe(false)
  })
  it('requires email', async () => {
    await expect(User.create({ password: 'x' })).rejects.toThrow()
  })
  it('requires password', async () => {
    await expect(User.create({ email: 'b@test.com' })).rejects.toThrow()
  })
  it('enforces unique email', async () => {
    await User.create({ email: 'dup@test.com', password: 'x' })
    await expect(User.create({ email: 'dup@test.com', password: 'y' })).rejects.toThrow()
  })
  it('lowercases email', async () => {
    const u = await User.create({ email: 'Upper@Test.COM', password: 'x' })
    expect(u.email).toBe('upper@test.com')
  })
  it('defaults firstName, lastName, image, color to empty string', async () => {
    const u = await User.create({ email: 'c@test.com', password: 'x' })
    expect(u.firstName).toBe('')
    expect(u.lastName).toBe('')
    expect(u.image).toBe('')
    expect(u.color).toBe('')
  })
  it('does not have username or contacts fields', async () => {
    const u = await User.create({ email: 'd@test.com', password: 'x' })
    expect(u.username).toBeUndefined()
    expect(u.contacts).toBeUndefined()
  })
})
