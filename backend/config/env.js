const required = ['PORT', 'DB_URI', 'JWT_SECRET']
module.exports = function validateEnv() {
  const missing = required.filter(k => !process.env[k])
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`)
    process.exit(1)
  }
}
