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

describe('POST /api/contacts/search', () => {
  beforeEach(async () => {
    const r1 = await makeUser('alice@test.com')
    cookie1 = r1.cookie; userId1 = r1.userId
    const r2 = await makeUser('bob@test.com')
    cookie2 = r2.cookie; userId2 = r2.userId
    // Set bob's name so search can find him
    await request(app).post('/api/auth/update-profile').set('Cookie', cookie2).send({ firstName: 'Bob', lastName: 'Jones' })
  })

  it('401 — no auth', async () => {
    expect((await request(app).post('/api/contacts/search').send({ searchTerm: 'bob' })).status).toBe(401)
  })
  it('400 — missing searchTerm', async () => {
    expect((await request(app).post('/api/contacts/search').set('Cookie', cookie1).send({})).status).toBe(400)
  })
  it('200 — returns matching users excluding self', async () => {
    const res = await request(app).post('/api/contacts/search').set('Cookie', cookie1).send({ searchTerm: 'bob' })
    expect(res.status).toBe(200)
    expect(res.body.data.contacts.length).toBeGreaterThan(0)
    expect(res.body.data.contacts[0].firstName).toBe('Bob')
  })
  it('does not return the requesting user in results', async () => {
    const res = await request(app).post('/api/contacts/search').set('Cookie', cookie1).send({ searchTerm: 'alice' })
    expect(res.body.data.contacts.find(c => c.email === 'alice@test.com')).toBeUndefined()
  })
})

describe('GET /api/contacts/all-contacts', () => {
  beforeEach(async () => {
    const r1 = await makeUser('user1@test.com'); cookie1 = r1.cookie
    await makeUser('user2@test.com')
  })

  it('200 — returns all users except self as label/value pairs', async () => {
    const res = await request(app).get('/api/contacts/all-contacts').set('Cookie', cookie1)
    expect(res.status).toBe(200)
    expect(res.body.data.contacts.length).toBe(1)
    expect(res.body.data.contacts[0].label).toBeDefined()
    expect(res.body.data.contacts[0].value).toBeDefined()
  })
})

describe('GET /api/contacts/get-contacts-for-list', () => {
  beforeEach(async () => {
    const r1 = await makeUser('alice@test.com'); cookie1 = r1.cookie; userId1 = r1.userId
    const r2 = await makeUser('bob@test.com'); cookie2 = r2.cookie; userId2 = r2.userId
  })

  it('200 — empty list when no messages', async () => {
    const res = await request(app).get('/api/contacts/get-contacts-for-list').set('Cookie', cookie1)
    expect(res.status).toBe(200)
    expect(res.body.data.contacts).toEqual([])
  })
  it('200 — returns contact with lastMessageTime after DM sent via socket', async () => {
    // Insert a message directly to DB to simulate a DM
    const Message = require('../../models/Message')
    await Message.create({ sender: userId1, recipient: userId2, content: 'hello', messageType: 'text' })
    const res = await request(app).get('/api/contacts/get-contacts-for-list').set('Cookie', cookie1)
    expect(res.status).toBe(200)
    expect(res.body.data.contacts.length).toBe(1)
    expect(res.body.data.contacts[0].lastMessageTime).toBeDefined()
  })
})

describe('DELETE /api/contacts/delete-dm/:dmId', () => {
  beforeEach(async () => {
    const r1 = await makeUser('alice@test.com'); cookie1 = r1.cookie; userId1 = r1.userId
    const r2 = await makeUser('bob@test.com'); userId2 = r2.userId
  })

  it('200 — deletes all DM messages between two users', async () => {
    const Message = require('../../models/Message')
    await Message.create({ sender: userId1, recipient: userId2, content: 'hi', messageType: 'text' })
    const res = await request(app).delete(`/api/contacts/delete-dm/${userId2}`).set('Cookie', cookie1)
    expect(res.status).toBe(200)
    expect(await Message.countDocuments()).toBe(0)
  })
})
