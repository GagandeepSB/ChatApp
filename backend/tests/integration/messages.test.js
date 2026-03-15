const request = require('supertest')
const mongoose = require('mongoose')
const fs = require('fs'), path = require('path')

let app, cookie1, userId1, cookie2, userId2

beforeAll(async () => {
  require('dotenv').config({ path: '.env.test' })
  const uri = fs.readFileSync(path.join(__dirname, '../../.tmp/mongo-uri.txt'), 'utf8').trim()
  await mongoose.connect(uri)
  app = require('../../index').app
})
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect() })
afterEach(async () => {
  for (const key in mongoose.connection.collections) await mongoose.connection.collections[key].deleteMany({})
})

async function makeUser(email) {
  const res = await request(app).post('/api/auth/signup').send({ email, password: 'Password123!' })
  return { cookie: res.headers['set-cookie'], userId: res.body.data.user.id }
}

describe('POST /api/messages/get-messages', () => {
  beforeEach(async () => {
    const r1 = await makeUser('a@test.com'); cookie1 = r1.cookie; userId1 = r1.userId
    const r2 = await makeUser('b@test.com'); cookie2 = r2.cookie; userId2 = r2.userId
  })

  it('401 — no auth', async () => {
    expect((await request(app).post('/api/messages/get-messages').send({ id: userId2 })).status).toBe(401)
  })
  it('400 — missing id', async () => {
    const res = await request(app).post('/api/messages/get-messages').set('Cookie', cookie1).send({})
    expect(res.status).toBe(400)
  })
  it('200 — empty array initially', async () => {
    const res = await request(app).post('/api/messages/get-messages').set('Cookie', cookie1).send({ id: userId2 })
    expect(res.status).toBe(200)
    expect(res.body.data.messages).toEqual([])
  })
  it('200 — returns messages between two users', async () => {
    const Message = require('../../models/Message')
    await Message.create({ sender: userId1, recipient: userId2, content: 'hello', messageType: 'text' })
    await Message.create({ sender: userId2, recipient: userId1, content: 'hi back', messageType: 'text' })
    const res = await request(app).post('/api/messages/get-messages').set('Cookie', cookie1).send({ id: userId2 })
    expect(res.status).toBe(200)
    expect(res.body.data.messages.length).toBe(2)
    // Sender is populated
    expect(res.body.data.messages[0].sender.email).toBe('a@test.com')
  })
})
