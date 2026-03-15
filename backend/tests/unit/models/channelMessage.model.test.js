const mongoose = require('mongoose')
const fs = require('fs'), path = require('path')

beforeAll(async () => {
  require('dotenv').config({ path: '.env.test' })
  const uri = fs.readFileSync(path.join(__dirname, '../../../.tmp/mongo-uri.txt'), 'utf8').trim()
  await mongoose.connect(uri)
})
afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})
afterEach(async () => {
  await mongoose.connection.collections['channelmessages']?.deleteMany({})
})

describe('ChannelMessage Model', () => {
  let ChannelMessage
  const channelId = new mongoose.Types.ObjectId()
  const senderId = new mongoose.Types.ObjectId()

  beforeAll(() => { ChannelMessage = require('../../../models/ChannelMessage') })

  it('requires channelId', async () => {
    await expect(ChannelMessage.create({ sender: senderId, content: 'Hello' })).rejects.toThrow()
  })

  it('requires sender', async () => {
    await expect(ChannelMessage.create({ channelId, content: 'Hello' })).rejects.toThrow()
  })

  it('messageType defaults to text', async () => {
    const msg = await ChannelMessage.create({ channelId, sender: senderId, content: 'Hi' })
    expect(msg.messageType).toBe('text')
  })

  it('has compound index on channelId + timestamp', async () => {
    // Sync indexes to ensure they exist in this connection
    await ChannelMessage.syncIndexes()
    const indexes = await ChannelMessage.collection.getIndexes()
    const hasIndex = Object.values(indexes).some(idx => {
      const keys = Array.isArray(idx) ? idx.map(([k]) => k) : Object.keys(idx)
      return keys.includes('channelId') && keys.includes('timestamp')
    })
    expect(hasIndex).toBe(true)
  })
})
