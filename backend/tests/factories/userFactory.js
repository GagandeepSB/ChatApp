let counter = 0
const createUserData = (overrides = {}) => {
  counter++
  return { email: `user${counter}@test.com`, password: 'Password123!', ...overrides }
}
module.exports = { createUserData }
