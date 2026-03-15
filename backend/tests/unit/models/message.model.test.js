const mongoose = require('mongoose')
const fs = require('fs'), path = require('path')
const senderId = new mongoose.Types.ObjectId()
const recipientId = new mongoose.Types.ObjectId()

beforeAll(async () => {
  require('dotenv').config({ path: '.env.test' })
  const uri = fs.readFileSync(path.join(__dirname, '../../../.tmp/mongo-uri.txt'), 'utf8').trim()
  await mongoose.connect(uri)
})
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect() })
afterEach(async () => { await mongoose.connection.collections['messages']?.deleteMany({}) })

describe('Message Model', () => {
  let Message
  beforeAll(() => { Message = require('../../../models/Message') })

  it('creates a valid text message', async () => {
    const m = await Message.create({ sender: senderId, recipient: recipientId, content: 'hello', messageType: 'text' })
    expect(m._id).toBeDefined()
    expect(m.messageType).toBe('text')
  })
  it('requires sender', async () => {
    await expect(Message.create({ recipient: recipientId, content: 'hi' })).rejects.toThrow()
  })
  it('requires recipient', async () => {
    await expect(Message.create({ sender: senderId, content: 'hi' })).rejects.toThrow()
  })
  it('rejects invalid messageType', async () => {
    await expect(Message.create({ sender: senderId, recipient: recipientId, messageType: 'video' })).rejects.toThrow()
  })
  it('has compound index on sender+recipient+timestamp', async () => {
    const indexes = await Message.collection.getIndexes()
    const has = Object.values(indexes).some(i => Array.isArray(i) && i.some(([k]) => k === 'sender') && i.some(([k]) => k === 'recipient'))
    expect(has).toBe(true)
  })
})
