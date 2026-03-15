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

describe('POST /api/channel/create-channel', () => {
  beforeEach(async () => {
    const r1 = await makeUser('admin@test.com'); cookie1 = r1.cookie; userId1 = r1.userId
    const r2 = await makeUser('member@test.com'); userId2 = r2.userId
  })

  it('401 — no auth', async () => {
    expect((await request(app).post('/api/channel/create-channel').send({ name: 'Test', members: [] })).status).toBe(401)
  })
  it('201 — creates channel with admin as member', async () => {
    const res = await request(app).post('/api/channel/create-channel').set('Cookie', cookie1)
      .send({ name: 'General', members: [userId2] })
    expect(res.status).toBe(201)
    expect(res.body.data.channel.name).toBe('General')
    expect(res.body.data.channel.members.some(m => (m._id || m).toString() === userId1)).toBe(true)
  })
  it('400 — missing name', async () => {
    const res = await request(app).post('/api/channel/create-channel').set('Cookie', cookie1).send({ members: [] })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/channel/get-user-channels', () => {
  beforeEach(async () => {
    const r1 = await makeUser('admin@test.com'); cookie1 = r1.cookie; userId1 = r1.userId
  })

  it('200 — empty initially', async () => {
    const res = await request(app).get('/api/channel/get-user-channels').set('Cookie', cookie1)
    expect(res.status).toBe(200)
    expect(res.body.data.channels).toEqual([])
  })
  it('200 — lists channels the user is a member of', async () => {
    await request(app).post('/api/channel/create-channel').set('Cookie', cookie1).send({ name: 'Dev', members: [] })
    const res = await request(app).get('/api/channel/get-user-channels').set('Cookie', cookie1)
    expect(res.body.data.channels.length).toBe(1)
    expect(res.body.data.channels[0].name).toBe('Dev')
  })
})

describe('GET /api/channel/get-channel-messages/:channelId', () => {
  let channelId

  beforeEach(async () => {
    const r1 = await makeUser('admin@test.com'); cookie1 = r1.cookie; userId1 = r1.userId
    const res = await request(app).post('/api/channel/create-channel').set('Cookie', cookie1).send({ name: 'Test', members: [] })
    channelId = res.body.data.channel._id
  })

  it('200 — empty initially', async () => {
    const res = await request(app).get(`/api/channel/get-channel-messages/${channelId}`).set('Cookie', cookie1)
    expect(res.status).toBe(200)
    expect(res.body.data.messages).toEqual([])
  })
  it('200 — returns messages with populated sender', async () => {
    const ChannelMessage = require('../../models/ChannelMessage')
    await ChannelMessage.create({ channelId, sender: userId1, content: 'Hello channel', messageType: 'text' })
    const res = await request(app).get(`/api/channel/get-channel-messages/${channelId}`).set('Cookie', cookie1)
    expect(res.body.data.messages.length).toBe(1)
    expect(res.body.data.messages[0].sender.email).toBe('admin@test.com')
  })
})

describe('DELETE /api/channel/delete-channel/:channelId', () => {
  let channelId
  beforeEach(async () => {
    const r1 = await makeUser('admin@test.com'); cookie1 = r1.cookie; userId1 = r1.userId
    const res = await request(app).post('/api/channel/create-channel').set('Cookie', cookie1).send({ name: 'ToDelete', members: [] })
    channelId = res.body.data.channel._id
  })

  it('200 — deletes channel and its messages', async () => {
    const ChannelMessage = require('../../models/ChannelMessage')
    await ChannelMessage.create({ channelId, sender: userId1, content: 'bye', messageType: 'text' })
    const res = await request(app).delete(`/api/channel/delete-channel/${channelId}`).set('Cookie', cookie1)
    expect(res.status).toBe(200)
    expect(await ChannelMessage.countDocuments({ channelId })).toBe(0)
  })
})
