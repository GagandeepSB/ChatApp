const mongoose = require('mongoose')
const fs = require('fs'), path = require('path')

beforeAll(async () => {
  require('dotenv').config({ path: '.env.test' })
  const uri = fs.readFileSync(path.join(__dirname, '../../../.tmp/mongo-uri.txt'), 'utf8').trim()
  await mongoose.connect(uri)
})
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect() })

describe('Channel Model', () => {
  let Channel
  beforeAll(() => { Channel = require('../../../models/Channel') })

  it('creates a valid channel', async () => {
    const c = await Channel.create({ name: 'General' })
    expect(c._id).toBeDefined()
  })
  it('requires name', async () => {
    await expect(Channel.create({})).rejects.toThrow()
  })
  it('members defaults to empty array', async () => {
    const c = await Channel.create({ name: 'Test' })
    expect(c.members).toEqual([])
  })
})
