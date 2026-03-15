const router = require('express').Router()
const auth = require('../middleware/auth')
const { createChannel, getUserChannels, getChannelMessages, deleteChannel } = require('../controllers/channelController')

router.use(auth)
router.post('/create-channel', createChannel)
router.get('/get-user-channels', getUserChannels)
router.get('/get-channel-messages/:channelId', getChannelMessages)
router.delete('/delete-channel/:channelId', deleteChannel)

module.exports = router
