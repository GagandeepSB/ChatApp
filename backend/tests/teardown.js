const path = require('path')
const fs = require('fs')

module.exports = async () => {
  if (global.__MONGOD__) await global.__MONGOD__.stop()
  const uriFile = path.join(__dirname, '../.tmp/mongo-uri.txt')
  if (fs.existsSync(uriFile)) fs.unlinkSync(uriFile)
}
