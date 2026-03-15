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
    const r1 = await makeUser('alice@test.com'); cookie1 = r1.cookie; userId1 = r1.userId
    const r2 = await makeUser('bob@test.com'); cookie2 = r2.cookie; userId2 = r2.userId
  })

  it('401 — no auth', async () => {
    const res = await request(app).post('/api/channel/create-channel').send({ name: 'test' })
    expect(res.status).toBe(401)
  })

  it('201 — creates channel with admin = current user', async () => {
    const res = await request(app).post('/api/channel/create-channel')
      .set('Cookie', cookie1)
      .send({ name: 'general', members: [userId2] })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.channel.name).toBe('general')
    const memberIds = res.body.data.channel.members.map(m => m._id || m.id || m)
    expect(memberIds).toContain(userId1)
    expect(memberIds).toContain(userId2)
  })

  it('400 — missing name', async () => {
    const res = await request(app).post('/api/channel/create-channel')
      .set('Cookie', cookie1).send({ members: [] })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/channel/get-user-channels', () => {
  beforeEach(async () => {
    const r1 = await makeUser('alice@test.com'); cookie1 = r1.cookie; userId1 = r1.userId
  })

  it('401 — no auth', async () => {
    expect((await request(app).get('/api/channel/get-user-channels')).status).toBe(401)
  })

  it('200 — returns channels for user', async () => {
    await request(app).post('/api/channel/create-channel')
      .set('Cookie', cookie1).send({ name: 'my-channel', members: [] })
    const res = await request(app).get('/api/channel/get-user-channels').set('Cookie', cookie1)
    expect(res.status).toBe(200)
    expect(res.body.data.channels.length).toBe(1)
    expect(res.body.data.channels[0].name).toBe('my-channel')
  })
})

describe('GET /api/channel/get-channel-messages/:channelId', () => {
  beforeEach(async () => {
    const r1 = await makeUser('alice@test.com'); cookie1 = r1.cookie; userId1 = r1.userId
  })

  it('401 — no auth', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    expect((await request(app).get(`/api/channel/get-channel-messages/${fakeId}`)).status).toBe(401)
  })

  it('200 — returns messages sorted by timestamp', async () => {
    const createRes = await request(app).post('/api/channel/create-channel')
      .set('Cookie', cookie1).send({ name: 'msg-test', members: [] })
    const channelId = createRes.body.data.channel._id

    const ChannelMessage = require('../../models/ChannelMessage')
    await ChannelMessage.create({ channelId, sender: userId1, content: 'First', messageType: 'text' })
    await ChannelMessage.create({ channelId, sender: userId1, content: 'Second', messageType: 'text' })

    const res = await request(app).get(`/api/channel/get-channel-messages/${channelId}`).set('Cookie', cookie1)
    expect(res.status).toBe(200)
    expect(res.body.data.messages.length).toBe(2)
  })
})

describe('DELETE /api/channel/delete-channel/:channelId', () => {
  beforeEach(async () => {
    const r1 = await makeUser('alice@test.com'); cookie1 = r1.cookie; userId1 = r1.userId
  })

  it('401 — no auth', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    expect((await request(app).delete(`/api/channel/delete-channel/${fakeId}`)).status).toBe(401)
  })

  it('200 — deletes channel', async () => {
    const createRes = await request(app).post('/api/channel/create-channel')
      .set('Cookie', cookie1).send({ name: 'del-test', members: [] })
    const channelId = createRes.body.data.channel._id
    const res = await request(app).delete(`/api/channel/delete-channel/${channelId}`).set('Cookie', cookie1)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const Channel = require('../../models/Channel')
    expect(await Channel.findById(channelId)).toBeNull()
  })
})
