const { MongoMemoryServer } = require('mongodb-memory-server')
const path = require('path')
const fs = require('fs')

module.exports = async () => {
  const mongod = await MongoMemoryServer.create()
  const uri = mongod.getUri()
  global.__MONGOD__ = mongod
  // Write URI to a temp file so test files can read it
  const tmpDir = path.join(__dirname, '../.tmp')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)
  fs.writeFileSync(path.join(tmpDir, 'mongo-uri.txt'), uri)
}
