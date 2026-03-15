const router = require('express').Router()
const auth = require('../middleware/auth')
const { profileImage } = require('../middleware/upload')
const { signup, login, logout, getUserInfo, updateProfile, addProfileImage, removeProfileImage } = require('../controllers/authController')

router.post('/signup', signup)
router.post('/login', login)
router.post('/logout', logout)
router.get('/userinfo', auth, getUserInfo)
router.post('/update-profile', auth, updateProfile)
router.post('/add-profile-image', auth, (req, res, next) => {
  profileImage.single('profile-image')(req, res, err => {
    if (err) return next(err)
    next()
  })
}, addProfileImage)
router.delete('/remove-profile-image', auth, removeProfileImage)

module.exports = router
